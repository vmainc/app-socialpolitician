/**
 * Backfill position_start_date for representatives from Wikipedia.
 * Fetches the current "List of current United States representatives" and updates
 * only position_start_date (assumed office) for matching PocketBase records.
 * Use when position_start_date was incorrectly set to birth date.
 *
 * Usage (production):
 *   POCKETBASE_URL=https://your-live-pb.example.com \
 *   POCKETBASE_ADMIN_EMAIL=admin@... \
 *   POCKETBASE_ADMIN_PASSWORD=... \
 *   npx tsx server/src/scripts/backfillRepresentativesPositionStartDate.ts
 *
 * Optional: --dry-run to log what would be updated without writing.
 */

import PocketBase from 'pocketbase';

const WIKIPEDIA_URL = 'https://en.wikipedia.org/wiki/List_of_current_United_States_representatives';

function normalizeSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeName(name: string): string {
  return name
    .replace(/^Rep\.\s*/i, '')
    .replace(/^Representative\s*/i, '')
    .trim();
}

function extractDate(text: string): string | null {
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/,
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

interface WikiRep {
  name: string;
  state: string;
  district: string;
  position_start_date: string | null;
}

function parseWikipediaTable(html: string): WikiRep[] {
  const reps: WikiRep[] = [];
  const seen = new Set<string>();
  let tableHtml = '';
  const tableMatch = html.match(/<table[^>]*id="votingmembers"[^>]*>([\s\S]*?)<\/table>/i)
    || html.match(/<table[^>]*class="wikitable[^"]*sortable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return reps;
  tableHtml = tableMatch[1];
  const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of rows) {
    if (row.includes('<th scope="col"')) continue;
    const cells = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    if (cells.length < 2) continue;

    const districtCell = cells[0];
    let state = '', district = '';
    const districtLinkMatch = districtCell.match(/<a[^>]*>([^<]+)<\/a>/);
    if (districtLinkMatch) {
      const districtText = districtLinkMatch[1].replace(/&#160;/g, ' ').trim();
      const m = districtText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+|At-large|at-large)$/i);
      if (m) { state = m[1]; district = m[2]; }
    }
    if (!state) {
      const sortValueMatch = districtCell.match(/data-sort-value="([^"]+)"/);
      if (sortValueMatch) {
        const match = sortValueMatch[1].match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(\d+|At-large)$/i);
        if (match) { state = match[1]; district = match[2]; }
      }
    }
    if (!state) continue;

    const memberCell = cells[1];
    const nameLinkMatch = memberCell.match(/<a[^>]*href="\/wiki\/([^"]+)"[^>]*(?:title="([^"]+)")?[^>]*>([^<]+)<\/a>/);
    if (!nameLinkMatch) continue;
    const wikiPath = nameLinkMatch[1];
    if (!wikiPath.includes('_') || wikiPath.includes('List_of') || wikiPath.includes('Category:') || wikiPath.includes('File:') || wikiPath.includes('Template:')) continue;
    if (seen.has(wikiPath)) continue;
    seen.add(wikiPath);

    const name = normalizeName(nameLinkMatch[3].trim());
    if (!name || name.split(' ').length < 2) continue;

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

    reps.push({ name, state, district: district || 'At-large', position_start_date });
  }
  return reps;
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

  console.log('📅 Backfill representatives position_start_date from Wikipedia');
  console.log('============================================================');
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

  const wikiReps = parseWikipediaTable(html);
  console.log(`📄 Parsed ${wikiReps.length} representatives from Wikipedia`);
  const bySlug = new Map<string, string | null>();
  for (const r of wikiReps) {
    const slug = normalizeSlug(`${r.name}-${r.state}-${r.district}`);
    bySlug.set(slug, r.position_start_date);
  }
  console.log(`   ${[...bySlug.values()].filter(Boolean).length} have assumed-office date`);
  console.log('');

  const pb = new PocketBase(pbUrl);
  try {
    await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
  } catch (e: any) {
    console.error('❌ PocketBase auth failed:', e?.message);
    process.exit(1);
  }

  const filter = '(office_type="representative" || chamber="Representative")';
  const pbReps = await pb.collection('politicians').getFullList<{ id: string; slug: string; name: string; state?: string; district?: string; position_start_date?: string }>({ filter, sort: 'name' });
  console.log(`📦 Loaded ${pbReps.length} representatives from PocketBase`);
  console.log('');

  let updated = 0;
  let skipped = 0;
  let noMatch = 0;
  const errors: { name: string; err: string }[] = [];

  for (const rec of pbReps) {
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
      if (updated <= 20 || updated % 50 === 0) {
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
