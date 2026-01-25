#!/usr/bin/env node

/**
 * Fetch and store senator bios from Wikipedia
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
const MIN_REQUEST_INTERVAL = 1500;

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
  return name
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .trim();
}

async function fetchWikipediaBio(senatorName) {
  try {
    const cleanName = sanitizeName(senatorName).replace(/[(),]/g, '');
    const pageName = encodeURIComponent(cleanName);
    
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${pageName}&prop=extracts&explaintext=true&exlimit=1&format=json`;
    
    const response = await rateLimitedFetch(url);
    if (!response) return null;
    
    const data = await response.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    
    const page = Object.values(pages)[0];
    if (!page.extract) return null;
    
    // Take first 500 words
    const words = page.extract.split(/\s+/);
    const summary = words.slice(0, 550).join(' ');
    
    return summary.length > 100 ? summary : null;
  } catch (error) {
    return null;
  }
}

async function updateSenatorBio(senatorId, bio) {
  try {
    if (!bio || bio.trim().length < 100) return false;
    await pb.collection('politicians').update(senatorId, { bio });
    return true;
  } catch (error) {
    console.error(`   ❌ Update failed: ${error.message}`);
    if (error.message.includes('field') || error.message.includes('schema')) {
      console.error(`   ⚠️  Bio field may not exist in PocketBase schema!`);
    }
    return false;
  }
}

async function main() {
  console.log('📖 Fetching Senator Bios from Wikipedia\n');
  
  await authenticate();
  
  const senators = await pb.collection('politicians').getFullList({
    filter: `office_type="senator"`,
    requestKey: null,
  });
  
  console.log(`📊 ${senators.length} senators\n`);
  
  let updated = 0;
  for (let i = 0; i < senators.length; i++) {
    const s = senators[i];
    process.stdout.write(`[${i+1}/${senators.length}] ${s.name}... `);
    
    const bio = await fetchWikipediaBio(s.name);
    
    if (!bio) {
      console.log('⚠️');
      continue;
    }
    
    const success = await updateSenatorBio(s.id, bio);
    console.log(success ? '✅' : '❌');
    if (success) updated++;
  }
  
  console.log(`\n✅ Updated: ${updated}/${senators.length}`);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
