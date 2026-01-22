/**
 * Seed script to populate factual profile data for presidents
 * Updates presidents collection with term dates, biographical info, and major events
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const pb = new PocketBase(pbUrl);

interface ProfileFact {
  slug: string;
  term_start?: string;
  term_end?: string | null;
  terms?: Array<{ start: string; end?: string | null }>;
  party?: string;
  home_state?: string;
  birthplace?: string;
  birth_date?: string;
  death_date?: string | null;
  spouse?: string;
  vice_presidents?: string[];
  education?: string[];
  professions?: string[];
  major_events?: Array<{ label: string; date?: string; source_url?: string }>;
  sources?: Array<{ label: string; url: string }>;
}

async function seedProfileFacts() {
  try {
    // Read seed data
    const seedFilePath = path.join(__dirname, '../../../data/presidents_profile_facts.seed.json');
    const seedData: ProfileFact[] = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));

    console.log(`📦 Loaded ${seedData.length} president profile facts`);

    // Authenticate as admin (if needed)
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    
    if (adminEmail && adminPassword) {
      try {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
        console.log('✅ Authenticated as admin');
      } catch (err) {
        console.warn('⚠️  Admin auth failed, continuing without auth');
      }
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const fact of seedData) {
      try {
        // Find president by slug
        const records = await pb
          .collection('presidents')
          .getList(1, 1, {
            filter: `slug = "${fact.slug}"`,
          });

        if (records.items.length === 0) {
          console.log(`⚠️  President not found: ${fact.slug}`);
          skipped++;
          continue;
        }

        const president = records.items[0];

        // Prepare update data
        const updateData: Record<string, unknown> = {};

        if (fact.term_start) updateData.term_start = fact.term_start;
        if (fact.term_end !== undefined) updateData.term_end = fact.term_end;
        if (fact.terms) updateData.terms = fact.terms;
        if (fact.party) updateData.party = fact.party;
        if (fact.home_state) updateData.home_state = fact.home_state;
        if (fact.birthplace) updateData.birthplace = fact.birthplace;
        if (fact.birth_date) updateData.birth_date = fact.birth_date;
        if (fact.death_date !== undefined) updateData.death_date = fact.death_date;
        if (fact.spouse) updateData.spouse = fact.spouse;
        if (fact.vice_presidents) updateData.vice_presidents = fact.vice_presidents;
        if (fact.education) updateData.education = fact.education;
        if (fact.professions) updateData.professions = fact.professions;
        if (fact.major_events) updateData.major_events = fact.major_events;
        if (fact.sources) updateData.sources = fact.sources;

        // Update president record
        await pb.collection('presidents').update(president.id, updateData);

        console.log(`✅ Updated: ${president.name} (${fact.slug})`);
        updated++;
      } catch (error: any) {
        console.error(`❌ Error updating ${fact.slug}:`, error.message || error);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n✅ Profile facts seeding complete!`);
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message || error);
    process.exit(1);
  }
}

seedProfileFacts();
