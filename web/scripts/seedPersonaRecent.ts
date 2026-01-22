import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

// Use proxied URL if POCKETBASE_URL not set, or allow override
const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(pbUrl);

interface PersonaData {
  slug: string;
  persona_voice_summary?: string;
  persona_traits?: string[];
  persona_rhetoric_patterns?: string[];
  persona_pushback_playbook?: {
    when_user_accuses?: string;
    when_user_demands_apology?: string;
    when_user_challenges_facts?: string;
    when_user_gets_hostile?: string;
  };
  persona_red_lines?: string[];
  persona_citation_style?: 'none' | 'light' | 'source-forward';
  persona_accuracy_mode?: 'historical-only' | 'recent-but-cautious';
  persona_example_snippets?: string[];
}

/**
 * Seed persona data for recent/living presidents
 * 
 * Usage:
 *   npm run seed:persona_recent
 * 
 * Environment variables required:
 *   POCKETBASE_URL (default: http://127.0.0.1:8090)
 *   POCKETBASE_ADMIN_EMAIL
 *   POCKETBASE_ADMIN_PASSWORD
 * 
 * The script reads from data/persona_recent.seed.json
 */
async function seedPersonaRecent() {
  try {
    // Authenticate as admin
    const email = process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!email || !password) {
      console.error('❌ POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
      process.exit(1);
    }

    await pb.admins.authWithPassword(email, password);
    console.log('✅ Authenticated as PocketBase admin');

    // Load seed data
    const possiblePaths = [
      join(process.cwd(), 'data', 'persona_recent.seed.json'),
      join(process.cwd(), '..', 'data', 'persona_recent.seed.json'),
      join(process.cwd(), '..', '..', 'data', 'persona_recent.seed.json'),
    ];
    
    let seedPath: string | null = null;
    for (const path of possiblePaths) {
      try {
        readFileSync(path, 'utf-8');
        seedPath = path;
        break;
      } catch {
        // Try next path
      }
    }
    
    if (!seedPath) {
      console.error(`❌ Seed file not found. Tried: ${possiblePaths.join(', ')}`);
      process.exit(1);
    }

    let seedData: PersonaData[];
    try {
      const fileContent = readFileSync(seedPath, 'utf-8');
      seedData = JSON.parse(fileContent);
      console.log(`📂 Loaded seed file: ${seedPath}`);
    } catch (error) {
      console.error(`❌ Failed to read/parse seed file: ${seedPath}`);
      console.error('   Error:', error);
      process.exit(1);
    }

    if (!Array.isArray(seedData)) {
      console.error('❌ Seed data must be an array');
      process.exit(1);
    }

    console.log(`📦 Loaded ${seedData.length} persona records`);

    // Get all presidents to match by slug
    const presidents = await pb.collection('presidents').getFullList();
    const presidentsBySlug = new Map(presidents.map(p => [p.slug, p]));
    const presidentsByName = new Map(presidents.map(p => [p.name.toLowerCase(), p]));

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Update each president
    for (const persona of seedData) {
      // Try to find president by slug first
      let president = presidentsBySlug.get(persona.slug);

      // Fallback: try to match by name (case-insensitive)
      if (!president && persona.slug) {
        // Try to extract name from slug (e.g., "donald-trump" -> "Donald Trump")
        const nameFromSlug = persona.slug
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        president = presidentsByName.get(nameFromSlug.toLowerCase());
      }

      if (!president) {
        console.warn(`⚠️  President with slug "${persona.slug}" not found, skipping`);
        skipped++;
        continue;
      }

      try {
        const updateData: Partial<PersonaData> = {};

        if (persona.persona_voice_summary !== undefined) {
          updateData.persona_voice_summary = persona.persona_voice_summary;
        }
        if (persona.persona_traits !== undefined) {
          updateData.persona_traits = JSON.stringify(persona.persona_traits);
        }
        if (persona.persona_rhetoric_patterns !== undefined) {
          updateData.persona_rhetoric_patterns = JSON.stringify(persona.persona_rhetoric_patterns);
        }
        if (persona.persona_pushback_playbook !== undefined) {
          updateData.persona_pushback_playbook = JSON.stringify(persona.persona_pushback_playbook);
        }
        if (persona.persona_red_lines !== undefined) {
          updateData.persona_red_lines = JSON.stringify(persona.persona_red_lines);
        }
        if (persona.persona_citation_style !== undefined) {
          updateData.persona_citation_style = persona.persona_citation_style;
        }
        if (persona.persona_accuracy_mode !== undefined) {
          updateData.persona_accuracy_mode = persona.persona_accuracy_mode;
        }
        if (persona.persona_example_snippets !== undefined) {
          updateData.persona_example_snippets = JSON.stringify(persona.persona_example_snippets);
        }

        await pb.collection('presidents').update(president.id, updateData);
        console.log(`✅ Updated ${president.name} (${persona.slug})`);
        updated++;
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error(`❌ Failed to update ${president.name}: ${err.message || 'Unknown error'}`);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);

    if (errors === 0) {
      console.log('\n✅ Persona seeding completed successfully');
    } else {
      console.log(`\n⚠️  Completed with ${errors} error(s)`);
      process.exit(1);
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('❌ Fatal error:', err.message || 'Unknown error');
    process.exit(1);
  }
}

// Run if called directly
seedPersonaRecent().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

export { seedPersonaRecent };
