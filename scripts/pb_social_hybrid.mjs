import * as cheerio from "cheerio";
import { chromium } from "playwright";

// =====================
// CONFIG
// =====================
const PB_BASE_URL = process.env.PB_BASE_URL || "http://127.0.0.1:8091";
const COLLECTION = "politicians";

const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || "";
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || "";

// Limits
const MAX_RECORDS = Number(process.env.MAX_RECORDS || 99999);
const MAX_SITE_PAGES = Number(process.env.MAX_SITE_PAGES || 15);
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS || 15000);

const BLOCK_TLD = new Set(["gov"]);
const USER_AGENT = "Mozilla/5.0 (compatible; SocialPoliticianBot/1.0; +https://socialpolitician.com)";

const PATH_GUESSES = [
  "/", "/contact", "/contact-us", "/about", "/connect", "/social", "/media", "/press", "/news"
];

const SOCIAL_RULES = [
  { field: "facebook_url", hosts: ["facebook.com", "www.facebook.com", "fb.com", "www.fb.com"] },
  { field: "x_url", hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"] },
  { field: "instagram_url", hosts: ["instagram.com", "www.instagram.com"] },
  { field: "youtube_url", hosts: ["youtube.com", "www.youtube.com", "youtu.be"] },
  { field: "tiktok_url", hosts: ["tiktok.com", "www.tiktok.com"] },
  { field: "linkedin_url", hosts: ["linkedin.com", "www.linkedin.com"] },
  { field: "truth_social_url", hosts: ["truthsocial.com", "www.truthsocial.com"] },
];

// =====================
// Generic helpers
// =====================
function isBlockedHost(hostname) {
  const parts = hostname.split(".");
  const tld = parts[parts.length - 1];
  return BLOCK_TLD.has(tld);
}

function normalizeUrl(u) {
  try {
    const url = new URL(u);
    const drop = [
      "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
      "fbclid","gclid","mc_cid","mc_eid"
    ];
    for (const k of drop) url.searchParams.delete(k);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function looksLikeShareLink(urlStr) {
  return /share|intent|tweet\?text=|sharer\.php|facebook\.com\/sharer|twitter\.com\/share/i.test(urlStr);
}

function scoreLink(field, urlStr, officialDomain) {
  let s = 0;
  if (!urlStr) return -999;
  if (looksLikeShareLink(urlStr)) s -= 50;

  // Prefer profile-like URLs
  if (field === "x_url" && /(x|twitter)\.com\/[^\/]+\/?$/i.test(urlStr)) s += 30;
  if (field === "instagram_url" && /instagram\.com\/[^\/]+\/?$/i.test(urlStr)) s += 30;
  if (field === "tiktok_url" && /tiktok\.com\/@/i.test(urlStr)) s += 35;
  if (field === "youtube_url") {
    if (/youtube\.com\/@/i.test(urlStr)) s += 40;
    if (/youtube\.com\/(channel|c|user)\//i.test(urlStr)) s += 30;
  }
  if (field === "facebook_url" && /facebook\.com\/.+/i.test(urlStr)) s += 15;
  if (field === "linkedin_url" && /linkedin\.com\/(in|company)\//i.test(urlStr)) s += 25;
  if (field === "truth_social_url" && /truthsocial\.com\/@/i.test(urlStr)) s += 30;

  // Bonus if candidate URL is explicitly referenced from official domain page (we're only collecting from it anyway),
  // plus extra bonus if social URL contains the official domain (rare) - or if later you add profile verification.
  if (officialDomain) s += 5;

  // Shorter is usually cleaner
  s += Math.max(0, 10 - Math.min(10, urlStr.length / 35));
  return s;
}

function extractLinksFromHtml(html, baseUrl) {
  const $ = cheerio.load(html);
  const out = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href) return;
    try { out.push(new URL(href, baseUrl).toString()); } catch {}
  });
  return out;
}

function pickBestSocial(links, officialDomain) {
  const result = {};
  for (const rule of SOCIAL_RULES) {
    const candidates = [];

    for (const raw of links) {
      const norm = normalizeUrl(raw);
      if (!norm) continue;

      let u;
      try { u = new URL(norm); } catch { continue; }
      if (isBlockedHost(u.hostname)) continue;

      if (rule.hosts.includes(u.hostname)) {
        candidates.push({ url: norm, score: scoreLink(rule.field, norm, officialDomain) });
      }
    }

    candidates.sort((a,b) => b.score - a.score);
    if (candidates[0]) result[rule.field] = candidates[0].url;
  }
  return result;
}

function mergeSocials(primary, secondary) {
  // fill missing only
  const out = { ...primary };
  for (const [k, v] of Object.entries(secondary)) {
    if (!out[k] && v) out[k] = v;
  }
  return out;
}

function safeUrl(url) {
  try {
    const u = new URL(url);
    if (isBlockedHost(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// =====================
// PocketBase API
// =====================
async function pbLoginIfNeeded() {
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) return null;

  const res = await fetch(`${PB_BASE_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`PB admin login failed: HTTP ${res.status}`);
  const data = await res.json();
  return data?.token || null;
}

async function pbList(token, page = 1, perPage = 200) {
  // Get records that have at least one of website_url or wikipedia_url
  const filter = encodeURIComponent(`website_url != "" || wikipedia_url != ""`);
  const url = `${PB_BASE_URL}/api/collections/${COLLECTION}/records?page=${page}&perPage=${perPage}&filter=${filter}`;

  const headers = {};
  if (token) {
    headers["Authorization"] = token;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`PB list failed: HTTP ${res.status} ${errorText}`);
  }
  return await res.json();
}

async function pbPatch(token, id, patch) {
  const res = await fetch(`${PB_BASE_URL}/api/collections/${COLLECTION}/records/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`PB update failed: HTTP ${res.status} ${txt}`);
  }
  return await res.json();
}

// =====================
// Source A: Official site (Playwright)
// =====================
async function scrapeOfficialSite(playwrightPage, officialUrl) {
  const start = safeUrl(officialUrl);
  if (!start) return { socials: {}, error: "invalid or blocked (.gov) official site" };

  const officialHost = new URL(start).hostname;
  const officialDomain = officialHost;

  const urlsToTry = [];
  for (const p of PATH_GUESSES) {
    try { urlsToTry.push(new URL(p, start).toString()); } catch {}
  }

  const seen = new Set();
  const collectedLinks = [];

  for (const url of urlsToTry) {
    if (seen.size >= MAX_SITE_PAGES) break;
    if (seen.has(url)) continue;
    seen.add(url);

    // stay on same domain
    try {
      const u = new URL(url);
      if (u.hostname !== officialHost) continue;
    } catch {
      continue;
    }

    try {
      await playwrightPage.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
      // small extra wait for JS footers
      await playwrightPage.waitForTimeout(600);

      const html = await playwrightPage.content();
      const links = extractLinksFromHtml(html, url);
      collectedLinks.push(...links);

      // discover a few more relevant internal pages
      for (const l of links) {
        try {
          const u = new URL(l);
          if (u.hostname !== officialHost) continue;
          if (isBlockedHost(u.hostname)) continue;

          const path = u.pathname.toLowerCase();
          if (/(contact|about|connect|social|media|press|news)/.test(path)) {
            const abs = u.toString();
            if (!seen.has(abs) && seen.size < MAX_SITE_PAGES) {
              seen.add(abs);
              urlsToTry.push(abs);
            }
          }
        } catch {}
      }
    } catch {
      // ignore failures and keep going
    }
  }

  const socials = pickBestSocial(collectedLinks, officialDomain);
  return { socials };
}

// =====================
// Source B: Wikipedia fallback
// =====================
async function scrapeWikipedia(wikiUrl) {
  const url = safeUrl(wikiUrl);
  if (!url) return { socials: {}, error: "invalid or blocked wikipedia url" };

  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (!res.ok) return { socials: {}, error: `wikipedia http ${res.status}` };
    const html = await res.text();

    // Wikipedia pages are mostly server-rendered, so cheerio is fine.
    // We'll extract all links and then filter for social hosts.
    const links = extractLinksFromHtml(html, url);

    const socials = pickBestSocial(links, null);
    return { socials };
  } catch (e) {
    return { socials: {}, error: String(e?.message || e) };
  }
}

// =====================
// Main runner
// =====================
async function main() {
  const token = await pbLoginIfNeeded();

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ userAgent: USER_AGENT });
  const page = await ctx.newPage();

  let processed = 0;
  let pbPage = 1;

  while (processed < MAX_RECORDS) {
    const data = await pbList(token, pbPage, 200);
    const items = data?.items || [];
    if (!items.length) break;

    for (const rec of items) {
      if (processed >= MAX_RECORDS) break;

      const name = rec.name || rec.slug || rec.id;
      const official = rec.website_url || "";
      const wiki = rec.wikipedia_url || "";

      process.stdout.write(`\n[${processed + 1}] ${name}\n`);
      process.stdout.write(`  official: ${official}\n  wiki:     ${wiki}\n`);

      // Option: only fill missing fields (recommended)
      const already = {
        facebook_url: rec.facebook_url,
        x_url: rec.x_url,
        instagram_url: rec.instagram_url,
        youtube_url: rec.youtube_url,
        tiktok_url: rec.tiktok_url,
        linkedin_url: rec.linkedin_url,
        truth_social_url: rec.truth_social_url,
      };

      try {
        // A) official site
        let officialSocials = {};
        if (official) {
          const rA = await scrapeOfficialSite(page, official);
          officialSocials = rA.socials || {};
          process.stdout.write(`  A socials: ${JSON.stringify(officialSocials)}\n`);
        }

        // Determine what's missing after A (and after existing)
        const combinedA = mergeSocials(already, officialSocials);

        // B) wikipedia only for missing
        let wikiSocials = {};
        const missing = Object.keys(already).filter((k) => !combinedA[k]);
        if (missing.length && wiki) {
          const rB = await scrapeWikipedia(wiki);
          wikiSocials = rB.socials || {};
          process.stdout.write(`  B socials: ${JSON.stringify(wikiSocials)}\n`);
        }

        const combined = mergeSocials(combinedA, wikiSocials);

        // Patch only NEW values (don't overwrite existing)
        const patch = {};
        for (const k of Object.keys(already)) {
          if (!already[k] && combined[k]) patch[k] = combined[k];
        }

        if (!Object.keys(patch).length) {
          process.stdout.write(`  update: none\n`);
          processed++;
          continue;
        }

        await pbPatch(token, rec.id, patch);
        process.stdout.write(`  updated: ${JSON.stringify(patch)}\n`);
      } catch (e) {
        process.stdout.write(`  error: ${String(e?.message || e)}\n`);
      }

      processed++;
    }

    if (!data?.totalPages || pbPage >= data.totalPages) break;
    pbPage++;
  }

  await browser.close();
  console.log(`\nDone. Processed ${processed} records.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
