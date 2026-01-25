#!/usr/bin/env node
/**
 * Scrape current representative images from Wikipedia
 * 
 * Downloads portraits from:
 * https://en.wikipedia.org/wiki/List_of_current_United_States_representatives
 * 
 * Saves images to portraits/representatives/ directory
 * 
 * Usage:
 *   node scripts/scrape_representative_images.js
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
const REPRESENTATIVES_DIR = path.join(PORTRAITS_DIR, 'representatives');
const INDEX_FILE = path.join(REPRESENTATIVES_DIR, 'index.json');

// Ensure directories exist
if (!fs.existsSync(REPRESENTATIVES_DIR)) {
  fs.mkdirSync(REPRESENTATIVES_DIR, { recursive: true });
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
    const filepath = path.join(REPRESENTATIVES_DIR, filename);
    
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

async function scrapeRepresentativeImages() {
  console.log('🇺🇸 Scraping Representative Images from Wikipedia');
  console.log('==================================================\n');
  
  try {
    // Fetch the Wikipedia page
    console.log('📥 Fetching Wikipedia page...');
    const response = await rateLimitedFetch(
      'https://en.wikipedia.org/wiki/List_of_current_United_States_representatives'
    );
    const html = await response.text();
    
    const representatives = [];
    
    // Find the main table with representatives
    // The table has columns: District, Member, Party, Born, Prior experience, Education, Assumed office, Residence
    // Images are in the Member column
    
    // Find the table section - look for "List of representatives" heading
    const tableStart = html.indexOf('List of representatives');
    if (tableStart === -1) {
      console.error('❌ Could not find representatives table');
      return;
    }
    
    // Find the actual table start (look for <table> or <tbody> after the heading)
    let tableSectionStart = html.indexOf('<table', tableStart);
    if (tableSectionStart === -1) {
      tableSectionStart = html.indexOf('<tbody', tableStart);
    }
    if (tableSectionStart === -1) {
      tableSectionStart = tableStart;
    }
    
    // Get a large section from the table start
    const tableSection = html.substring(tableSectionStart, tableSectionStart + 2000000);
    
    // The table structure: Each row has multiple <td> cells
    // Pattern: <td>District</td><td>...<img.../>...<a>Name</a>...</td><td>Party</td>...
    // We need to match rows that have both an image and a name link
    
    // Find all table rows (more precise - look for rows with images)
    const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
    const rows = [];
    let match;
    
    while ((match = rowRegex.exec(tableSection)) !== null) {
      // Only include rows that have an image (likely a representative)
      if (match[0].includes('<img') && match[0].includes('src=')) {
        rows.push(match[0]);
      }
    }
    
    console.log(`📊 Found ${rows.length} table rows with images\n`);
    
    // Parse each row more carefully
    // The representatives table has: District | Member (image + name) | Party | ...
    for (const row of rows) {
      // Skip header rows, empty rows, and rows with <th>
      if (row.includes('<th>') || row.trim().length < 50 || row.includes('_Vacant_')) {
        continue;
      }
      
      // Extract image URL - look for img tag
      const imgMatch = row.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
      if (!imgMatch) {
        continue; // No image in this row
      }
      
      let imageUrl = imgMatch[1];
      
      // Skip non-photo images (seals, flags, etc.)
      if (imageUrl.includes('Seal') || imageUrl.includes('Flag') || 
          imageUrl.includes('Portal') || imageUrl.includes('Template') ||
          imageUrl.includes('.svg')) {
        continue;
      }
      
      // Extract all table cells
      const tdCells = row.match(/<td[^>]*>[\s\S]*?<\/td>/g);
      if (!tdCells || tdCells.length < 2) {
        continue;
      }
      
      // Find the cell with the image (Member column)
      let memberCell = null;
      let district = '';
      
      for (let i = 0; i < tdCells.length; i++) {
        const cell = tdCells[i];
        
        // First cell is usually district
        if (i === 0) {
          const districtMatch = cell.match(/<td[^>]*>([^<]+)<\/td>/);
          if (districtMatch) {
            district = districtMatch[1].trim();
          }
        }
        
        // Find the cell with the image
        if (cell.includes(imgMatch[0])) {
          memberCell = cell;
          break;
        }
      }
      
      if (!memberCell) {
        continue;
      }
      
      // Extract name from the Member cell
      // Look for links, prioritizing those that look like person names
      const allLinks = memberCell.match(/<a[^>]*title="([^"]+)"[^>]*>([^<]+)<\/a>/gi) || [];
      
      let name = null;
      
      // Try to find a link that looks like a person's name
      for (const link of allLinks) {
        const titleMatch = link.match(/title="([^"]+)"/);
        const textMatch = link.match(/>([^<]+)</);
        
        if (!titleMatch || !textMatch) continue;
        
        const title = titleMatch[1].trim();
        const text = textMatch[1].trim();
        
        // Skip district links, portals, templates, etc.
        if (title.includes("'s ") && title.includes("congressional district")) {
          continue;
        }
        if (title.includes("Portal") || title.includes("Template") ||
            title.includes("Seal") || title.includes("Flag")) {
          continue;
        }
        
        // Check if it looks like a person's name
        const nameParts = title.split(' ');
        if (nameParts.length >= 2 && title.length > 5) {
          // Use the display text if available, otherwise use title
          name = (text.length > 3 && !text.includes("'s ")) ? text : title;
          break;
        }
      }
      
      // If no name found, try bold/strong tags
      if (!name || name.length < 3) {
        const boldMatch = memberCell.match(/<b>([^<]+)<\/b>/i) || memberCell.match(/<strong>([^<]+)<\/strong>/i);
        if (boldMatch) {
          const boldText = boldMatch[1].trim();
          if (boldText.split(' ').length >= 2 && boldText.length > 5 &&
              !boldText.includes("'s ") && !boldText.includes("congressional")) {
            name = boldText;
          }
        }
      }
      
      // Final validation
      if (!name || name.length < 3 || 
          name.includes("'s ") || name.includes("congressional") ||
          name.includes("Portal") || name.includes("Template") ||
          name.includes("Seal") || name.includes("Flag")) {
        continue;
      }
      
      // Fix protocol-relative URLs
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }
      
      // Get high-res version by replacing /120px- or /220px- with /250px-
      imageUrl = imageUrl.replace(/\/\d+px-/, '/250px-');
      
      // Skip if already added (duplicate check)
      if (representatives.find(r => r.name === name)) {
        continue;
      }
      
      representatives.push({
        name: name,
        district: district,
        imageUrl: imageUrl
      });
    }
    
    console.log(`📊 Found ${representatives.length} representatives with images\n`);
    
    if (representatives.length === 0) {
      console.error('❌ No representatives found. Table format may have changed.');
      return;
    }
    
    // Download images
    console.log(`🖼️  Downloading ${representatives.length} images...\n`);
    
    // Show first few names for verification
    console.log('📋 Sample of found representatives:');
    representatives.slice(0, 10).forEach((rep, idx) => {
      console.log(`   ${idx + 1}. ${rep.name}${rep.district ? ` (${rep.district})` : ''}`);
    });
    console.log();
    
    let downloaded = 0;
    let failed = 0;
    const index = [];
    
    for (let i = 0; i < representatives.length; i++) {
      const rep = representatives[i];
      
      // Generate filename from the image URL
      const urlMatch = rep.imageUrl.match(/\/([^/]+\.jpg|[^/]+\.png|[^/]+\.webp)$/i);
      let filename;
      
      if (urlMatch) {
        // Use original filename from wiki but make it safe
        filename = sanitizeFilename(urlMatch[1].split('/').pop());
      } else {
        // Fallback: use name
        filename = `${sanitizeFilename(rep.name)}.jpg`;
      }
      
      console.log(`[${i + 1}/${representatives.length}] ${rep.name}`);
      if (rep.district) {
        console.log(`   District: ${rep.district}`);
      }
      console.log(`   URL: ${rep.imageUrl}`);
      
      const success = await downloadImage(rep.imageUrl, filename);
      
      if (success) {
        downloaded++;
        index.push({
          name: rep.name,
          district: rep.district,
          filename: filename,
          imageUrl: rep.imageUrl,
          downloadedAt: new Date().toISOString()
        });
      } else {
        failed++;
      }
      
      console.log();
    }
    
    // Save index
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    
    console.log('==================================================');
    console.log(`✅ Download Complete!`);
    console.log(`   Downloaded: ${downloaded}/${representatives.length} images`);
    console.log(`   Failed: ${failed} images`);
    console.log(`   Saved to: ${REPRESENTATIVES_DIR}`);
    console.log(`   Index: ${INDEX_FILE}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
scrapeRepresentativeImages().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
