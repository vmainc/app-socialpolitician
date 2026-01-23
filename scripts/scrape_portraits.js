#!/usr/bin/env node
/**
 * Scrape politician portraits from Wikipedia
 * 
 * Downloads portraits to portraits/to-label/ directory
 * Uses MediaWiki API to get page images
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   node scripts/scrape_portraits.js [--use-labeled] [--limit=N]
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

// Directories
const PORTRAITS_DIR = path.join(projectRoot, 'portraits');
const TO_LABEL_DIR = path.join(PORTRAITS_DIR, 'to-label');
const LABELED_DIR = path.join(PORTRAITS_DIR, 'labeled');
const INDEX_FILE = path.join(PORTRAITS_DIR, 'index.json');

// Wikipedia API
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

// Parse args
const args = process.argv.slice(2);
const useLabeled = args.includes('--use-labeled');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

/**
 * Rate-limited fetch
 */
async function rateLimitedFetch(url, options = {}) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'SocialPoliticianApp/1.0 (https://app.socialpolitician.com)',
      ...options.headers,
    },
  });
  
  if (response.status === 429 || response.status === 503) {
    const waitTime = 5000 + Math.random() * 5000;
    console.log(`   ⏳ Rate limited, waiting ${Math.round(waitTime)}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return rateLimitedFetch(url, options);
  }
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response;
}

/**
 * Get Wikipedia page image via MediaWiki API
 */
async function getWikipediaPageImage(title) {
  try {
    // First, get page info with images
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: title,
      prop: 'pageimages',
      piprop: 'original',
      origin: '*',
    });
    
    const url = `${WIKIPEDIA_API}?${params.toString()}`;
    const response = await rateLimitedFetch(url);
    const data = await response.json();
    
    if (data.query?.pages) {
      const page = Object.values(data.query.pages)[0];
      if (page.original?.source) {
        return page.original.source;
      }
    }
    
    // Fallback: try to get thumbnail
    const thumbParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: title,
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: '1000',
      origin: '*',
    });
    
    const thumbUrl = `${WIKIPEDIA_API}?${thumbParams.toString()}`;
    const thumbResponse = await rateLimitedFetch(thumbUrl);
    const thumbData = await thumbResponse.json();
    
    if (thumbData.query?.pages) {
      const page = Object.values(thumbData.query.pages)[0];
      if (page.thumbnail?.source) {
        // Replace thumbnail size with original
        return page.thumbnail.source.replace(/\/\d+px-/, '/');
      }
    }
    
    return null;
  } catch (error) {
    console.error(`   ❌ Error fetching image: ${error.message}`);
    return null;
  }
}

/**
 * Download image from URL
 */
async function downloadImage(url, filepath) {
  try {
    const response = await rateLimitedFetch(url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    return true;
  } catch (error) {
    console.error(`   ❌ Error downloading image: ${error.message}`);
    return false;
  }
}

/**
 * Get Wikipedia title from URL
 */
function getWikipediaTitle(wikipediaUrl) {
  if (!wikipediaUrl) return null;
  
  const match = wikipediaUrl.match(/\/wiki\/(.+)$/);
  if (match) {
    return decodeURIComponent(match[1].replace(/_/g, ' '));
  }
  
  return null;
}

/**
 * Load index
 */
function loadIndex() {
  if (fs.existsSync(INDEX_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    } catch (error) {
      // Ignore
    }
  }
  return {};
}

/**
 * Save index
 */
function saveIndex(index) {
  const dir = path.dirname(INDEX_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

/**
 * Main function
 */
async function main() {
  console.log('🖼️  Scraping Portraits from Wikipedia');
  console.log('=====================================');
  console.log('');
  
  if (!adminEmail || !adminPassword) {
    console.error('❌ ERROR: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
    process.exit(1);
  }
  
  // Authenticate
  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated with PocketBase');
  } catch (error) {
    console.error(`❌ Authentication failed: ${error.message}`);
    process.exit(1);
  }
  
  // Create directories
  if (!fs.existsSync(TO_LABEL_DIR)) {
    fs.mkdirSync(TO_LABEL_DIR, { recursive: true });
  }
  if (!fs.existsSync(LABELED_DIR)) {
    fs.mkdirSync(LABELED_DIR, { recursive: true });
  }
  
  // Load index
  const index = loadIndex();
  
  // Fetch politicians without photos
  console.log('📥 Fetching politicians from PocketBase...');
  let allRecords = [];
  let page = 1;
  const perPage = 500;
  
  while (true) {
    try {
      const response = await pb.collection('politicians').getList(page, perPage, {
        sort: 'id',
        filter: 'photo = "" || photo = null',
      });
      
      allRecords.push(...response.items);
      
      if (response.items.length < perPage) {
        break;
      }
      
      page++;
    } catch (error) {
      console.error(`❌ Error fetching records: ${error.message}`);
      break;
    }
  }
  
  console.log(`✅ Found ${allRecords.length} politicians without photos`);
  console.log('');
  
  // Filter to those with Wikipedia URLs
  const recordsToProcess = allRecords.filter(r => r.wikipedia_url);
  
  if (limit) {
    recordsToProcess.splice(limit);
    console.log(`📋 Limiting to ${limit} records`);
  }
  
  console.log(`📋 Processing ${recordsToProcess.length} records`);
  console.log('');
  
  let downloaded = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < recordsToProcess.length; i++) {
    const record = recordsToProcess[i];
    console.log(`[${i + 1}/${recordsToProcess.length}] ${record.name} (${record.slug})`);
    
    // Check if already downloaded
    const existingEntry = index[record.id];
    if (existingEntry && fs.existsSync(existingEntry.filepath)) {
      console.log(`   ⏭️  Already downloaded: ${existingEntry.filepath}`);
      skipped++;
      continue;
    }
    
    // Get Wikipedia title
    const wikiTitle = getWikipediaTitle(record.wikipedia_url);
    if (!wikiTitle) {
      console.log(`   ⚠️  No Wikipedia title found`);
      errors++;
      continue;
    }
    
    // Get image URL
    console.log(`   🔍 Fetching image for: ${wikiTitle}`);
    const imageUrl = await getWikipediaPageImage(wikiTitle);
    
    if (!imageUrl) {
      console.log(`   ⚠️  No image found on Wikipedia page`);
      errors++;
      continue;
    }
    
    // Determine file extension
    const ext = imageUrl.match(/\.(jpg|jpeg|png|webp)$/i)?.[1]?.toLowerCase() || 'jpg';
    const filename = `${record.slug}_${record.id}.${ext}`;
    const targetDir = useLabeled ? LABELED_DIR : TO_LABEL_DIR;
    const filepath = path.join(targetDir, filename);
    
    // Download image
    console.log(`   📥 Downloading: ${imageUrl}`);
    const success = await downloadImage(imageUrl, filepath);
    
    if (success) {
      // Update index
      index[record.id] = {
        recordId: record.id,
        slug: record.slug,
        name: record.name,
        filepath: filepath,
        wikipedia_url: record.wikipedia_url,
        wikipedia_title: wikiTitle,
        image_url: imageUrl,
        status: useLabeled ? 'labeled' : 'to-label',
        downloaded_at: new Date().toISOString(),
      };
      
      downloaded++;
      console.log(`   ✅ Saved: ${filepath}`);
    } else {
      errors++;
    }
    
    // Save index every 10 records
    if ((i + 1) % 10 === 0) {
      saveIndex(index);
      console.log(`   💾 Index saved`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Final save
  saveIndex(index);
  
  console.log('');
  console.log('=====================================');
  console.log('✅ Portrait scraping complete!');
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Index saved to: ${INDEX_FILE}`);
  console.log('');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
