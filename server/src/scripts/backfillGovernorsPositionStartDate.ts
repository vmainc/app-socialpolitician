/**
 * Backfill position_start_date for governors from Wikipedia.
 * Fetches the current "List of current United States governors" and updates
 * only position_start_date (took office) for matching PocketBase records.
 * Use when position_start_date was incorrectly set to birth date.
 *
 * Usage (production):
 *   POCKETBASE_URL=https://your-live-pb.example.com \
 *   POCKETBASE_ADMIN_EMAIL=admin@... \
 *   POCKETBASE_ADMIN_PASSWORD=... \
 *   npx tsx server/src/scripts/backfillGovernorsPositionStartDate.ts
 *
 * Optional: --dry-run to log what would be updated without writing.
 */

import PocketBase from 'pocketbase';

const WIKIPEDIA_URL = 'https://en.wikipedia.org/wiki/List_of_current_United_States_governors';

const STATE_NAMES = [
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
  'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
  'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey',
  'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma',
  'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
  'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
  'west virginia', 'wisconsin', 'wyoming',
];

function normalizeSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeName(name: string): string {
  const commaIndex = name.indexOf(',');
  if (commaIndex > 0) {
    const last = name.substring(0, commaIndex).trim();
    const first = name.substring(commaIndex + 1).trim();
    return `${first} ${last}`;
  }
  return name.trim();
}

function extractDate(text: string): string | null {
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes('-')) {
        const date = new Date(match[1]);
        if (date.getFullYear() >= 1900 && date.getFullYear() <= new Date().getFullYear() + 1) return match[1];
      } else {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= new Date().getFullYear() + 1) {
          const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
    }
  }
  return null;
}

interface WikiGovernor {
  name: string;
  state: string;
  position_start_date: string | null;
}

function parseWikipediaTable(html: string): WikiGovernor[] {
  const governors: WikiGovernor[] = [];
  const tableMatch = html.match(/<table[^>]*class="wikitable[^"]*"[\s\S]*?caption[^>]*>Current state governors[\s\S]*?<\/table>/i);
  if (!tableMatch) return governors;
  const mainTable = tableMatch[0];
  const rows = mainTable.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells: string[] = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) cells.push(cellMatch[1]);
    if (cells.length < 3) continue;

    const stateCell = cells[0] || '';
    const stateText = stateCell.replace(/<[^>]+>/g, '').trim();
    const governorCell = cells[2] || '';
    const nameLinkMatch = governorCell.match(/<a[^>]*href="(\/wiki\/[^"]+)"[^>]*(?:title="([^"]+)")?[^>]*>([^<]+)<\/a>/i);
    if (!nameLinkMatch) continue;

    const rawName = nameLinkMatch[3].trim();
    const name = normalizeName(rawName);
    if (STATE_NAMES.includes(name.toLowerCase())) continue;

    const candidates: string[] = [];
    for (const cell of cells) {
      const date = extractDate(cell);
      if (date) candidates.push(date);
    }
    let position_start_date: string | null = null;
    if (candidates.length > 0) {
      const currentYear = new Date().getFullYear();
      const recent = candidates.filter((d) => {
        const y = new Date(d).getFullYear();
        return y >= 2000 && y <= currentYear + 1;
      });
      position_start_date = recent.length > 0
        ? recent.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null;
    }

    const state = stateText.split('(')[0].trim();
    if (!name || !state || name.length < 3) continue;
    governors.push({ name, state, position_start_date });
  }
  return governors;
}

async function fetchWikipedia(): Promise<string> {
  const res = await fetch(WIKIPEDIA_URL);
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';

  console.log('📅 Backfill governors position_start_date from Wikipedia');
  console.log('========================================================');
  if (dryRun) console.log('🔍 DRY RUN – no changes will be written');
  console.log(`PocketBase: ${pbUrl}`);
  console.log('');

  let html: string;
  try {
    html = await fetchWikipedia();
    console.log('✅ Fetched Wikipedia list');
  } catch (e: any) {
    console.error('❌ Failed to fetch Wikipedia:', e?.message);
    process.exit(1);
  }

  const wikiGovernors = parseWikipediaTable(html);
  console.log(`📄 Parsed ${wikiGovernors.length} governors from Wikipedia`);
  const bySlug = new Map<string, string | null>();
  for (const g of wikiGovernors) {
    const slug = normalizeSlug(g.name);
    bySlug.set(slug, g.position_start_date);
  }
  console.log(`   ${[...bySlug.values()].filter(Boolean).length} have took-office date`);
  console.log('');

  const pb = new PocketBase(pbUrl);
  try {
    await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
  } catch (e: any) {
    console.error('❌ PocketBase auth failed:', e?.message);
    process.exit(1);
  }

  const filter = '(office_type="governor" || chamber="Governor")';
  const pbGovernors = await pb.collection('politicians').getFullList<{ id: string; slug: string; name: string; state?: string; position_start_date?: string }>({ filter, sort: 'name' });
  console.log(`📦 Loaded ${pbGovernors.length} governors from PocketBase`);
  console.log('');

  let updated = 0;
  let skipped = 0;
  let noMatch = 0;
  const errors: { name: string; err: string }[] = [];

  for (const rec of pbGovernors) {
    const slug = rec.slug?.trim();
    if (!slug) {
      noMatch++;
      continue;
    }
    const newDate = bySlug.get(slug);
    if (newDate === undefined) {
      noMatch++;
      continue;
    }
    const currentDate = (rec.position_start_date || '').trim() || null;
    if (newDate === null && currentDate === null) {
      skipped++;
      continue;
    }
    if (newDate === currentDate) {
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] Would set ${rec.name} (${rec.state}) position_start_date: ${currentDate || '(empty)'} → ${newDate || '(empty)'}`);
      updated++;
      continue;
    }
    try {
      await pb.collection('politicians').update(rec.id, { position_start_date: newDate || null });
      updated++;
      if (updated <= 20 || updated % 20 === 0) {
        console.log(`  Updated ${rec.name} (${rec.state}): ${currentDate || '—'} → ${newDate}`);
      }
    } catch (e: any) {
      errors.push({ name: rec.name, err: e?.message || 'Unknown error' });
    }
  }

  console.log('');
  console.log('📊 Summary');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (no change): ${skipped}`);
  console.log(`   No Wikipedia match: ${noMatch}`);
  if (errors.length > 0) {
    console.log(`   Errors: ${errors.length}`);
    errors.slice(0, 10).forEach(({ name, err }) => console.log(`     - ${name}: ${err}`));
  }
  if (dryRun && updated > 0) console.log('');
  console.log('✅ Backfill complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
