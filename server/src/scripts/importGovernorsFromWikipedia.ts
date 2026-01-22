/**
 * Import current US Governors from Wikipedia
 * 
 * Source: https://en.wikipedia.org/wiki/List_of_current_United_States_governors
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/importGovernorsFromWikipedia.ts
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

interface GovernorData {
  name: string;
  slug: string;
  state: string;
  political_party: string;
  current_position: string;
  wikipedia_url: string | null;
  website_url?: string | null;
  position_start_date?: string | null;
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
  // Return state name as-is (Wikipedia uses full state names)
  return state.trim();
}

function extractDate(text: string): string | null {
  // Common date patterns
  const patterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let dateStr = match[0];
        const monthMap: Record<string, string> = {
          'january': '01', 'february': '02', 'march': '03', 'april': '04',
          'may': '05', 'june': '06', 'july': '07', 'august': '08',
          'september': '09', 'october': '10', 'november': '11', 'december': '12'
        };
        
        if (match[1] && monthMap[match[1].toLowerCase()]) {
          const month = monthMap[match[1].toLowerCase()];
          const day = match[2].padStart(2, '0');
          const year = match[3];
          dateStr = `${year}-${month}-${day}`;
        } else if (match[2] && monthMap[match[2].toLowerCase()]) {
          const day = match[1].padStart(2, '0');
          const month = monthMap[match[2].toLowerCase()];
          const year = match[3];
          dateStr = `${year}-${month}-${day}`;
        } else if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const month = parts[0].padStart(2, '0');
            const day = parts[1].padStart(2, '0');
            const year = parts[2];
            dateStr = `${year}-${month}-${day}`;
          }
        }
        
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          if (year >= 1950 && year <= new Date().getFullYear() + 1) {
            return dateStr.split('T')[0];
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }
  
  return null;
}

// Parse Wikipedia table for governors
function parseWikipediaTable(html: string): GovernorData[] {
  const governors: GovernorData[] = [];
  
  // Find the state governors table (has caption "Current state governors")
  const tableMatch = html.match(/<table[^>]*class="wikitable[^"]*"[\s\S]*?caption[^>]*>Current state governors[\s\S]*?<\/table>/i);
  if (!tableMatch) {
    console.log('⚠️  Could not find state governors table');
    return governors;
  }
  
  const mainTable = tableMatch[0];
  
  // Extract rows
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = mainTable.match(rowRegex) || [];
  
  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Extract cells
    const cells: string[] = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(cellMatch[1]); // Keep HTML for now to extract links
    }
    
    if (cells.length < 3) continue;
    
    // Column structure: State, Image, Governor, Party, ...
    // Extract state from first cell
    const stateCell = cells[0] || '';
    const stateText = stateCell.replace(/<[^>]+>/g, '').trim();
    
    // Extract governor name and Wikipedia link from third cell (Governor column)
    const governorCell = cells[2] || '';
    const nameLinkMatch = governorCell.match(/<a[^>]*href="(\/wiki\/[^"]+)"[^>]*(?:title="([^"]+)")?[^>]*>([^<]+)<\/a>/i);
    if (!nameLinkMatch) continue;
    
    const wikipediaPath = nameLinkMatch[1];
    const wikipediaUrl = `https://en.wikipedia.org${wikipediaPath}`;
    const rawName = nameLinkMatch[3].trim();
    const name = normalizeName(rawName);
    
    // Skip if name looks like a state name
    const stateNames = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
      'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
      'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
      'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
      'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey',
      'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma',
      'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
      'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
      'west virginia', 'wisconsin', 'wyoming'];
    
    if (stateNames.includes(name.toLowerCase())) {
      continue;
    }
    
    // Extract party from party column (usually 4th or 5th cell)
    let party = '';
    for (let j = 3; j < Math.min(cells.length, 6); j++) {
      const cellText = cells[j].toLowerCase();
      if (cellText.includes('republican')) {
        party = 'Republican';
        break;
      } else if (cellText.includes('democrat')) {
        party = 'Democrat';
        break;
      } else if (cellText.includes('independent')) {
        party = 'Independent';
        break;
      }
    }
    
    // Extract date from row (look for dates in any cell)
    let startDate: string | null = null;
    for (const cell of cells) {
      const date = extractDate(cell);
      if (date) {
        startDate = date;
        break;
      }
    }
    
    // Clean up state name (remove "(list)" or other suffixes)
    let state = stateText.split('(')[0].trim();
    
    if (!name || !state || name.length < 3) continue;
    
    governors.push({
      name: name,
      slug: normalizeSlug(name),
      state: normalizeState(state),
      political_party: party,
      current_position: 'Governor',
      wikipedia_url: wikipediaUrl,
      position_start_date: startDate,
    });
  }
  
  return governors;
}

async function fetchGovernorsFromWikipedia(): Promise<GovernorData[]> {
  console.log('📡 Fetching governors from Wikipedia...');
  
  try {
    const response = await fetch('https://en.wikipedia.org/wiki/List_of_current_United_States_governors');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    console.log(`✅ Fetched HTML (${html.length} bytes)`);
    
    const governors = parseWikipediaTable(html);
    console.log(`✅ Parsed ${governors.length} governors from Wikipedia`);
    
    return governors;
  } catch (error: any) {
    console.error('❌ Error fetching from Wikipedia:', error.message);
    throw error;
  }
}

async function main() {
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  
  console.log('📊 US Governors Import Script');
  console.log('==========================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');
  
  if (!pbAdminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }
  
  // Fetch governors from Wikipedia
  let governors: GovernorData[];
  try {
    governors = await fetchGovernorsFromWikipedia();
  } catch (error: any) {
    console.error('❌ Failed to fetch governors:', error.message);
    process.exit(1);
  }
  
  if (governors.length === 0) {
    console.error('❌ No governors found');
    process.exit(1);
  }
  
  console.log(`📄 Found ${governors.length} governors`);
  console.log('');
  
  // Save normalized JSON
  const outputDir = path.join(projectRoot, 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const jsonPath = path.join(outputDir, 'governors_import_ready.json');
  fs.writeFileSync(jsonPath, JSON.stringify(governors, null, 2));
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
    
    // Import each governor
    for (const governor of governors) {
      try {
        // Try to find existing by slug or name+state
        let existing = null;
        try {
          existing = await pb.collection('politicians').getFirstListItem(`slug="${governor.slug}"`, {});
        } catch (slugErr: any) {
          if (slugErr?.status === 404) {
            // Try by name and state
            try {
              const results = await pb.collection('politicians').getList(1, 1, {
                filter: `state="${governor.state}" && current_position="Governor"`,
              });
              const match = results.items.find(item => 
                item.name.toLowerCase().replace(/[^a-z\s]/g, '').includes(governor.name.toLowerCase().replace(/[^a-z\s]/g, '')) ||
                governor.name.toLowerCase().replace(/[^a-z\s]/g, '').includes(item.name.toLowerCase().replace(/[^a-z\s]/g, ''))
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
            name: governor.name,
            slug: governor.slug,
            state: governor.state,
            political_party: governor.political_party,
            current_position: governor.current_position,
            wikipedia_url: governor.wikipedia_url,
            position_start_date: governor.position_start_date || undefined,
          });
          updatedCount++;
        } else {
          // Create new
          await pb.collection('politicians').create({
            name: governor.name,
            slug: governor.slug,
            state: governor.state,
            political_party: governor.political_party,
            current_position: governor.current_position,
            wikipedia_url: governor.wikipedia_url,
            position_start_date: governor.position_start_date || undefined,
          });
          createdCount++;
        }
      } catch (err: any) {
        errorCount++;
        errors.push({ name: governor.name, error: err?.message || 'Unknown error' });
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
  
  const reportPath = path.join(reportDir, 'GOVERNORS_IMPORT_REPORT.md');
  const report = `# US Governors Import Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Governors**: ${governors.length}
- **Created**: ${createdCount}
- **Updated**: ${updatedCount}
- **Errors**: ${errorCount}

## Party Distribution

${Array.from(new Set(governors.map(g => g.political_party))).map(party => {
  const count = governors.filter(g => g.political_party === party).length;
  return `- **${party}**: ${count}`;
}).join('\n')}

## Sample Records (First 10)

\`\`\`json
${JSON.stringify(governors.slice(0, 10), null, 2)}
\`\`\`

## Errors

${errors.length > 0 ? errors.map(e => `- **${e.name}**: ${e.error}`).join('\n') : 'None'}

## Source

Data imported from: https://en.wikipedia.org/wiki/List_of_current_United_States_governors
`;
  
  fs.writeFileSync(reportPath, report);
  console.log(`📝 Generated report: ${reportPath}`);
  
  console.log('');
  console.log('✅ Import complete!');
}

main().catch(console.error);
