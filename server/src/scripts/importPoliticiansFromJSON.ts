/**
 * Import politicians from JSON files to PocketBase
 *
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/importPoliticiansFromJSON.ts
 *
 * Options:
 *   --file=executive_import_ready.json  import only this file (e.g. for pushing executives to live)
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
const DEBUG_IMPORT = process.env.DEBUG_IMPORT === '1' || process.env.DEBUG_IMPORT === 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From server/src/scripts go up 3 levels to repo root (where data/ lives)
const projectRoot = path.resolve(__dirname, '../../..');

interface PoliticianData {
  name: string;
  slug: string;
  office_type?: 'senator' | 'representative' | 'governor' | 'other';
  state?: string;
  district?: string;
  political_party?: string;
  current_position?: string;
  position_start_date?: string;
  photo?: string;
  website_url?: string;
  wikipedia_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  instagram_url?: string;
  x_url?: string;
  linkedin_url?: string;
  tiktok_url?: string;
  truth_social_url?: string;
  [key: string]: any;
}

async function importFromJSON(jsonPath: string, pb: PocketBase): Promise<{ created: number; updated: number; errors: number }> {
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON file not found: ${jsonPath}`);
    return { created: 0, updated: 0, errors: 0 };
  }

  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const politicians: PoliticianData[] = JSON.parse(jsonContent);

  console.log(`📄 Loaded ${politicians.length} politicians from ${path.basename(jsonPath)}`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  // Only these fields exist on the politicians collection; unknown fields can cause 400
  const ALLOWED_KEYS = new Set([
    'name', 'slug', 'office_type', 'state', 'district', 'political_party',
    'current_position', 'position_start_date', 'photo', 'website_url', 'wikipedia_url',
    'facebook_url', 'youtube_url', 'instagram_url', 'x_url', 'linkedin_url', 'tiktok_url', 'truth_social_url',
    'bio', 'headline', 'birth_date', 'chamber', 'office_title', 'term_start_date', 'term_end_date',
  ]);

  function sanitizePayload(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!ALLOWED_KEYS.has(k)) continue;
      if (v === undefined || v === null) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      out[k] = v;
    }
    if (obj.name != null && String(obj.name).trim()) out.name = String(obj.name).trim();
    if (obj.slug != null && String(obj.slug).trim()) out.slug = String(obj.slug).trim();
    return out;
  }

  for (const politician of politicians) {
    const { sources, ...rest } = politician as Record<string, unknown>;
    const raw = rest as PoliticianData;
    const payload: Record<string, unknown> = { ...raw };
    const clean = sanitizePayload(payload);
    try {
      const existing = await pb.collection('politicians').getFirstListItem(`slug="${clean.slug}"`, {});
      try {
        await pb.collection('politicians').update(existing.id, clean);
        updated++;
      } catch (updateErr: any) {
        errors++;
        const detail = updateErr?.data ?? updateErr?.response ?? updateErr;
        const msg = detail && typeof detail === 'object' ? JSON.stringify(detail) : (updateErr?.message ?? String(updateErr));
        console.error(`❌ Failed to update ${clean.slug}: ${msg}`);
      }
    } catch (err: any) {
      if (err?.status === 404) {
        try {
          if (DEBUG_IMPORT && errors === 0) {
            console.log(`\n[DEBUG] First create payload for ${clean.slug}:`, JSON.stringify(clean, null, 2));
          }
          await pb.collection('politicians').create(clean);
          created++;
        } catch (createErr: any) {
          errors++;
          const detail = createErr?.data ?? createErr?.response ?? createErr;
          const msg = detail && typeof detail === 'object' ? JSON.stringify(detail) : (createErr?.message ?? String(createErr));
          console.error(`❌ Failed to create ${clean.slug}: ${msg}`);
          if (DEBUG_IMPORT && errors === 1) {
            console.error('[DEBUG] Full error object:', JSON.stringify(createErr, Object.getOwnPropertyNames(createErr), 2));
          }
        }
      } else {
        errors++;
        const detail = err?.data ?? err?.response ?? err;
        const msg = detail && typeof detail === 'object' ? JSON.stringify(detail) : (err?.message ?? String(err));
        console.error(`❌ Error with ${clean.slug}: ${msg}`);
      }
    }
  }

  return { created, updated, errors };
}

async function main() {
  console.log('🔄 Importing Politicians from JSON');
  console.log('==================================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');

  if (!adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }

  const pb = new PocketBase(pbUrl);

  try {
    // Authenticate as admin
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
    } catch (authErr: any) {
      const status = authErr?.status ?? authErr?.response?.status;
      const body = authErr?.data ?? authErr?.response;
      console.error('❌ Admin auth failed.');
      console.error(`   Status: ${status}`);
      if (body && typeof body === 'object') console.error('   Body:', JSON.stringify(body, null, 2));
      else console.error('   Body:', String(body ?? authErr?.message));
      process.exit(1);
    }
    console.log('✅ Authenticated as admin');
    console.log('');

    const dataDir = path.join(projectRoot, 'data');
    const fileArg = process.argv.find((a) => a.startsWith('--file='));
    const singleFile = fileArg ? fileArg.split('=')[1] : null;
    const defaultFiles = [
      'senators_import_ready.json',
      'representatives_import_ready.json',
      'governors_import_ready.json',
      'politicians_import_ready.json',
      'executive_import_ready.json',
    ];
    const jsonFiles = singleFile
      ? [path.join(dataDir, singleFile)]
      : defaultFiles.map((f) => path.join(dataDir, f));
    if (singleFile) console.log(`📌 Importing only: ${singleFile}\n`);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const jsonFile of jsonFiles) {
      if (fs.existsSync(jsonFile)) {
        console.log(`📦 Importing from ${path.basename(jsonFile)}...`);
        const result = await importFromJSON(jsonFile, pb);
        totalCreated += result.created;
        totalUpdated += result.updated;
        totalErrors += result.errors;
        console.log(`   ✅ Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors}`);
        console.log('');
      }
    }

    console.log('📊 Summary:');
    console.log(`   ✅ Total Created: ${totalCreated}`);
    console.log(`   ✅ Total Updated: ${totalUpdated}`);
    console.log(`   ❌ Total Errors: ${totalErrors}`);
    console.log('');

    // Verify
    const count = await pb.collection('politicians').getList(1, 1);
    console.log(`📈 Total politicians in collection: ${count.totalItems}`);

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main();
