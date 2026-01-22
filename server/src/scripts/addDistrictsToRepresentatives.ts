/**
 * Add district information to representatives by re-fetching from Wikipedia
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/addDistrictsToRepresentatives.ts
 */

import PocketBase from 'pocketbase';

async function fetchWikipediaPage(): Promise<string> {
  const response = await fetch('https://en.wikipedia.org/wiki/List_of_current_United_States_representatives');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.text();
}

function parseDistrictsFromWikipedia(html: string): Map<string, string> {
  const districtMap = new Map<string, string>();
  
  // Find the main table
  let tableMatch = html.match(/<table[^>]*id="votingmembers"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    // Try alternative table match
    tableMatch = html.match(/<table[^>]*class="wikitable[^"]*sortable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  }
  if (!tableMatch) return districtMap;
  
  const tableHtml = tableMatch[1];
  const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  for (const row of rows) {
    // Skip header rows
    if (row.includes('<th scope="col"')) continue;
    
    const cells = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    if (cells.length < 2) continue;
    
    // Extract district from first cell (usually <th>)
    const districtCell = cells[0];
    let district = '';
    let state = '';
    
    // Try to extract from link text
    const districtLinkMatch = districtCell.match(/<a[^>]*>([^<]+)<\/a>/);
    if (districtLinkMatch) {
      const districtText = districtLinkMatch[1].replace(/&#160;/g, ' ').replace(/&nbsp;/g, ' ').trim();
      // Format: "Alabama 1" or "California 12" or "At-large"
      const match = districtText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+|At-large|at-large)$/i);
      if (match) {
        state = match[1];
        district = match[2];
      }
    }
    
    // If not found, try data-sort-value
    if (!district) {
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
    
    // Extract name from second cell
    const memberCell = cells[1];
    const nameLinkMatch = memberCell.match(/<a[^>]*href="\/wiki\/([^"]+)"[^>]*(?:title="([^"]+)")?[^>]*>([^<]+)<\/a>/);
    if (!nameLinkMatch) continue;
    
    const wikiPath = nameLinkMatch[1];
    const nameText = nameLinkMatch[3];
    
    // Skip if not a person page
    if (!wikiPath.includes('_') || 
        wikiPath.includes('List_of') || 
        wikiPath.includes('Category:') ||
        wikiPath.includes('File:') ||
        wikiPath.includes('Template:')) {
      continue;
    }
    
    if (nameText && district && state) {
      // Create key from name and state
      const name = nameText.trim().toLowerCase();
      const key = `${name}|${state.toLowerCase()}`;
      districtMap.set(key, district);
    }
  }
  
  return districtMap;
}

async function main() {
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  
  console.log('📊 Add Districts to Representatives Script');
  console.log('===========================================');
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
  
  // Parse districts
  const districtMap = parseDistrictsFromWikipedia(html);
  console.log(`📄 Found ${districtMap.size} district mappings`);
  console.log('');
  
  const pb = new PocketBase(pbUrl);
  
  try {
    await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
    console.log('✅ Authenticated as admin');
    console.log('');
    
    const representatives = await pb.collection('politicians').getFullList({
      filter: `current_position="U.S. Representative"`,
    });
    
    console.log(`📊 Processing ${representatives.length} representatives...`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < representatives.length; i++) {
      const rep = representatives[i];
      
      try {
        // Try to match by name and state
        const nameKey = `${rep.name.toLowerCase()}|${(rep.state || '').toLowerCase()}`;
        const district = districtMap.get(nameKey);
        
        if (district) {
          await pb.collection('politicians').update(rep.id, {
            district: district,
          });
          updatedCount++;
          
          if ((i + 1) % 50 === 0) {
            console.log(`  [${i + 1}/${representatives.length}] Updated: ${rep.name} (District ${district})`);
          }
        } else {
          skippedCount++;
        }
      } catch (err: any) {
        errorCount++;
        if (errorCount <= 10) {
          console.log(`  ❌ Error updating ${rep.name}: ${err?.message || 'Unknown error'}`);
        }
      }
    }
    
    console.log('');
    console.log('📊 Summary:');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
  } catch (authErr: any) {
    console.error('❌ Failed to authenticate with PocketBase:', authErr?.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ District update complete!');
}

main().catch(console.error);
