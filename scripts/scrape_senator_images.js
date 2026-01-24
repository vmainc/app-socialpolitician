#!/usr/bin/env node
/**
 * Scrape current senator images from Wikipedia
 * 
 * Downloads portraits from:
 * https://en.wikipedia.org/wiki/List_of_current_United_States_senators
 * 
 * Saves images to portraits/senators/ directory
 * 
 * Usage:
 *   node scripts/scrape_senator_images.js
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Directories
const PORTRAITS_DIR = path.join(projectRoot, 'portraits');
const SENATORS_DIR = path.join(PORTRAITS_DIR, 'senators');
const INDEX_FILE = path.join(SENATORS_DIR, 'index.json');

// Ensure directories exist
if (!fs.existsSync(SENATORS_DIR)) {
  fs.mkdirSync(SENATORS_DIR, { recursive: true });
}

// Rate limiting with exponential backoff for 429 errors
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between image requests
let retryCount = 0;

async function rateLimitedFetch(url, retries = 3) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
  
  try {
    const response = await fetch(url);
    
    if (response.status === 429) {
      // Rate limited - exponential backoff
      if (retries > 0) {
        const backoffTime = 2000 * (4 - retries); // 2s, 4s, 6s
        console.log(`   ⏳ Rate limited, retrying after ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return rateLimitedFetch(url, retries - 1);
      } else {
        throw new Error(`HTTP 429: Rate limited (max retries exceeded)`);
      }
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    throw error;
  }
}

async function downloadImage(url, filename) {
  try {
    const response = await rateLimitedFetch(url);
    const buffer = await response.arrayBuffer();
    const filepath = path.join(SENATORS_DIR, filename);
    
    fs.writeFileSync(filepath, Buffer.from(buffer));
    console.log(`   ✅ Downloaded: ${filename}`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to download ${filename}: ${error.message}`);
    return false;
  }
}

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 100);
}

async function scrapeSenatorImages() {
  console.log('🇺🇸 Scraping Senator Images from Wikipedia');
  console.log('==========================================\n');
  
  try {
    // Fetch the Wikipedia page
    console.log('📥 Fetching Wikipedia page...');
    const response = await rateLimitedFetch(
      'https://en.wikipedia.org/wiki/List_of_current_United_States_senators'
    );
    const html = await response.text();
    
    const senators = [];
    
    // Find table rows with senator data
    // Pattern: Each row has <td> with image, then <th> with senator name and state
    // We parse them in pairs
    
    // First, find the main table section that has "Portrait" header
    const tableStart = html.indexOf('<th>Portrait');
    if (tableStart === -1) {
      console.error('❌ Could not find senator table');
      return;
    }
    
    // Get a large section from the table start
    const tableSection = html.substring(tableStart, tableStart + 500000); // Large chunk
    
    // Find all td/th pairs
    // Pattern: <td>...<img src="..." .../></td> followed by <th>...senator name...</th>
    
    const imageRegex = /<td[^>]*>[\s\S]*?src="([^"]+)"[\s\S]*?<\/td>\s*<th[^>]*>[\s\S]*?<a[^>]*title="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    
    let match;
    let count = 0;
    
    while ((match = imageRegex.exec(tableSection)) !== null) {
      count++;
      
      let imageUrl = match[1];
      const title = match[2];
      const displayName = match[3];
      
      // Fix protocol-relative URLs
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }
      
      // Get high-res version by replacing /120px- with /250px-
      imageUrl = imageUrl.replace(/\/\d+px-/, '/250px-');
      
      senators.push({
        name: displayName.trim(),
        title: title.trim(),
        imageUrl: imageUrl
      });
    }
    
    console.log(`📊 Found ${senators.length} senators with images\n`);
    
    if (senators.length === 0) {
      console.error('❌ No senators found');
      return;
    }
    
    // Download images
    console.log(`🖼️  Downloading ${senators.length} images...\n`);
    
    let downloaded = 0;
    let failed = 0;
    const index = [];
    
    for (const senator of senators) {
      // Generate filename from the image URL
      const urlMatch = senator.imageUrl.match(/\/([^/]+\.jpg|[^/]+\.png)$/i);
      let filename;
      
      if (urlMatch) {
        // Use original filename from wiki but make it safe
        filename = sanitizeFilename(urlMatch[1].split('/').pop());
      } else {
        // Fallback: use name + title
        filename = `${sanitizeFilename(senator.name)}.jpg`;
      }
      
      console.log(`${senator.name}`);
      console.log(`   Title: ${senator.title}`);
      console.log(`   URL: ${senator.imageUrl}`);
      
      const success = await downloadImage(senator.imageUrl, filename);
      
      if (success) {
        downloaded++;
        index.push({
          name: senator.name,
          title: senator.title,
          filename: filename,
          imageUrl: senator.imageUrl,
          downloadedAt: new Date().toISOString()
        });
      } else {
        failed++;
      }
      
      console.log();
    }
    
    // Save index
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    
    console.log('==========================================');
    console.log(`✅ Download Complete!`);
    console.log(`   Downloaded: ${downloaded}/${senators.length} images`);
    console.log(`   Failed: ${failed} images`);
    console.log(`   Saved to: ${SENATORS_DIR}`);
    console.log(`   Index: ${INDEX_FILE}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
scrapeSenatorImages().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
