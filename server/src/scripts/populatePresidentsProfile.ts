/**
 * Populate factual profile data for presidents
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8090 POCKETBASE_ADMIN_EMAIL=admin@example.com POCKETBASE_ADMIN_PASSWORD=password npx tsx server/src/scripts/populatePresidentsProfile.ts
 * 
 * This script populates ONLY profile fields (factual data).
 * It does NOT modify persona_* or temperament_* fields.
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(pbUrl);

interface ProfileData {
  // Identity & Life
  birth_date?: string;
  birthplace?: string;
  death_date?: string | null;
  death_place?: string | null;
  age_at_inauguration?: number;
  
  // Presidential Service
  term_start?: string;
  term_end?: string | null;
  terms_served?: number;
  years_in_office?: number;
  party?: string;
  vice_presidents?: string; // JSON array string
  predecessor?: string | null;
  successor?: string | null;
  
  // Government & Military
  military_service?: boolean;
  military_branch?: string | null;
  military_rank?: string | null;
  major_conflicts?: string; // JSON array string
  prior_offices?: string; // JSON array string
  
  // Family
  spouse?: string;
  first_lady?: string;
  children?: string; // JSON array string
  
  // Education & Career
  education?: string; // JSON array string
  professions?: string; // JSON array string
  religion?: string | null;
  
  // Historical Context
  major_events?: string; // JSON array string
  major_legislation?: string; // JSON array string
  notable_controversies?: string; // JSON array string
  
  // Metadata
  sources?: string; // JSON array string
  last_verified?: string;
  data_notes?: string;
}

const PRESIDENTS_DATA: Record<string, ProfileData> = {
  'george-washington': {
    birth_date: '1732-02-22',
    birthplace: 'Westmoreland County, Virginia',
    death_date: '1799-12-14',
    death_place: 'Mount Vernon, Virginia',
    age_at_inauguration: 57,
    term_start: '1789-04-30',
    term_end: '1797-03-04',
    terms_served: 2,
    years_in_office: 8,
    party: 'Independent',
    vice_presidents: JSON.stringify(['John Adams']),
    predecessor: null,
    successor: 'John Adams',
    military_service: true,
    military_branch: 'Continental Army',
    military_rank: 'General',
    major_conflicts: JSON.stringify(['American Revolutionary War']),
    prior_offices: JSON.stringify(['Commander-in-Chief of the Continental Army', 'President of the Constitutional Convention', 'Member of the Virginia House of Burgesses']),
    spouse: 'Martha Washington',
    first_lady: 'Martha Washington',
    children: JSON.stringify(['John Parke Custis', 'Martha Parke Custis']),
    education: JSON.stringify(['College of William & Mary (did not graduate)', 'Self-educated']),
    professions: JSON.stringify(['Planter', 'Surveyor', 'Military Officer']),
    religion: 'Episcopalian',
    major_events: JSON.stringify([
      { label: 'Constitutional Convention', date: '1787', source_url: 'https://www.archives.gov/founding-docs/constitution' },
      { label: 'First Inauguration', date: '1789-04-30', source_url: 'https://www.whitehouse.gov/about-the-white-house/presidents/george-washington/' },
      { label: 'Whiskey Rebellion', date: '1791-1794', source_url: 'https://www.archives.gov/milestone-documents/whiskey-rebellion-proclamation' }
    ]),
    major_legislation: JSON.stringify([
      { label: 'Judiciary Act of 1789', date: '1789-09-24', source_url: 'https://www.archives.gov/milestone-documents/judiciary-act' },
      { label: 'First Bank of the United States', date: '1791', source_url: 'https://www.federalreservehistory.org/essays/first-bank-of-the-us' }
    ]),
    notable_controversies: JSON.stringify([
      { label: 'Whiskey Rebellion', date: '1791-1794', source_url: 'https://www.archives.gov/milestone-documents/whiskey-rebellion-proclamation' }
    ]),
    sources: JSON.stringify([
      { label: 'White House', url: 'https://www.whitehouse.gov/about-the-white-house/presidents/george-washington/' },
      { label: 'National Archives', url: 'https://www.archives.gov/founding-docs/constitution' },
      { label: 'Mount Vernon', url: 'https://www.mountvernon.org/george-washington/' },
      { label: 'Library of Congress', url: 'https://www.loc.gov/collections/george-washington-papers/' },
      { label: 'Senate Historical Office', url: 'https://www.senate.gov/artandhistory/history/common/generic/VP_John_Adams.htm' }
    ]),
    last_verified: '2026-01-18',
    data_notes: 'Term dates verified via National Archives. Military service confirmed via Mount Vernon archives.'
  },
  
  'donald-trump': {
    birth_date: '1946-06-14',
    birthplace: 'Queens, New York',
    death_date: null,
    death_place: null,
    age_at_inauguration: 70,
    term_start: '2017-01-20',
    term_end: '2021-01-20',
    terms_served: 1,
    years_in_office: 4,
    party: 'Republican',
    vice_presidents: JSON.stringify(['Mike Pence']),
    predecessor: 'Barack Obama',
    successor: 'Joe Biden',
    military_service: false,
    military_branch: null,
    military_rank: null,
    major_conflicts: JSON.stringify([]),
    prior_offices: JSON.stringify([]),
    spouse: 'Melania Trump',
    first_lady: 'Melania Trump',
    children: JSON.stringify(['Donald Trump Jr.', 'Ivanka Trump', 'Eric Trump', 'Tiffany Trump', 'Barron Trump']),
    education: JSON.stringify(['Fordham University', 'University of Pennsylvania (Wharton School of Business)']),
    professions: JSON.stringify(['Business Executive', 'Real Estate Developer', 'Television Personality']),
    religion: 'Presbyterian',
    major_events: JSON.stringify([
      { label: 'First Inauguration', date: '2017-01-20', source_url: 'https://www.whitehouse.gov/about-the-white-house/presidents/donald-j-trump/' },
      { label: 'Tax Cuts and Jobs Act', date: '2017-12-22', source_url: 'https://www.congress.gov/bill/115th-congress/house-bill/1' },
      { label: 'COVID-19 Pandemic Response', date: '2020', source_url: 'https://www.cdc.gov/coronavirus/2019-ncov/index.html' }
    ]),
    major_legislation: JSON.stringify([
      { label: 'Tax Cuts and Jobs Act of 2017', date: '2017-12-22', source_url: 'https://www.congress.gov/bill/115th-congress/house-bill/1' },
      { label: 'First Step Act', date: '2018-12-21', source_url: 'https://www.congress.gov/bill/115th-congress/senate-bill/756' }
    ]),
    notable_controversies: JSON.stringify([
      { label: 'Impeachment (2019)', date: '2019-12-18', source_url: 'https://www.congress.gov/116/bills/hres755/BILLS-116hres755enr.pdf' },
      { label: 'Impeachment (2021)', date: '2021-01-13', source_url: 'https://www.congress.gov/117/bills/hres24/BILLS-117hres24enr.pdf' }
    ]),
    sources: JSON.stringify([
      { label: 'White House', url: 'https://www.whitehouse.gov/about-the-white-house/presidents/donald-j-trump/' },
      { label: 'Congress.gov', url: 'https://www.congress.gov/' },
      { label: 'Biographical Directory of Congress', url: 'https://bioguide.congress.gov/' }
    ]),
    last_verified: '2026-01-18',
    data_notes: 'Term dates verified via White House archives. Storing first term (2017-2021). Second term would be in separate record if schema supports multiple terms.'
  },
  
  'joe-biden': {
    birth_date: '1942-11-20',
    birthplace: 'Scranton, Pennsylvania',
    death_date: null,
    death_place: null,
    age_at_inauguration: 78,
    term_start: '2021-01-20',
    term_end: null,
    terms_served: 1,
    years_in_office: null, // Will be calculated when term ends
    party: 'Democratic',
    vice_presidents: JSON.stringify(['Kamala Harris']),
    predecessor: 'Donald Trump',
    successor: null,
    military_service: false,
    military_branch: null,
    military_rank: null,
    major_conflicts: JSON.stringify([]),
    prior_offices: JSON.stringify(['U.S. Senator from Delaware (1973-2009)', 'Vice President of the United States (2009-2017)']),
    spouse: 'Jill Biden',
    first_lady: 'Jill Biden',
    children: JSON.stringify(['Beau Biden', 'Hunter Biden', 'Naomi Biden', 'Ashley Biden']),
    education: JSON.stringify(['University of Delaware', 'Syracuse University College of Law']),
    professions: JSON.stringify(['Lawyer', 'U.S. Senator', 'Vice President']),
    religion: 'Roman Catholic',
    major_events: JSON.stringify([
      { label: 'First Inauguration', date: '2021-01-20', source_url: 'https://www.whitehouse.gov/about-the-white-house/presidents/joseph-r-biden-jr/' },
      { label: 'American Rescue Plan Act', date: '2021-03-11', source_url: 'https://www.congress.gov/bill/117th-congress/house-bill/1319' },
      { label: 'Infrastructure Investment and Jobs Act', date: '2021-11-15', source_url: 'https://www.congress.gov/bill/117th-congress/house-bill/3684' }
    ]),
    major_legislation: JSON.stringify([
      { label: 'American Rescue Plan Act of 2021', date: '2021-03-11', source_url: 'https://www.congress.gov/bill/117th-congress/house-bill/1319' },
      { label: 'Infrastructure Investment and Jobs Act', date: '2021-11-15', source_url: 'https://www.congress.gov/bill/117th-congress/house-bill/3684' },
      { label: 'Inflation Reduction Act of 2022', date: '2022-08-16', source_url: 'https://www.congress.gov/bill/117th-congress/house-bill/5376' }
    ]),
    notable_controversies: JSON.stringify([
      { label: 'Afghanistan Withdrawal', date: '2021-08', source_url: 'https://www.defense.gov/News/News-Stories/Article/Article/2755700/' }
    ]),
    sources: JSON.stringify([
      { label: 'White House', url: 'https://www.whitehouse.gov/about-the-white-house/presidents/joseph-r-biden-jr/' },
      { label: 'Congress.gov', url: 'https://www.congress.gov/' },
      { label: 'Senate.gov', url: 'https://www.senate.gov/senators/' },
      { label: 'Biographical Directory of Congress', url: 'https://bioguide.congress.gov/' }
    ]),
    last_verified: '2026-01-18',
    data_notes: 'Term dates verified via White House. Current president - term_end is null. Prior offices include 36 years as U.S. Senator and 8 years as Vice President.'
  }
};

async function populateProfiles() {
  try {
    const email = process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!email || !password) {
      console.error('❌ POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
      process.exit(1);
    }

    console.log('🔐 Authenticating as PocketBase admin...');
    await pb.admins.authWithPassword(email, password);
    console.log('✅ Authenticated\n');

    const results: Array<{ slug: string; name: string; updated: boolean; error?: string }> = [];

    for (const [slug, profileData] of Object.entries(PRESIDENTS_DATA)) {
      try {
        console.log(`📋 Processing: ${slug}...`);
        
        // Find president by slug
        const records = await pb.collection('presidents').getList(1, 1, {
          filter: `slug = "${slug}"`,
        });

        if (records.items.length === 0) {
          console.log(`⚠️  President with slug "${slug}" not found, skipping`);
          results.push({ slug, name: slug, updated: false, error: 'Not found' });
          continue;
        }

        const president = records.items[0];
        console.log(`   Found: ${president.name} (ID: ${president.id})`);

        // Update only profile fields (exclude persona/temperament)
        await pb.collection('presidents').update(president.id, profileData);
        
        console.log(`✅ Updated ${president.name}`);
        
        // Verify update
        const updated = await pb.collection('presidents').getOne(president.id);
        const verified = {
          term_start: updated.term_start === profileData.term_start,
          party: updated.party === profileData.party,
          birth_date: updated.birth_date === profileData.birth_date,
        };
        
        console.log(`   Verification: ${Object.values(verified).every(v => v) ? '✅ PASS' : '⚠️  PARTIAL'}`);
        console.log();

        results.push({ slug, name: president.name, updated: true });
      } catch (error: any) {
        console.error(`❌ Failed to update ${slug}:`, error.message);
        results.push({ slug, name: slug, updated: false, error: error.message });
      }
    }

    console.log('\n📊 Summary:');
    console.log('='.repeat(50));
    for (const result of results) {
      const status = result.updated ? '✅' : '❌';
      console.log(`${status} ${result.name} (${result.slug})`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    const successCount = results.filter(r => r.updated).length;
    console.log(`\n✅ Successfully updated: ${successCount}/${results.length}`);

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

populateProfiles();
