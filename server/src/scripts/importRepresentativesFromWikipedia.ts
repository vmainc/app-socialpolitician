/**
 * Import US House of Representatives members from Wikipedia
 * 
 * Source: https://en.wikipedia.org/wiki/List_of_current_United_States_representatives
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/importRepresentativesFromWikipedia.ts
 */

import PocketBase from 'pocketbase';

interface RepresentativeData {
  name: string;
  state: string;
  district: string;
  party: string;
  wikipedia_url?: string;
  wikipedia_title?: string;
  position_start_date?: string;
}

function normalizeName(name: string): string {
  // Remove common prefixes and clean up
  return name
    .replace(/^Rep\.\s*/i, '')
    .replace(/^Representative\s*/i, '')
    .trim();
}

function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeState(state: string): string {
  // Ensure consistent state names
  return state.trim();
}

function normalizeParty(party: string): string {
  const partyText = party.trim();
  
  if (partyText.includes('Republican') || partyText === 'R') {
    return 'Republican';
  }
  if (partyText.includes('Democratic') || partyText === 'D') {
    return 'Democratic';
  }
  if (partyText.includes('Independent') || partyText === 'I') {
    return 'Independent';
  }
  
  return partyText;
}

function extractDate(text: string): string | null {
  // Look for dates in various formats
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/, // YYYY-MM-DD
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes('-')) {
        // Already YYYY-MM-DD format
        const date = new Date(match[1]);
        if (date.getFullYear() >= 1900 && date.getFullYear() <= new Date().getFullYear() + 1) {
          return match[1];
        }
      } else {
        // Parse other formats
        const date = new Date(match[0]);
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= new Date().getFullYear() + 1) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
    }
  }
  
  return null;
}

// Parse Wikipedia table for representatives
function parseWikipediaTable(html: string): RepresentativeData[] {
  const representatives: RepresentativeData[] = [];
  const seen = new Set<string>();
  
  // State abbreviation to full name mapping
  const stateAbbrevMap: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming',
  };
  
  // Find the main table - try multiple patterns
  let tableHtml = '';
  
  // Try id="votingmembers" first
  let tableMatch = html.match(/<table[^>]*id="votingmembers"[^>]*>([\s\S]*?)<\/table>/i);
  if (tableMatch) {
    tableHtml = tableMatch[1];
  } else {
    // Try to find table with "List of representatives" caption
    tableMatch = html.match(/<table[^>]*class="wikitable[^"]*sortable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      tableHtml = tableMatch[1];
    } else {
      console.error('Could not find representatives table');
      return representatives;
    }
  }
  
  // Extract all table rows
  const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  for (const row of rows) {
    // Skip header rows (but allow <th> in row if it's a data row)
    if (row.includes('<th scope="col"')) {
      continue;
    }
    
    // Extract table cells (both <th> and <td>)
    const cells = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    if (cells.length < 2) continue;
    
    // First cell (usually <th>) contains district (format: "Alabama 1", "California 12", etc.)
    const districtCell = cells[0];
    
    // Extract state and district from district cell
    // Format can be "Alabama 1" or "Alabama&#160;1" or link text
    let state = '';
    let district = '';
    
    // Try to extract from link text first
    const districtLinkMatch = districtCell.match(/<a[^>]*>([^<]+)<\/a>/);
    if (districtLinkMatch) {
      const districtText = districtLinkMatch[1].replace(/&#160;/g, ' ').trim();
      // Match "StateName 1" or "StateName At-large"
      const match = districtText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+|At-large|at-large)$/i);
      if (match) {
        state = match[1];
        district = match[2];
      }
    }
    
    // If not found, try to extract from data-sort-value
    if (!state) {
      const sortValueMatch = districtCell.match(/data-sort-value="([^"]+)"/);
      if (sortValueMatch) {
        const sortValue = sortValueMatch[1];
        // Format might be "Alabama01" or "Alabama 1"
        const match = sortValue.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(\d+|At-large)$/i);
        if (match) {
          state = match[1];
          district = match[2];
        }
      }
    }
    
    if (!state) continue;
    
    // Second cell should contain member name with link
    const memberCell = cells[1];
    const nameLinkMatch = memberCell.match(/<a[^>]*href="\/wiki\/([^"]+)"[^>]*(?:title="([^"]+)")?[^>]*>([^<]+)<\/a>/);
    if (!nameLinkMatch) continue;
    
    const wikiPath = nameLinkMatch[1];
    const wikiTitle = nameLinkMatch[2] || nameLinkMatch[3];
    const nameText = nameLinkMatch[3];
    
    // Skip if not a person page
    if (!wikiPath.includes('_') || 
        wikiPath.includes('List_of') || 
        wikiPath.includes('Category:') ||
        wikiPath.includes('File:') ||
        wikiPath.includes('Template:')) {
      continue;
    }
    
    // Skip if we've seen this URL
    if (seen.has(wikiPath)) continue;
    seen.add(wikiPath);
    
    const name = normalizeName(nameText.trim());
    if (!name || name.split(' ').length < 2) continue;
    
    // Extract party from cells (usually 3rd or 4th cell)
    let party = 'Unknown';
    for (let i = 2; i < Math.min(cells.length, 5); i++) {
      const cellText = cells[i];
      if (cellText.match(/Republican|R(?![a-z])/i)) {
        party = 'Republican';
        break;
      } else if (cellText.match(/Democratic|D(?![a-z])/i)) {
        party = 'Democratic';
        break;
      } else if (cellText.match(/Independent|I(?![a-z])/i)) {
        party = 'Independent';
        break;
      }
    }
    
    // Extract start date if available (usually in "Assumed office" column)
    let startDate: string | null = null;
    const dateMatch = extractDate(row);
    if (dateMatch) {
      startDate = dateMatch;
    }
    
    representatives.push({
      name,
      state,
      district: district || 'At-large',
      party,
      wikipedia_url: `https://en.wikipedia.org/wiki/${wikiPath}`,
      wikipedia_title: decodeURIComponent(wikiTitle.replace(/_/g, ' ')),
      position_start_date: startDate || undefined,
    });
  }
  
  return representatives;
}

async function fetchWikipediaPage(): Promise<string> {
  const response = await fetch('https://en.wikipedia.org/wiki/List_of_current_United_States_representatives');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.text();
}

async function main() {
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  
  console.log('📊 US House Representatives Import Script');
  console.log('========================================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');
  
  if (!pbAdminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }
  
  // Fetch Wikipedia page
  let html: string;
  try {
    html = await fetchWikipediaPage();
    console.log('✅ Fetched Wikipedia page');
  } catch (error: any) {
    console.error('❌ Failed to fetch Wikipedia page:', error.message);
    process.exit(1);
  }
  
  // Parse representatives
  const representatives = parseWikipediaTable(html);
  console.log(`📄 Found ${representatives.length} representatives`);
  console.log('');
  
  if (representatives.length === 0) {
    console.error('❌ No representatives found. Check parsing logic.');
    process.exit(1);
  }
  
  // Connect to PocketBase
  const pb = new PocketBase(pbUrl);
  
  try {
    await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
    console.log('✅ Authenticated as admin');
    console.log('');
    
    // Delete existing representatives to avoid duplicates
    console.log('🗑️  Removing existing representatives...');
    const existingReps = await pb.collection('politicians').getFullList({
      filter: `current_position="U.S. Representative"`,
    });
    
    for (const rep of existingReps) {
      await pb.collection('politicians').delete(rep.id);
    }
    console.log(`   Deleted ${existingReps.length} existing representatives`);
    console.log('');
    
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: Array<{ name: string; error: string }> = [];
    
    // Import representatives
    for (let i = 0; i < representatives.length; i++) {
      const rep = representatives[i];
      
      try {
        const slug = normalizeSlug(`${rep.name}-${rep.state}-${rep.district}`);
        
        // Check if exists
        try {
          const existing = await pb.collection('politicians').getFirstListItem(
            `slug="${slug}"`
          );
          
          // Update existing
          await pb.collection('politicians').update(existing.id, {
            name: rep.name,
            state: rep.state,
            current_position: 'U.S. Representative',
            political_party: rep.party,
            wikipedia_url: rep.wikipedia_url || null,
            wikipedia_title: rep.wikipedia_title || null,
            position_start_date: rep.position_start_date || null,
          });
          
          updatedCount++;
          if ((i + 1) % 50 === 0) {
            console.log(`[${i + 1}/${representatives.length}] Updated: ${rep.name} (${rep.state})`);
          }
        } catch {
          // Create new
          await pb.collection('politicians').create({
            name: rep.name,
            slug: slug,
            state: rep.state,
            current_position: 'U.S. Representative',
            political_party: rep.party,
            wikipedia_url: rep.wikipedia_url || null,
            wikipedia_title: rep.wikipedia_title || null,
            position_start_date: rep.position_start_date || null,
          });
          
          createdCount++;
          if ((i + 1) % 50 === 0) {
            console.log(`[${i + 1}/${representatives.length}] Created: ${rep.name} (${rep.state})`);
          }
        }
      } catch (err: any) {
        errorCount++;
        const errorMsg = err?.message || 'Unknown error';
        errors.push({ name: rep.name, error: errorMsg });
        if (errors.length <= 10) {
          console.log(`❌ Error importing ${rep.name}: ${errorMsg}`);
        }
      }
    }
    
    console.log('');
    console.log('📊 Summary:');
    console.log(`✅ Created: ${createdCount}`);
    console.log(`🔄 Updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log('');
      console.log('Errors:');
      errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
    } else if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
    
  } catch (authErr: any) {
    console.error('❌ Failed to authenticate with PocketBase:', authErr?.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Import complete!');
}

main().catch(console.error);
