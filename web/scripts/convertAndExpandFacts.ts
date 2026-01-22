/**
 * Convert existing profile facts to president_facts collection format
 * and expand to all 44 presidents with comprehensive facts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProfileFact {
  slug: string;
  term_start?: string;
  term_end?: string;
  terms?: Array<{ start: string; end?: string }>;
  party?: string;
  home_state?: string;
  birthplace?: string;
  birth_date?: string;
  death_date?: string;
  spouse?: string;
  vice_presidents?: string[];
  education?: string[];
  professions?: string[];
  major_events?: Array<{ label: string; date?: string; source_url?: string }>;
  sources?: Array<{ label: string; url: string }>;
}

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

function convertProfileFactsToFacts(profileFacts: ProfileFact[]): PresidentFact[] {
  const allFacts: PresidentFact[] = [];
  
  for (const pf of profileFacts) {
    let order = 1;
    
    // Birth & Family
    if (pf.birth_date) {
      allFacts.push({
        president_slug: pf.slug,
        category: 'birth_family',
        fact_type: 'birth_date',
        label: 'Birth Date',
        value: new Date(pf.birth_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        date: pf.birth_date,
        order: order++,
      });
    }
    
    if (pf.birthplace) {
      allFacts.push({
        president_slug: pf.slug,
        category: 'birth_family',
        fact_type: 'birthplace',
        label: 'Birthplace',
        value: pf.birthplace,
        order: order++,
      });
    }
    
    if (pf.death_date) {
      allFacts.push({
        president_slug: pf.slug,
        category: 'birth_family',
        fact_type: 'death_date',
        label: 'Death Date',
        value: new Date(pf.death_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        date: pf.death_date,
        order: order++,
      });
    }
    
    if (pf.spouse) {
      allFacts.push({
        president_slug: pf.slug,
        category: 'birth_family',
        fact_type: 'spouse',
        label: 'Spouse',
        value: pf.spouse,
        order: order++,
      });
    }
    
    // Education
    if (pf.education && Array.isArray(pf.education)) {
      pf.education.forEach((edu, idx) => {
        allFacts.push({
          president_slug: pf.slug,
          category: 'education',
          fact_type: 'education',
          label: idx === 0 ? 'Education' : '',
          value: edu,
          order: idx + 1,
        });
      });
    }
    
    // Career/Professions
    if (pf.professions && Array.isArray(pf.professions)) {
      pf.professions.forEach((prof, idx) => {
        allFacts.push({
          president_slug: pf.slug,
          category: 'career',
          fact_type: 'profession',
          label: idx === 0 ? 'Profession' : '',
          value: prof,
          order: idx + 1,
        });
      });
    }
    
    // Presidency
    if (pf.term_start) {
      const termEnd = pf.term_end || 'Present';
      allFacts.push({
        president_slug: pf.slug,
        category: 'presidency',
        fact_type: 'term',
        label: 'Term',
        value: `${new Date(pf.term_start).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} - ${termEnd === 'Present' ? 'Present' : new Date(pf.term_end!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        date: pf.term_start,
        order: 1,
      });
    }
    
    if (pf.party) {
      allFacts.push({
        president_slug: pf.slug,
        category: 'presidency',
        fact_type: 'party',
        label: 'Party',
        value: pf.party,
        order: 2,
      });
    }
    
    if (pf.vice_presidents && Array.isArray(pf.vice_presidents)) {
      pf.vice_presidents.forEach((vp, idx) => {
        allFacts.push({
          president_slug: pf.slug,
          category: 'presidency',
          fact_type: 'vice_president',
          label: idx === 0 ? 'Vice President(s)' : '',
          value: vp,
          order: idx + 3,
        });
      });
    }
    
    // Achievements (from major_events)
    if (pf.major_events && Array.isArray(pf.major_events)) {
      pf.major_events.forEach((event, idx) => {
        allFacts.push({
          president_slug: pf.slug,
          category: 'achievements',
          fact_type: 'achievement',
          label: event.label,
          value: event.label,
          date: event.date,
          source_url: event.source_url,
          order: idx + 1,
        });
      });
    }
  }
  
  return allFacts;
}

async function main() {
  try {
    // Read existing profile facts
    const profileFactsPath = path.join(__dirname, '../../../data/presidents_profile_facts.seed.json');
    const profileFacts: ProfileFact[] = JSON.parse(fs.readFileSync(profileFactsPath, 'utf-8'));
    
    console.log(`📦 Loaded profile facts for ${profileFacts.length} presidents`);
    
    // Convert to president_facts format
    const facts = convertProfileFactsToFacts(profileFacts);
    
    // Save to seed file
    const factsPath = path.join(__dirname, '../../../data/president_facts.seed.json');
    fs.writeFileSync(factsPath, JSON.stringify(facts, null, 2));
    
    console.log(`✅ Converted to ${facts.length} facts`);
    console.log(`   Saved to: ${factsPath}`);
    console.log(`\n📝 Next step: Expand to all 44 presidents with comprehensive data`);
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

main();
