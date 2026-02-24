/**
 * Backfill representatives with a 2-paragraph AI summary biography.
 * Fetches each representative's Wikipedia page, then uses OpenAI to produce a
 * concise 2-paragraph bio focusing on major life achievements and their time in Congress.
 *
 * Requires: OPENAI_API_KEY (https://platform.openai.com/api-keys)
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... \
 *   POCKETBASE_URL=https://app.socialpolitician.com/pb \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=... \
 *   npx tsx server/src/scripts/backfillRepresentativesBios.ts
 *
 * Optional: --dry-run to fetch and summarize without writing to PocketBase.
 */

import PocketBase from 'pocketbase';
import OpenAI from 'openai';

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const MIN_MS_BETWEEN_WIKI = 1500;
const WIKI_TEXT_MAX_CHARS = 6000;
let lastWikiRequest = 0;

function getWikipediaTitle(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = String(url).match(/\/wiki\/(.+)$/);
  return m ? decodeURIComponent(m[1].replace(/_/g, ' ')) : null;
}

function stripCitationMarkers(text: string): string {
  return text
    .replace(/\s*\[\s*\d+\s*\]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(html: string): string {
  return stripCitationMarkers(
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function extractWikiTextForSummary(html: string, maxChars: number): string {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');
  const afterInfobox = clean.indexOf('</table>') > 0 ? clean.indexOf('</table>') : 0;
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/g;
  const chunk = clean.substring(afterInfobox);
  const parts: string[] = [];
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = pRe.exec(chunk)) !== null && total < maxChars) {
    let text = stripHtml(match[1]);
    if (text.length < 60) continue;
    if (text.includes('may refer to:') || text.includes('disambiguation')) continue;
    parts.push(text);
    total += text.length;
  }
  return stripCitationMarkers(parts.join(' ').replace(/\s+/g, ' ').trim()).slice(0, maxChars);
}

async function getWikipediaPageHTML(title: string): Promise<string | null> {
  const now = Date.now();
  const wait = MIN_MS_BETWEEN_WIKI - (now - lastWikiRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastWikiRequest = Date.now();
  const params = new URLSearchParams({
    action: 'parse',
    format: 'json',
    page: title,
    prop: 'text',
    origin: '*',
  });
  const res = await fetch(`${WIKIPEDIA_API}?${params}`, {
    headers: { 'User-Agent': 'SocialPoliticianApp/1.0 (https://app.socialpolitician.com)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.parse?.text?.['*'] ?? null;
}

const SYSTEM_PROMPT = `You are a biographer. Given Wikipedia-style text about a U.S. Representative (member of the House of Representatives), write exactly two short paragraphs for their official biography.

Paragraph 1: Summarize their background and path to politics (education, early career, entry into public service or Congress). Keep it concise.

Paragraph 2: Focus on their time in the U.S. House and major achievements (key legislation, committees, events, legacy). If they served in state or local office first, briefly connect that to their congressional work.

Rules:
- Write in third person, neutral tone.
- No citations, no "[1]" or footnotes.
- Exactly 2 paragraphs, no subheadings or bullet points.
- Each paragraph should be 2–5 sentences. Total length roughly 150–250 words.`;

async function summarizeWithOpenAI(
  name: string,
  state: string,
  district: string | undefined,
  wikiText: string,
  openai: OpenAI
): Promise<string> {
  const location = district ? `${state}, ${district}` : state;
  const userContent = `U.S. Representative: ${name} (${location}).\n\nWikipedia excerpt:\n\n${wikiText}`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    max_tokens: 500,
    temperature: 0.3,
  });
  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from OpenAI');
  return content;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  const openaiKey = process.env.OPENAI_API_KEY;

  console.log('📜 Backfill representative bios (2-paragraph AI summary)');
  console.log('========================================================');
  if (dryRun) console.log('🔍 DRY RUN – no changes will be written to PocketBase');
  if (!openaiKey) {
    console.error('❌ OPENAI_API_KEY is required. Set it in the environment.');
    process.exit(1);
  }
  console.log(`PocketBase: ${pbUrl}`);
  console.log('');

  const pb = new PocketBase(pbUrl);
  await pb.admins.authWithPassword(adminEmail, adminPassword);

  const filter = '(office_type="representative" || chamber="Representative")';
  const reps = await pb.collection('politicians').getFullList<{
    id: string;
    name: string;
    state?: string;
    district?: string;
    wikipedia_url?: string;
    bio?: string;
  }>({ filter, sort: 'name' });

  const withWiki = reps.filter((r) => r.wikipedia_url && String(r.wikipedia_url).trim() !== '');
  console.log(`📦 Loaded ${reps.length} representatives; ${withWiki.length} have Wikipedia URL`);
  if (withWiki.length === 0) {
    console.log('Nothing to do.');
    return;
  }
  console.log('');

  const openai = new OpenAI({ apiKey: openaiKey });
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < withWiki.length; i++) {
    const r = withWiki[i];
    const title = getWikipediaTitle(r.wikipedia_url);
    if (!title) {
      console.log(`[${i + 1}/${withWiki.length}] ⏭️ ${r.name}: no Wikipedia title`);
      continue;
    }
    const location = r.district ? `${r.state || '?'} ${r.district}` : (r.state || '?');
    process.stdout.write(`[${i + 1}/${withWiki.length}] ${r.name} (${location})... `);
    try {
      const html = await getWikipediaPageHTML(title);
      if (!html) {
        console.log('could not fetch Wikipedia');
        errors++;
        continue;
      }
      const wikiText = extractWikiTextForSummary(html, WIKI_TEXT_MAX_CHARS);
      if (wikiText.length < 200) {
        console.log('too little text from Wikipedia');
        errors++;
        continue;
      }
      const bio = await summarizeWithOpenAI(
        r.name,
        r.state || 'state',
        r.district,
        wikiText,
        openai
      );
      if (dryRun) {
        console.log('OK (dry run)');
        if (i < 2) console.log(`   Preview: ${bio.slice(0, 120)}...`);
        updated++;
        continue;
      }
      await pb.collection('politicians').update(r.id, { bio });
      updated++;
      console.log('✅');
    } catch (e: any) {
      errors++;
      console.log(`❌ ${e?.message || e}`);
    }
  }

  console.log('');
  console.log('📊 Summary');
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  if (dryRun && updated > 0) console.log('   (Dry run – no records were modified)');
  console.log('✅ Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
