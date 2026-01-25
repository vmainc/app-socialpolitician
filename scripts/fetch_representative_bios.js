#!/usr/bin/env node

/**
 * Fetch and store representative bios from Wikipedia
 * Uses Wikipedia API to extract article content (plain text, ~500 words)
 * Focuses on intro paragraphs and current role information
 */

import PocketBase from 'pocketbase';
import fetch from 'node-fetch';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin';

const pb = new PocketBase(PB_URL);

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 seconds between requests

async function rateLimitedFetch(url) {
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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (error) {
    return null;
  }
}

async function authenticate() {
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
  } catch (error) {
    console.error('❌ Auth failed:', error.message);
    process.exit(1);
  }
}

function sanitizeName(name) {
  // Remove common suffixes and clean up
  return name
    .replace(/\s+Jr\.?$/i, '')
    .replace(/\s+Sr\.?$/i, '')
    .replace(/\s+III$/i, '')
    .replace(/\s+II$/i, '')
    .replace(/\s+I$/i, '')
    .trim();
}

async function fetchWikipediaBio(representativeName, wikipediaUrl) {
  try {
    let pageName;
    
    // If we have a Wikipedia URL, extract the page name from it
    if (wikipediaUrl) {
      const match = wikipediaUrl.match(/\/wiki\/(.+)$/);
      if (match) {
        pageName = decodeURIComponent(match[1]);
      }
    }
    
    // Fallback: generate from name
    if (!pageName) {
      const cleanName = sanitizeName(representativeName).replace(/[(),]/g, '');
      pageName = encodeURIComponent(cleanName);
    } else {
      pageName = encodeURIComponent(pageName);
    }
    
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${pageName}&prop=extracts&explaintext=true&exlimit=1&format=json`;
    
    const response = await rateLimitedFetch(url);
    if (!response) return null;
    
    const data = await response.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    
    const page = Object.values(pages)[0];
    if (!page.extract) return null;
    
    // Take first ~500 words
    const words = page.extract.split(/\s+/);
    const summary = words.slice(0, 550).join(' ');
    
    // Add ellipsis if truncated
    const finalBio = summary.length > 100 ? summary + (words.length > 550 ? '...' : '') : null;
    
    return finalBio;
  } catch (error) {
    return null;
  }
}

async function updateRepresentativeBio(representativeId, bio) {
  try {
    if (!bio || bio.trim().length < 50) {
      return false;
    }
    await pb.collection('politicians').update(representativeId, { bio: bio.trim() });
    return true;
  } catch (error) {
    console.error(`   Error updating: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('📖 Fetching Representative Bios from Wikipedia\n');
  
  await authenticate();
  
  // Get all current representatives (exclude previous/former)
  const representatives = await pb.collection('politicians').getFullList({
    filter: `office_type="representative" && current_position!~"Previous" && current_position!~"Former"`,
    requestKey: null,
  });
  
  console.log(`📊 ${representatives.length} representatives\n`);
  
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  
  for (let i = 0; i < representatives.length; i++) {
    const rep = representatives[i];
    
    // Skip if already has a bio
    if (rep.bio && rep.bio.trim().length > 50) {
      process.stdout.write(`[${i+1}/${representatives.length}] ${rep.name}... ⏭️  (has bio)\n`);
      skipped++;
      continue;
    }
    
    process.stdout.write(`[${i+1}/${representatives.length}] ${rep.name}... `);
    
    const bio = await fetchWikipediaBio(rep.name, rep.wikipedia_url);
    
    if (!bio) {
      console.log('⚠️  (no bio found)');
      failed++;
      continue;
    }
    
    const success = await updateRepresentativeBio(rep.id, bio);
    console.log(success ? '✅' : '❌');
    if (success) updated++;
  }
  
  console.log(`\n✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped} (already have bios)`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${representatives.length}\n`);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
