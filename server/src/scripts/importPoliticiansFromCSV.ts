/**
 * Import politicians from WordPress CSV export
 * 
 * Usage:
 *   CSV_PATH=/mnt/data/Social-Politician-Data.csv \
 *   POCKETBASE_URL=http://127.0.0.1:8090 \
 *   POCKETBASE_ADMIN_EMAIL=admin@example.com \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/importPoliticiansFromCSV.ts
 * 
 * Outputs:
 *   - data/politicians_import_ready.json (normalized data)
 *   - docs/IMPORT_REPORT.md (import report)
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

interface CSVRow {
  [key: string]: string;
}

interface PoliticianData {
  name: string;
  slug: string;
  state?: string | null;
  political_party?: string | null;
  current_position?: string | null;
  position_start_date?: string | null;
  website_url?: string | null;
  wikipedia_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  tiktok_url?: string | null;
  truth_social_url?: string | null;
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Use proper CSV parsing that handles quoted fields with commas
  const rows: CSVRow[] = [];
  const linesArray = content.split('\n');
  
  // Parse header
  const headerLine = linesArray[0];
  const headers: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(currentField.trim().replace(/^"|"$/g, ''));
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField) headers.push(currentField.trim().replace(/^"|"$/g, ''));
  
  // Parse rows
  for (let i = 1; i < linesArray.length; i++) {
    const line = linesArray[i];
    if (!line.trim()) continue;
    
    const values: string[] = [];
    currentField = '';
    inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentField.trim().replace(/^"|"$/g, ''));
        currentField = '';
      } else {
        currentField += char;
      }
    }
    if (currentField) values.push(currentField.trim().replace(/^"|"$/g, ''));
    
    if (values.length === headers.length) {
      const row: CSVRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
  }
  
  return rows;
}

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function deriveOfficeType(categories: string, permalink?: string): 'senator' | 'representative' | 'governor' | 'other' {
  const catLower = (categories || '').toLowerCase();
  const permalinkLower = (permalink || '').toLowerCase();
  const combined = `${catLower} ${permalinkLower}`;
  
  if (combined.includes('senator') || combined.includes('/senators/')) {
    return 'senator';
  }
  if (combined.includes('representative') || combined.includes('/representatives/')) {
    return 'representative';
  }
  if (combined.includes('governor') || combined.includes('/us-governors/')) {
    return 'governor';
  }
  return 'other';
}

function extractState(categories: string): string | null {
  // US states list (abbreviations and full names)
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
    'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
  ];
  
  const catLower = (categories || '').toLowerCase();
  for (const state of states) {
    if (catLower.includes(state.toLowerCase())) {
      return state;
    }
  }
  return null;
}

function extractPartyFromCategories(categories: string): string | null {
  const catLower = (categories || '').toLowerCase();
  
  // Common party patterns
  if (catLower.includes('democrat') || catLower.includes('democratic')) {
    return 'Democrat';
  }
  if (catLower.includes('republican')) {
    return 'Republican';
  }
  if (catLower.includes('independent')) {
    return 'Independent';
  }
  if (catLower.includes('green')) {
    return 'Green';
  }
  if (catLower.includes('libertarian')) {
    return 'Libertarian';
  }
  
  return null;
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  return null;
}

function normalizeText(text: string | null | undefined): string | null {
  if (!text || !text.trim()) return null;
  return text.trim();
}

function normalizeParty(party: string | null | undefined): string | null {
  if (!party || !party.trim()) return null;
  const trimmed = party.trim();
  
  // If it's a URL, it's not a party - return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('www.')) {
    return null;
  }
  
  // Normalize common party names
  const partyLower = trimmed.toLowerCase();
  if (partyLower.includes('democrat')) return 'Democrat';
  if (partyLower.includes('republican')) return 'Republican';
  if (partyLower.includes('independent')) return 'Independent';
  if (partyLower.includes('green')) return 'Green';
  if (partyLower.includes('libertarian')) return 'Libertarian';
  
  return trimmed; // Return as-is if it's a valid party name
}

function normalizeNumber(value: string | null | undefined): number | null {
  if (!value || !value.trim()) return null;
  const num = parseInt(value.trim(), 10);
  return isNaN(num) ? null : num;
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  // Try to parse common date formats
  const date = new Date(value.trim());
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function processRow(row: CSVRow): PoliticianData | null {
  const title = normalizeText(row['Title'] || row['title'] || row['Name'] || row['name']);
  const slugRaw = row['Slug'] || row['slug'] || row['Permalink'] || row['permalink'] || '';
  const slug = normalizeSlug(slugRaw);
  
  if (!title || !slug) {
    return null; // Skip rows without required fields
  }
  
  const categories = row['Categories'] || row['categories'] || '';
  const permalink = row['Permalink'] || row['permalink'] || '';
  
  // Get party from CSV fields first
  const rawParty = row['political_party'] || row['Political Party'] || row['Party'] || '';
  let politicalParty = normalizeParty(rawParty);
  
  // If party is null (URL or invalid), try extracting from categories
  if (!politicalParty) {
    politicalParty = extractPartyFromCategories(categories);
  }
  
  // Fallback: try to derive party from name (for historical presidents with corrupted CSV data)
  if (!politicalParty && title) {
    const nameLower = title.toLowerCase();
    // Historical party mappings for presidents with corrupted CSV data
    if (nameLower.includes('william henry harrison')) {
      politicalParty = 'Whig'; // Historical fact
    } else if (nameLower.includes('jimmy carter') || (nameLower.includes('carter') && nameLower.includes('jimmy'))) {
      politicalParty = 'Democrat'; // Historical fact - CSV has URL but categories show Democrat
    }
  }
  
  const politician: PoliticianData = {
    name: title,
    slug: slug,
    state: extractState(categories),
    political_party: politicalParty,
    current_position: normalizeText(row['current_position'] || row['Current Position'] || row['Position']),
    position_start_date: normalizeDate(row['position_start_date'] || row['Position Start Date'] || row['Start Date']),
    website_url: normalizeUrl(row['official_website'] || row['Official Website'] || row['Website'] || row['website_url']),
    wikipedia_url: normalizeUrl(row['wikipedia_URL'] || row['wikipedia_url'] || row['Wikipedia URL'] || row['wikipedia']),
    facebook_url: normalizeUrl(row['facebook'] || row['Facebook'] || row['facebook_url'] || row['Facebook URL']),
    youtube_url: normalizeUrl(row['youtube_url'] || row['YouTube URL'] || row['YouTube'] || row['youtube']),
    instagram_url: normalizeUrl(row['instagram'] || row['Instagram'] || row['instagram_url'] || row['Instagram URL']),
    x_url: normalizeUrl(row['twitter_url'] || row['Twitter URL'] || row['Twitter'] || row['twitter'] || row['x_url'] || row['X URL']),
    linkedin_url: normalizeUrl(row['linkedin'] || row['LinkedIn'] || row['linkedin_url'] || row['LinkedIn URL']),
    tiktok_url: normalizeUrl(row['tiktok_url'] || row['TikTok URL'] || row['TikTok'] || row['tiktok']),
    truth_social_url: normalizeUrl(row['truth_social_url'] || row['Truth Social URL'] || row['Truth Social']),
  };
  
  return politician;
}

async function main() {
  const csvPath = process.env.CSV_PATH || path.join(projectRoot, 'Social-Politician-Data.csv');
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
  
  console.log('📊 Politician Import Script');
  console.log('==========================');
  console.log(`CSV Path: ${csvPath}`);
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');
  
  // Read CSV
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    console.error('   Set CSV_PATH environment variable to the CSV file path');
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const csvRows = parseCSV(csvContent);
  console.log(`📄 Read ${csvRows.length} rows from CSV`);
  
  // Process rows
  const politicians: PoliticianData[] = [];
  const skipped: Array<{ row: number; reason: string }> = [];
  
  csvRows.forEach((row, idx) => {
    const politician = processRow(row);
    if (politician) {
      politicians.push(politician);
    } else {
      skipped.push({ row: idx + 2, reason: 'Missing name or slug' });
    }
  });
  
  console.log(`✅ Processed ${politicians.length} valid politicians`);
  console.log(`⚠️  Skipped ${skipped.length} rows`);
  
  // Save normalized JSON
  const outputDir = path.join(projectRoot, 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const jsonPath = path.join(outputDir, 'politicians_import_ready.json');
  fs.writeFileSync(jsonPath, JSON.stringify(politicians, null, 2));
  console.log(`💾 Saved normalized data to: ${jsonPath}`);
  
  // Import to PocketBase if credentials provided
  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errors: Array<{ slug: string; error: string }> = [];
  
  if (pbAdminEmail && pbAdminPassword) {
    console.log('');
    console.log('🔄 Importing to PocketBase...');
    
    const pb = new PocketBase(pbUrl);
    
    try {
      // Authenticate as admin
      await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
      console.log('✅ Authenticated as admin');
      
      // Import each politician
      for (const politician of politicians) {
        try {
          // Check if exists by slug
          const existing = await pb.collection('politicians').getFirstListItem(`slug="${politician.slug}"`, {});
          
          // Update existing
          await pb.collection('politicians').update(existing.id, politician);
          updatedCount++;
        } catch (err: any) {
          if (err?.status === 404) {
            // Not found, create new
            try {
              await pb.collection('politicians').create(politician);
              createdCount++;
            } catch (createErr: any) {
              errorCount++;
              errors.push({ slug: politician.slug, error: createErr?.message || 'Unknown error' });
            }
          } else {
            errorCount++;
            errors.push({ slug: politician.slug, error: err?.message || 'Unknown error' });
          }
        }
      }
      
      console.log(`✅ Created: ${createdCount}`);
      console.log(`✅ Updated: ${updatedCount}`);
      console.log(`❌ Errors: ${errorCount}`);
    } catch (authErr: any) {
      console.error('❌ Failed to authenticate with PocketBase:', authErr?.message);
      console.error('   Continuing without import...');
    }
  } else {
    console.log('');
    console.log('ℹ️  PocketBase credentials not provided');
    console.log('   Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD to import');
    console.log('   Normalized JSON saved for manual import');
  }
  
  // Generate report
  const reportDir = path.join(projectRoot, 'docs');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, 'IMPORT_REPORT.md');
  const report = `# Politician Import Report

Generated: ${new Date().toISOString()}

## Summary

- **Total CSV Rows**: ${csvRows.length}
- **Valid Politicians**: ${politicians.length}
- **Skipped Rows**: ${skipped.length}
- **Created**: ${createdCount}
- **Updated**: ${updatedCount}
- **Errors**: ${errorCount}

## State Distribution

${Array.from(new Set(politicians.map(p => p.state).filter(Boolean))).slice(0, 10).map(state => {
  const count = politicians.filter(p => p.state === state).length;
  return `- **${state}**: ${count}`;
}).join('\n')}
${Array.from(new Set(politicians.map(p => p.state).filter(Boolean))).length > 10 ? `\n... and ${Array.from(new Set(politicians.map(p => p.state).filter(Boolean))).length - 10} more states` : ''}

## Sample Records (First 5)

\`\`\`json
${JSON.stringify(politicians.slice(0, 5), null, 2)}
\`\`\`

## Skipped Rows

${skipped.length > 0 ? skipped.slice(0, 10).map(s => `- Row ${s.row}: ${s.reason}`).join('\n') : 'None'}

${skipped.length > 10 ? `\n... and ${skipped.length - 10} more` : ''}

## Errors

${errors.length > 0 ? errors.map(e => `- **${e.slug}**: ${e.error}`).join('\n') : 'None'}

## Next Steps

1. Review normalized data in \`data/politicians_import_ready.json\`
2. If import failed, manually import via PocketBase Admin UI
3. Verify data in PocketBase collection
4. Test frontend pages with imported data
`;
  
  fs.writeFileSync(reportPath, report);
  console.log(`📝 Generated report: ${reportPath}`);
  
  console.log('');
  console.log('✅ Import complete!');
}

main().catch(console.error);
