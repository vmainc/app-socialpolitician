#!/usr/bin/env node

/**
 * Fetch official website URLs for all politicians missing them
 * Uses Wikipedia infobox data and common patterns to find official websites
 * 
 * Usage:
 *   node scripts/fetch_website_urls.mjs
 * 
 *   # Dry run (default)
 *   DRY_RUN=true node scripts/fetch_website_urls.mjs
 * 
 *   # Actually update records
 *   DRY_RUN=false node scripts/fetch_website_urls.mjs
 */

import PocketBase from "pocketbase";
import fetch from "node-fetch";

const PB_BASE_URL = process.env.PB_BASE_URL || "http://127.0.0.1:8091";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || "admin@vma.agency";
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || "VMAmadmia42O200!";
const DRY_RUN = process.env.DRY_RUN !== "false"; // Default to true (dry run)

const pb = new PocketBase(PB_BASE_URL);
const COLLECTION_NAME = "politicians";

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

async function rateLimitedFetch(url) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SocialPoliticianBot/1.0 (https://socialpolitician.com; contact@socialpolitician.com)"
      },
      redirect: "follow",
      timeout: 10000
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (error) {
    return null;
  }
}

async function authenticate() {
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log("✅ Authenticated with PocketBase\n");
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);
    process.exit(1);
  }
}

/**
 * Extract website URL from Wikipedia page infobox
 */
async function getWebsiteFromWikipedia(wikipediaUrl) {
  if (!wikipediaUrl || typeof wikipediaUrl !== "string") {
    return null;
  }

  try {
    // Use Wikipedia API to get page content
    const pageName = wikipediaUrl.replace("https://en.wikipedia.org/wiki/", "").replace(/_/g, " ");
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvsection=0&titles=${encodeURIComponent(pageName)}&format=json`;
    
    const response = await rateLimitedFetch(apiUrl);
    if (!response || !response.ok) return null;
    
    const data = await response.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    
    const page = Object.values(pages)[0];
    const content = page?.revisions?.[0]?.content || "";
    
    // Look for website URL in infobox
    // Pattern: | website = https://example.com
    // Pattern: | website = {{URL|https://example.com}}
    const websiteMatch = content.match(/\|\s*website\s*=\s*(?:{{URL\|)?([^\n|}]+)/i);
    if (websiteMatch && websiteMatch[1]) {
      let url = websiteMatch[1].trim();
      // Remove template syntax
      url = url.replace(/^{{.*?\|/, "").replace(/}}.*$/, "").trim();
      // Ensure it's a full URL
      if (url && !url.startsWith("http")) {
        url = `https://${url}`;
      }
      // Validate URL
      try {
        new URL(url);
        return url;
      } catch {
        return null;
      }
    }
    
    // Also check for official website
    const officialMatch = content.match(/\|\s*official\s*website\s*=\s*(?:{{URL\|)?([^\n|}]+)/i);
    if (officialMatch && officialMatch[1]) {
      let url = officialMatch[1].trim();
      url = url.replace(/^{{.*?\|/, "").replace(/}}.*$/, "").trim();
      if (url && !url.startsWith("http")) {
        url = `https://${url}`;
      }
      try {
        new URL(url);
        return url;
      } catch {
        return null;
      }
    }
  } catch (error) {
    // Silently fail and try other methods
  }

  return null;
}

/**
 * Generate potential website URLs based on name and office
 */
function generatePotentialUrls(name, officeType, state, district) {
  const urls = [];
  
  if (!name || typeof name !== "string") return urls;
  
  // Clean name for URL
  const nameParts = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(p => p.length > 0);
  
  if (nameParts.length === 0) return urls;
  
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  const fullName = nameParts.join("");
  
  // Common patterns for official websites
  if (officeType === "senator" || officeType === "representative") {
    // Senate/House official websites
    if (officeType === "senator") {
      urls.push(`https://www.${lastName}.senate.gov`);
      urls.push(`https://${lastName}.senate.gov`);
    } else if (officeType === "representative") {
      urls.push(`https://${lastName}.house.gov`);
      urls.push(`https://www.${lastName}.house.gov`);
    }
  }
  
  // Campaign/personal websites
  urls.push(`https://www.${fullName}.com`);
  urls.push(`https://${fullName}.com`);
  urls.push(`https://www.${firstName}${lastName}.com`);
  urls.push(`https://${firstName}${lastName}.com`);
  urls.push(`https://www.${lastName}for${state || "congress"}.com`);
  
  return urls;
}

/**
 * Verify if a URL exists and is accessible
 */
async function verifyUrl(url) {
  if (!url || typeof url !== "string") return false;
  
  try {
    const response = await rateLimitedFetch(url);
    if (response && response.ok) {
      return true;
    }
  } catch (error) {
    // URL doesn't exist or is inaccessible
  }
  
  return false;
}

/**
 * Find official website URL for a politician
 */
async function findWebsiteUrl(politician) {
  const name = politician.name;
  const wikipediaUrl = politician.wikipedia_url;
  const officeType = politician.office_type;
  const state = politician.state;
  const district = politician.district;
  
  // Method 1: Try to extract from Wikipedia infobox
  if (wikipediaUrl) {
    const wikiUrl = await getWebsiteFromWikipedia(wikipediaUrl);
    if (wikiUrl) {
      // Verify it's accessible
      if (await verifyUrl(wikiUrl)) {
        return wikiUrl;
      }
    }
  }
  
  // Method 2: Try common patterns (senate.gov, house.gov, etc.)
  const potentialUrls = generatePotentialUrls(name, officeType, state, district);
  
  for (const url of potentialUrls) {
    if (await verifyUrl(url)) {
      return url;
    }
  }
  
  return null;
}

async function fetchWebsiteUrls() {
  console.log("🌐 Fetching Official Website URLs for Politicians");
  console.log("=" .repeat(60));
  console.log(`📋 Collection: ${COLLECTION_NAME}`);
  console.log(`🌐 PocketBase URL: ${PB_BASE_URL}`);
  console.log(`🔍 Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will update records)"}\n`);

  await authenticate();

  let page = 1;
  const perPage = 200;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  while (true) {
    try {
      const result = await pb.collection(COLLECTION_NAME).getList(page, perPage, {
        requestKey: null,
      });

      if (!result.items || result.items.length === 0) {
        break;
      }

      console.log(`📄 Processing page ${page} (${result.items.length} records)...`);

      for (const record of result.items) {
        totalProcessed++;

        const name = record.name || record.slug || record.id;
        const existingWebsiteUrl = record.website_url || "";

        // Skip if already has website URL
        if (existingWebsiteUrl && existingWebsiteUrl.trim().length > 0) {
          totalSkipped++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`  [DRY RUN] Would search for website: ${name}`);
        } else {
          process.stdout.write(`  🔍 Searching: ${name}... `);
        }

        try {
          const websiteUrl = await findWebsiteUrl(record);

          if (websiteUrl) {
            if (DRY_RUN) {
              console.log(`    → Found: ${websiteUrl}`);
              totalUpdated++;
            } else {
              await pb.collection(COLLECTION_NAME).update(record.id, {
                website_url: websiteUrl,
              });
              console.log(`✅ Found: ${websiteUrl}`);
              totalUpdated++;
            }
          } else {
            if (DRY_RUN) {
              console.log(`    → Not found`);
            } else {
              console.log(`❌ Not found`);
            }
            totalNotFound++;
          }
        } catch (error) {
          console.error(`\n  ❌ Error processing ${name}: ${error.message}`);
        }
      }

      if (page >= result.totalPages) {
        break;
      }

      page++;
    } catch (error) {
      console.error(`❌ Error processing page ${page}:`, error.message);
      break;
    }
  }

  // Summary
  console.log("\n" + "=" .repeat(60));
  console.log("📊 Website URL Fetch Summary");
  console.log("=" .repeat(60));
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Already had URL: ${totalSkipped}`);
  console.log(`URLs found & updated: ${totalUpdated}`);
  console.log(`Not found: ${totalNotFound}`);

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN MODE - No changes were made");
    console.log("   Run with DRY_RUN=false to apply updates\n");
  } else {
    console.log("\n✅ Website URL fetch complete!\n");
  }
}

fetchWebsiteUrls().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
