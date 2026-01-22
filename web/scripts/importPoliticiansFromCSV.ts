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
  office_type: 'senator' | 'representative' | 'governor' | 'other';
  state?: string | null;
  political_party?: string | null;
  current_position?: string | null;
  politician_rank?: number | null;
  bio?: string | null;
  wikipedia_URL?: string | null;
  official_website?: string | null;
  facebook?: string | null;
  twitter_url?: string | null;
  instagram?: string | null;
  youtube_url?: string | null;
  youtube_channel_id?: string | null;
  truth_social_url?: string | null;
  tiktok_url?: string | null;
  rss_feed?: string | null;
  profile_picture?: string | null;
  last_updated?: string | null;
  social_media_verification_date?: string | null;
  data_notes?: string | null;
  sources?: string[] | null;
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length !== headers.length) continue;
    
    const row: CSVRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
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
  
  const politician: PoliticianData = {
    name: title,
    slug: slug,
    office_type: deriveOfficeType(categories, permalink),
    state: extractState(categories),
    political_party: normalizeText(row['political_party'] || row['Political Party'] || row['Party']),
    current_position: normalizeText(row['current_position'] || row['Current Position'] || row['Position']),
    politician_rank: normalizeNumber(row['politician_rank'] || row['Rank'] || row['rank']),
    bio: normalizeText(row['bio'] || row['Bio'] || row['Description'] || row['description']),
    wikipedia_URL: normalizeUrl(row['wikipedia_URL'] || row['Wikipedia URL'] || row['wikipedia']),
    official_website: normalizeUrl(row['official_website'] || row['Official Website'] || row['Website']),
    facebook: normalizeUrl(row['facebook'] || row['Facebook'] || row['facebook_url']),
    twitter_url: normalizeUrl(row['twitter_url'] || row['Twitter URL'] || row['Twitter'] || row['twitter']),
    instagram: normalizeUrl(row['instagram'] || row['Instagram'] || row['instagram_url']),
    youtube_url: normalizeUrl(row['youtube_url'] || row['YouTube URL'] || row['YouTube'] || row['youtube']),
    youtube_channel_id: normalizeText(row['youtube_channel_id'] || row['YouTube Channel ID']),
    truth_social_url: normalizeUrl(row['truth_social_url'] || row['Truth Social URL'] || row['Truth Social']),
    tiktok_url: normalizeUrl(row['tiktok_url'] || row['TikTok URL'] || row['TikTok'] || row['tiktok']),
    rss_feed: normalizeUrl(row['rss_feed'] || row['RSS Feed'] || row['RSS']),
    profile_picture: normalizeUrl(row['profile_picture'] || row['Profile Picture'] || row['Image URL'] || row['image_url'] || row['Featured Image']),
    last_updated: normalizeDate(row['last_updated'] || row['Last Updated'] || row['Modified']),
    social_media_verification_date: normalizeDate(row['social_media_verification_date'] || row['Social Media Verification Date']),
    data_notes: normalizeText(row['data_notes'] || row['Data Notes'] || row['Notes']),
    sources: null, // Will be populated if sources field exists
  };
  
  // Handle sources as JSON array if present
  if (row['sources'] || row['Sources']) {
    try {
      const sourcesStr = row['sources'] || row['Sources'];
      const parsed = JSON.parse(sourcesStr);
      if (Array.isArray(parsed)) {
        politician.sources = parsed.filter((s): s is string => typeof s === 'string');
      }
    } catch {
      // If not JSON, treat as comma-separated
      const sourcesStr = row['sources'] || row['Sources'] || '';
      if (sourcesStr.trim()) {
        politician.sources = sourcesStr.split(',').map(s => s.trim()).filter(s => s);
      }
    }
  }
  
  return politician;
}

async function main() {
  const csvPath = process.env.CSV_PATH || '/mnt/data/Social-Politician-Data.csv';
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
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

## Office Type Distribution

${['senator', 'representative', 'governor', 'other'].map(type => {
  const count = politicians.filter(p => p.office_type === type).length;
  return `- **${type}**: ${count}`;
}).join('\n')}

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
