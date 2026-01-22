/**
 * Import current US Senators from senate.gov
 * 
 * Source: https://www.senate.gov/senators/
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/importSenatorsFromSenateGov.ts
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

interface SenatorData {
  name: string;
  slug: string;
  state: string;
  political_party: string;
  current_position: string;
  website_url: string | null;
  // Additional fields that might be available
  senate_class?: string;
  office_room?: string;
  phone?: string;
}

function normalizeName(name: string): string {
  // Convert "Last, First" to "First Last"
  const commaIndex = name.indexOf(',');
  if (commaIndex > 0) {
    const last = name.substring(0, commaIndex).trim();
    const first = name.substring(commaIndex + 1).trim();
    return `${first} ${last}`;
  }
  return name.trim();
}

function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeParty(party: string): string {
  const partyLower = party.toLowerCase();
  if (partyLower.includes('democrat')) return 'Democrat';
  if (partyLower.includes('republican')) return 'Republican';
  if (partyLower.includes('independent')) return 'Independent';
  return party;
}

function normalizeState(state: string): string {
  // Return state abbreviation if it's already an abbreviation, otherwise return as-is
  // The Senate website uses full state names, so we'll keep them
  return state.trim();
}

// Parse HTML table from Senate website
function parseSenateTable(html: string): SenatorData[] {
  const senators: SenatorData[] = [];
  
  // Extract table rows - look for the senators table
  // Pattern: <tr> with links to senator websites
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRegex) || [];
  
  for (const row of rows) {
    // Extract senator name and link
    const nameLinkMatch = row.match(/<a[^>]*href="([^"]*senate\.gov[^"]*)"[^>]*>([^<]+)<\/a>/i);
    if (!nameLinkMatch) continue;
    
    const websiteUrl = nameLinkMatch[1].startsWith('http') 
      ? nameLinkMatch[1] 
      : `https://www.senate.gov${nameLinkMatch[1]}`;
    const rawName = nameLinkMatch[2].trim();
    const normalizedName = normalizeName(rawName);
    
    // Extract state
    const stateMatch = row.match(/<td[^>]*>([^<]+)<\/td>/gi);
    if (!stateMatch || stateMatch.length < 2) continue;
    
    // Parse table cells - typically: Name (with link), State, Party, Class, Office, Phone
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      const cellContent = cellMatch[1]
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .trim();
      if (cellContent) cells.push(cellContent);
    }
    
    // Expected structure: [Name (with link), State, Party, Class, Office, Phone]
    if (cells.length < 3) continue;
    
    const state = normalizeState(cells[1] || '');
    const party = normalizeParty(cells[2] || '');
    const senateClass = cells[3] || '';
    const officeRoom = cells[4] || '';
    const phone = cells[5] || '';
    
    if (!normalizedName || !state || !party) continue;
    
    senators.push({
      name: normalizedName,
      slug: normalizeSlug(normalizedName),
      state: state,
      political_party: party,
      current_position: 'U.S. Senator',
      website_url: websiteUrl,
      senate_class: senateClass || undefined,
      office_room: officeRoom || undefined,
      phone: phone || undefined,
    });
  }
  
  return senators;
}

async function fetchSenatorsFromSenateGov(): Promise<SenatorData[]> {
  console.log('📡 Fetching senators from senate.gov...');
  
  try {
    const response = await fetch('https://www.senate.gov/senators/');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    console.log(`✅ Fetched HTML (${html.length} bytes)`);
    
    const senators = parseSenateTable(html);
    console.log(`✅ Parsed ${senators.length} senators`);
    
    return senators;
  } catch (error: any) {
    console.error('❌ Error fetching from senate.gov:', error.message);
    throw error;
  }
}

async function main() {
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  
  console.log('📊 US Senators Import Script');
  console.log('==========================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');
  
  if (!pbAdminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }
  
  // Fetch senators from Senate website
  let senators: SenatorData[];
  try {
    senators = await fetchSenatorsFromSenateGov();
  } catch (error: any) {
    console.error('❌ Failed to fetch senators:', error.message);
    process.exit(1);
  }
  
  if (senators.length === 0) {
    console.error('❌ No senators found');
    process.exit(1);
  }
  
  console.log(`📄 Found ${senators.length} senators`);
  console.log('');
  
  // Save normalized JSON
  const outputDir = path.join(projectRoot, 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const jsonPath = path.join(outputDir, 'senators_import_ready.json');
  fs.writeFileSync(jsonPath, JSON.stringify(senators, null, 2));
  console.log(`💾 Saved normalized data to: ${jsonPath}`);
  console.log('');
  
  // Import to PocketBase
  console.log('🔄 Importing to PocketBase...');
  
  const pb = new PocketBase(pbUrl);
  
  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errors: Array<{ name: string; error: string }> = [];
  
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
    console.log('✅ Authenticated as admin');
    
    // Import each senator
    for (const senator of senators) {
      try {
        // Try to find existing by name and state (more reliable than slug)
        // First try by slug
        let existing = null;
        try {
          existing = await pb.collection('politicians').getFirstListItem(`slug="${senator.slug}"`, {});
        } catch (slugErr: any) {
          if (slugErr?.status === 404) {
            // Try to find by name and state
            try {
              const results = await pb.collection('politicians').getList(1, 1, {
                filter: `state="${senator.state}" && current_position="U.S. Senator"`,
              });
              // Check if any match by name (case-insensitive)
              const match = results.items.find(item => 
                item.name.toLowerCase().replace(/,/g, '').includes(senator.name.toLowerCase().replace(/,/g, '')) ||
                senator.name.toLowerCase().replace(/,/g, '').includes(item.name.toLowerCase().replace(/,/g, ''))
              );
              if (match) existing = match;
            } catch (nameErr: any) {
              // No match found
            }
          }
        }
        
        if (existing) {
          // Update existing
          await pb.collection('politicians').update(existing.id, {
            name: senator.name,
            slug: senator.slug,
            state: senator.state,
            political_party: senator.political_party,
            current_position: senator.current_position,
            website_url: senator.website_url,
          });
          updatedCount++;
        } else {
          // Not found, create new
          await pb.collection('politicians').create({
            name: senator.name,
            slug: senator.slug,
            state: senator.state,
            political_party: senator.political_party,
            current_position: senator.current_position,
            website_url: senator.website_url,
          });
          createdCount++;
        }
      } catch (err: any) {
        errorCount++;
        errors.push({ name: senator.name, error: err?.message || 'Unknown error' });
      }
    }
    
    console.log(`✅ Created: ${createdCount}`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('');
      console.log('Errors:');
      errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
    }
  } catch (authErr: any) {
    console.error('❌ Failed to authenticate with PocketBase:', authErr?.message);
    process.exit(1);
  }
  
  // Generate report
  const reportDir = path.join(projectRoot, 'docs');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, 'SENATORS_IMPORT_REPORT.md');
  const report = `# US Senators Import Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Senators**: ${senators.length}
- **Created**: ${createdCount}
- **Updated**: ${updatedCount}
- **Errors**: ${errorCount}

## Party Distribution

${Array.from(new Set(senators.map(s => s.political_party))).map(party => {
  const count = senators.filter(s => s.political_party === party).length;
  return `- **${party}**: ${count}`;
}).join('\n')}

## State Distribution

${Array.from(new Set(senators.map(s => s.state))).sort().map(state => {
  const count = senators.filter(s => s.state === state).length;
  return `- **${state}**: ${count}`;
}).join('\n')}

## Sample Records (First 10)

\`\`\`json
${JSON.stringify(senators.slice(0, 10), null, 2)}
\`\`\`

## Errors

${errors.length > 0 ? errors.map(e => `- **${e.name}**: ${e.error}`).join('\n') : 'None'}

## Source

Data imported from: https://www.senate.gov/senators/
`;
  
  fs.writeFileSync(reportPath, report);
  console.log(`📝 Generated report: ${reportPath}`);
  
  console.log('');
  console.log('✅ Import complete!');
}

main().catch(console.error);
