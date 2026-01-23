/**
 * Enrich politicians with data from Wikipedia using MediaWiki API
 * 
 * Fetches: district (for reps), website_url, social media links
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/enrichPoliticiansFromWikipedia.ts
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

// Progress tracking
const PROGRESS_FILE = path.join(projectRoot, 'tmp', 'enrich_progress.json');
const RESULTS_FILE = path.join(projectRoot, 'tmp', 'enrich_results.json');

interface EnrichmentProgress {
  lastProcessedId: string | null;
  processedCount: number;
  updatedCount: number;
  errorCount: number;
  startTime: string;
}

interface EnrichmentResult {
  id: string;
  name: string;
  slug: string;
  updatedFields: string[];
  success: boolean;
  error?: string;
}

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second baseline
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

// Wikipedia API base URL
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';

/**
 * Rate-limited fetch with exponential backoff
 */
async function rateLimitedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Wait for minimum interval
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  let retries = 3;
  let backoff = 1000;
  
  while (retries > 0) {
    try {
      lastRequestTime = Date.now();
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'SocialPoliticianApp/1.0 (https://app.socialpolitician.com)',
          ...options.headers,
        },
      });
      
      if (response.status === 429 || response.status === 503) {
        // Rate limited - exponential backoff with jitter
        const jitter = Math.random() * 1000;
        const waitTime = backoff + jitter;
        console.log(`   ⏳ Rate limited (${response.status}), waiting ${Math.round(waitTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        backoff *= 2;
        retries--;
        continue;
      }
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      consecutiveErrors = 0;
      return response;
    } catch (error) {
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(`Too many consecutive errors. Last: ${error}`);
      }
      
      retries--;
      if (retries > 0) {
        const jitter = Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, backoff + jitter));
        backoff *= 2;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Failed after retries');
}

/**
 * Get Wikipedia page content via MediaWiki API
 */
async function getWikipediaPageContent(title: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: title,
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      origin: '*',
    });
    
    const url = `${WIKIPEDIA_API}?${params.toString()}`;
    const response = await rateLimitedFetch(url);
    const data = await response.json();
    
    if (data.query?.pages) {
      const page = Object.values(data.query.pages)[0] as any;
      if (page.revisions?.[0]?.slots?.main?.content) {
        return page.revisions[0].slots.main.content;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`   ❌ Error fetching Wikipedia content: ${error}`);
    return null;
  }
}

/**
 * Get Wikipedia page HTML via MediaWiki API (parse action)
 */
async function getWikipediaPageHTML(title: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: 'parse',
      format: 'json',
      page: title,
      prop: 'text',
      origin: '*',
    });
    
    const url = `${WIKIPEDIA_API}?${params.toString()}`;
    const response = await rateLimitedFetch(url);
    const data = await response.json();
    
    if (data.parse?.text?.['*']) {
      return data.parse.text['*'];
    }
    
    return null;
  } catch (error) {
    console.error(`   ❌ Error fetching Wikipedia HTML: ${error}`);
    return null;
  }
}

/**
 * Extract district from Wikipedia infobox or list
 */
function extractDistrict(html: string, name: string, state: string): string | null {
  // Try infobox first
  const infoboxMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (infoboxMatch) {
    const infobox = infoboxMatch[1];
    
    // Look for district field
    const districtPatterns = [
      /district[^<]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>/i,
      /district[^<]*>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i,
    ];
    
    for (const pattern of districtPatterns) {
      const match = infobox.match(pattern);
      if (match) {
        const district = match[1].trim();
        if (district && district !== 'N/A' && district !== '—') {
          return district;
        }
      }
    }
  }
  
  // Fallback: try to find in "List of current United States representatives" table
  // This would require fetching that page separately, but for now we'll skip
  // and rely on the infobox
  
  return null;
}

/**
 * Extract website URL from Wikipedia
 */
function extractWebsite(html: string): string | null {
  // Look in infobox
  const infoboxMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (infoboxMatch) {
    const infobox = infoboxMatch[1];
    
    // Look for website field
    const websitePatterns = [
      /website[^<]*>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>/i,
      /official\s+website[^<]*>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>/i,
    ];
    
    for (const pattern of websitePatterns) {
      const match = infobox.match(pattern);
      if (match) {
        let url = match[1].trim();
        if (url && !url.startsWith('http')) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          } else if (url.startsWith('/')) {
            url = `https://en.wikipedia.org${url}`;
          } else {
            url = `https://${url}`;
          }
        }
        if (url && url.startsWith('http')) {
          return url;
        }
      }
    }
  }
  
  // Look in external links section
  const extLinksMatch = html.match(/<h2[^>]*>[\s\S]*?External\s+links[\s\S]*?<\/h2>([\s\S]*?)(?:<h2|<div)/i);
  if (extLinksMatch) {
    const extLinks = extLinksMatch[1];
    const officialSiteMatch = extLinks.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?official[\s\S]*?website/i);
    if (officialSiteMatch) {
      return officialSiteMatch[1];
    }
  }
  
  return null;
}

/**
 * Extract social media links from Wikipedia
 */
function extractSocialLinks(html: string): {
  x_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  truth_social_url?: string | null;
  linkedin_url?: string | null;
} {
  const links: any = {};
  
  // Normalize HTML
  const normalizedHtml = html
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Patterns for each platform
  const patterns = {
    x_url: [
      /(?:href|data-href)=["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"'\s<>]+)/gi,
    ],
    facebook_url: [
      /(?:href|data-href)=["'](https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com)\/[^"'\s<>]+)/gi,
    ],
    instagram_url: [
      /(?:href|data-href)=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s<>]+)/gi,
    ],
    youtube_url: [
      /(?:href|data-href)=["'](https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^"'\s<>]+)/gi,
    ],
    tiktok_url: [
      /(?:href|data-href)=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"'\s<>]+)/gi,
    ],
    truth_social_url: [
      /(?:href|data-href)=["'](https?:\/\/(?:www\.)?truthsocial\.com\/[^"'\s<>]+)/gi,
    ],
    linkedin_url: [
      /(?:href|data-href)=["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"'\s<>]+)/gi,
    ],
  };
  
  for (const [field, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const matches = normalizedHtml.matchAll(regex);
      for (const match of matches) {
        let url = match[1];
        if (url && url.startsWith('http')) {
          // Normalize X/Twitter URLs
          if (field === 'x_url' && url.includes('twitter.com')) {
            url = url.replace('twitter.com', 'x.com');
          }
          links[field] = url;
          break; // Take first match
        }
      }
      if (links[field]) break;
    }
  }
  
  return links;
}

/**
 * Get Wikipedia title from URL
 */
function getWikipediaTitle(wikipediaUrl: string | null | undefined): string | null {
  if (!wikipediaUrl) return null;
  
  const match = wikipediaUrl.match(/\/wiki\/(.+)$/);
  if (match) {
    return decodeURIComponent(match[1].replace(/_/g, ' '));
  }
  
  return null;
}

/**
 * Enrich a single politician record
 */
async function enrichPolitician(record: any): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    id: record.id,
    name: record.name,
    slug: record.slug,
    updatedFields: [],
    success: false,
  };
  
  try {
    // Get Wikipedia title
    const wikiTitle = getWikipediaTitle(record.wikipedia_url);
    if (!wikiTitle) {
      result.error = 'No Wikipedia URL';
      return result;
    }
    
    // Fetch Wikipedia page HTML
    const html = await getWikipediaPageHTML(wikiTitle);
    if (!html) {
      result.error = 'Could not fetch Wikipedia page';
      return result;
    }
    
    // Extract data
    const updates: any = {};
    
    // District (for representatives)
    if (record.office_type === 'representative' && !record.district) {
      const district = extractDistrict(html, record.name, record.state || '');
      if (district) {
        updates.district = district;
        result.updatedFields.push('district');
      }
    }
    
    // Website
    if (!record.website_url) {
      const website = extractWebsite(html);
      if (website) {
        updates.website_url = website;
        result.updatedFields.push('website_url');
      }
    }
    
    // Social links
    const socialLinks = extractSocialLinks(html);
    for (const [field, value] of Object.entries(socialLinks)) {
      if (value && !record[field]) {
        updates[field] = value;
        result.updatedFields.push(field);
      }
    }
    
    // Update PocketBase if we have changes
    if (Object.keys(updates).length > 0) {
      await pb.collection('politicians').update(record.id, updates);
      result.success = true;
    } else {
      result.success = true; // No updates needed, but no error
    }
    
  } catch (error: any) {
    result.error = error.message || String(error);
    result.success = false;
  }
  
  return result;
}

/**
 * Load progress from file
 */
function loadProgress(): EnrichmentProgress {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    } catch (error) {
      console.log('⚠️  Could not load progress file, starting fresh');
    }
  }
  
  return {
    lastProcessedId: null,
    processedCount: 0,
    updatedCount: 0,
    errorCount: 0,
    startTime: new Date().toISOString(),
  };
}

/**
 * Save progress to file
 */
function saveProgress(progress: EnrichmentProgress) {
  const dir = path.dirname(PROGRESS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Load results from file
 */
function loadResults(): EnrichmentResult[] {
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    } catch (error) {
      // Ignore
    }
  }
  return [];
}

/**
 * Save results to file
 */
function saveResults(results: EnrichmentResult[]) {
  const dir = path.dirname(RESULTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const officeTypeArg = args.find(arg => arg.startsWith('--office-type='));
  const officeType = officeTypeArg ? officeTypeArg.split('=')[1] : null;
  
  console.log('🔄 Enriching Politicians from Wikipedia');
  console.log('=======================================');
  if (officeType) {
    console.log(`   Filtering by office_type: ${officeType}`);
  }
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
  
  // Load progress
  const progress = loadProgress();
  const results = loadResults();
  
  console.log(`📊 Progress: ${progress.processedCount} processed, ${progress.updatedCount} updated, ${progress.errorCount} errors`);
  console.log('');
  
  // Fetch politicians
  console.log('📥 Fetching politicians from PocketBase...');
  let allRecords: any[] = [];
  let page = 1;
  const perPage = 500;
  
  while (true) {
    try {
      let filter = '';
      if (officeType) {
        filter = `office_type="${officeType}"`;
      }
      
      const response = await pb.collection('politicians').getList(page, perPage, {
        sort: 'id',
        filter: filter || undefined,
      });
      
      allRecords.push(...response.items);
      
      if (response.items.length < perPage) {
        break;
      }
      
      page++;
    } catch (error: any) {
      console.error(`❌ Error fetching records: ${error.message}`);
      break;
    }
  }
  
  console.log(`✅ Found ${allRecords.length} politicians${officeType ? ` (${officeType}s)` : ''}`);
  console.log('');
  
  // Filter records that need enrichment
  const recordsToEnrich = allRecords.filter(record => {
    // Skip if already processed (resume support)
    if (progress.lastProcessedId && record.id <= progress.lastProcessedId) {
      return false;
    }
    
    // Only process if missing key fields
    const needsEnrichment = 
      (record.office_type === 'representative' && !record.district) ||
      !record.website_url ||
      !record.x_url ||
      !record.facebook_url ||
      !record.instagram_url;
    
    return needsEnrichment && record.wikipedia_url;
  });
  
  console.log(`📋 ${recordsToEnrich.length} records need enrichment`);
  console.log('');
  
  // Process records
  let processed = 0;
  for (const record of recordsToEnrich) {
    processed++;
    console.log(`[${processed}/${recordsToEnrich.length}] Processing: ${record.name} (${record.slug})`);
    
    const result = await enrichPolitician(record);
    results.push(result);
    
    progress.processedCount++;
    progress.lastProcessedId = record.id;
    
    if (result.success && result.updatedFields.length > 0) {
      progress.updatedCount++;
      console.log(`   ✅ Updated: ${result.updatedFields.join(', ')}`);
    } else if (result.error) {
      progress.errorCount++;
      console.log(`   ❌ Error: ${result.error}`);
    } else {
      console.log(`   ⏭️  No updates needed`);
    }
    
    // Save progress every 10 records
    if (processed % 10 === 0) {
      saveProgress(progress);
      saveResults(results);
      console.log(`   💾 Progress saved`);
    }
    
    // Small delay between records
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Final save
  saveProgress(progress);
  saveResults(results);
  
  console.log('');
  console.log('=======================================');
  console.log('✅ Enrichment complete!');
  console.log(`   Processed: ${progress.processedCount}`);
  console.log(`   Updated: ${progress.updatedCount}`);
  console.log(`   Errors: ${progress.errorCount}`);
  console.log(`   Results saved to: ${RESULTS_FILE}`);
  console.log('');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
