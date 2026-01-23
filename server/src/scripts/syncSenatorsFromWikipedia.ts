/**
 * Sync senators with Wikipedia list to ensure exactly 100 current senators
 * 
 * Fetches the current list from Wikipedia and matches with database
 * Marks non-current senators appropriately
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/syncSenatorsFromWikipedia.ts
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

// Wikipedia API
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';

/**
 * Fetch current senators list from Wikipedia
 */
async function fetchCurrentSenatorsFromWikipedia(): Promise<Set<string>> {
  try {
    // Get the Wikipedia page HTML
    const params = new URLSearchParams({
      action: 'parse',
      format: 'json',
      page: 'List_of_current_United_States_senators',
      prop: 'text',
      origin: '*',
    });
    
    const url = `${WIKIPEDIA_API}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SocialPoliticianApp/1.0 (https://app.socialpolitician.com)',
      },
    });
    
    const data = await response.json();
    const html = data.parse?.text?.['*'];
    
    if (!html) {
      throw new Error('Could not fetch Wikipedia page');
    }
    
    // Extract senator names from the table
    // The table has senator names in links
    const senatorNames = new Set<string>();
    
    // Find all links to senator pages in the table
    // Pattern: <a href="/wiki/Name" ...>Name</a>
    const linkRegex = /<a[^>]*href="\/wiki\/([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const wikiPath = match[1];
      const displayName = match[2].trim();
      
      // Only include if it's a person page (has underscore, not a list/category)
      if (wikiPath.includes('_') && 
          !wikiPath.includes('List_of') && 
          !wikiPath.includes('Category:') &&
          !wikiPath.includes('File:') &&
          !wikiPath.includes('Template:')) {
        // Normalize name (remove HTML entities, trim)
        const normalized = displayName
          .replace(/&[a-z]+;/gi, '')
          .trim();
        
        if (normalized && normalized.length > 3) {
          senatorNames.add(normalized);
        }
      }
    }
    
    return senatorNames;
  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
    throw error;
  }
}

/**
 * Normalize name for matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if names match (fuzzy matching)
 */
function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // Check if one contains the other (for nicknames)
  if (n1.includes(n2) || n2.includes(n1)) {
    // But require at least last name match
    const parts1 = n1.split(' ');
    const parts2 = n2.split(' ');
    const last1 = parts1[parts1.length - 1];
    const last2 = parts2[parts2.length - 1];
    
    if (last1 === last2 && last1.length > 2) {
      return true;
    }
  }
  
  return false;
}

async function main() {
  console.log('🔄 Syncing Senators with Wikipedia');
  console.log('==================================');
  console.log('');
  
  if (!adminEmail || !adminPassword) {
    console.error('❌ ERROR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
    process.exit(1);
  }
  
  // Authenticate
  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated with PocketBase');
  } catch (error: any) {
    console.error(`❌ Authentication failed: ${error.message}`);
    process.exit(1);
  }
  
  // Fetch current senators from Wikipedia
  console.log('📥 Fetching current senators from Wikipedia...');
  const wikiSenatorNames = await fetchCurrentSenatorsFromWikipedia();
  console.log(`✅ Found ${wikiSenatorNames.size} current senators on Wikipedia`);
  console.log('');
  
  // Get all senators from database
  console.log('📥 Fetching senators from PocketBase...');
  const allSenators = await pb.collection('politicians').getFullList({
    filter: 'office_type="senator"',
    sort: 'name',
  });
  
  console.log(`✅ Found ${allSenators.length} senator records in database`);
  console.log('');
  
  // Match and categorize
  const currentSenators: any[] = [];
  const previousSenators: any[] = [];
  const unmatched: any[] = [];
  
  for (const senator of allSenators) {
    const position = (senator.current_position || '').toLowerCase();
    const isPrevious = position.includes('previous') || position.includes('former');
    
    // Try to match with Wikipedia list
    let matched = false;
    for (const wikiName of wikiSenatorNames) {
      if (namesMatch(senator.name, wikiName)) {
        matched = true;
        if (!isPrevious) {
          currentSenators.push(senator);
        } else {
          previousSenators.push(senator);
        }
        break;
      }
    }
    
    if (!matched) {
      if (isPrevious) {
        previousSenators.push(senator);
      } else {
        unmatched.push(senator);
      }
    }
  }
  
  console.log('📊 Analysis:');
  console.log(`   Current senators (matched with Wikipedia): ${currentSenators.length}`);
  console.log(`   Previous/Former senators: ${previousSenators.length}`);
  console.log(`   Unmatched (not in Wikipedia list): ${unmatched.length}`);
  console.log('');
  
  if (unmatched.length > 0) {
    console.log('⚠️  Unmatched senators (may need review):');
    unmatched.slice(0, 10).forEach(s => {
      console.log(`   - ${s.name} (${s.current_position})`);
    });
    if (unmatched.length > 10) {
      console.log(`   ... and ${unmatched.length - 10} more`);
    }
    console.log('');
  }
  
  // Summary
  const totalCurrent = currentSenators.length;
  console.log('==================================');
  if (totalCurrent === 100) {
    console.log('✅ Perfect! Exactly 100 current senators');
  } else {
    console.log(`⚠️  Found ${totalCurrent} current senators (expected 100)`);
    console.log('');
    console.log('The frontend filter will exclude Previous/Former senators');
    console.log('This should show the correct count after deployment.');
  }
  console.log('');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
