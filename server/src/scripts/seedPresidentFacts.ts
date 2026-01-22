/**
 * Seed script to populate president_facts collection
 * Reads from comprehensive JSON seed file and populates facts for all presidents
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const pb = new PocketBase(pbUrl);

interface PresidentFact {
  president_slug: string;
  category: string;
  fact_type: string;
  label: string;
  value?: string;
  date?: string;
  source_url?: string;
  order: number;
}

async function seedPresidentFacts() {
  try {
    // Read seed data
    const seedFilePath = path.join(__dirname, '../../../data/president_facts.seed.json');
    const seedData: PresidentFact[] = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));

    console.log(`📦 Loaded ${seedData.length} facts for ${new Set(seedData.map(f => f.president_slug)).size} presidents`);

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

    // Group facts by president slug
    const factsByPresident = new Map<string, PresidentFact[]>();
    for (const fact of seedData) {
      if (!factsByPresident.has(fact.president_slug)) {
        factsByPresident.set(fact.president_slug, []);
      }
      factsByPresident.get(fact.president_slug)!.push(fact);
    }

    let totalCreated = 0;
    let skipped = 0;
    let errors = 0;

    for (const [slug, facts] of factsByPresident) {
      try {
        // Find president by slug
        const records = await pb
          .collection('presidents')
          .getList(1, 1, {
            filter: `slug = "${slug}"`,
          });

        if (records.items.length === 0) {
          console.log(`⚠️  President not found: ${slug}`);
          skipped += facts.length;
          continue;
        }

        const president = records.items[0];

        // Create facts for this president
        for (const fact of facts) {
          try {
            await pb.collection('president_facts').create({
              president: president.id,
              category: fact.category,
              fact_type: fact.fact_type,
              label: fact.label,
              value: fact.value || null,
              date: fact.date || null,
              source_url: fact.source_url || null,
              order: fact.order,
            });
            totalCreated++;
          } catch (error: any) {
            // Check if it's a duplicate
            if (error?.status === 400 && error?.data?.data?.president) {
              // Try to update instead
              const existing = await pb
                .collection('president_facts')
                .getList(1, 1, {
                  filter: `president = "${president.id}" && fact_type = "${fact.fact_type}" && category = "${fact.category}"`,
                });
              
              if (existing.items.length > 0) {
                await pb.collection('president_facts').update(existing.items[0].id, {
                  label: fact.label,
                  value: fact.value || null,
                  date: fact.date || null,
                  source_url: fact.source_url || null,
                  order: fact.order,
                });
                totalCreated++;
              } else {
                throw error;
              }
            } else {
              throw error;
            }
          }
        }

        console.log(`✅ Created ${facts.length} facts for ${president.name} (${slug})`);
      } catch (error: any) {
        console.error(`❌ Error processing ${slug}:`, error.message || error);
        errors += facts.length;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created/Updated: ${totalCreated}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n✅ President facts seeding complete!`);
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message || error);
    process.exit(1);
  }
}

seedPresidentFacts();
