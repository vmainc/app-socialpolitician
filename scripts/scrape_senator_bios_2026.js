#!/usr/bin/env node

/**
 * Scrape Wikipedia bios for all senators
 * Summarize to 500 words, focused on 2026 activities
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   node scripts/scrape_senator_bios_2026.js
 */

import PocketBase from 'pocketbase';
import fetch from 'node-fetch';

// Configuration
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin';

const pb = new PocketBase(PB_URL);

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

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
      if (retries > 0) {
        const backoffTime = 2000 * (4 - retries);
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

async function authenticate() {
  console.log('🔐 Authenticating with PocketBase...');
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
}

async function getWikipediaContent(senatorName, wikipediaUrl) {
  try {
    if (!wikipediaUrl) {
      return null;
    }
    
    // Extract page title from URL
    const match = wikipediaUrl.match(/\/wiki\/([^/]+)$/);
    if (!match) return null;
    
    const pageTitle = decodeURIComponent(match[1]);
    
    // Fetch from Wikipedia API
    const url = `https://en.wikipedia.org/api/rest_v1/page/extract/${pageTitle}`;
    const response = await rateLimitedFetch(url);
    const data = await response.json();
    
    return data.extract || null;
  } catch (error) {
    console.log(`   ⚠️  Failed to fetch Wikipedia: ${error.message}`);
    return null;
  }
}

/**
 * Extract 2026-relevant content from Wikipedia text
 * Focus on: current positions, recent activities, upcoming elections/roles
 */
function extract2026Content(fullText, senatorName) {
  if (!fullText) return null;
  
  const lines = fullText.split('\n').filter(line => line.trim().length > 0);
  
  // Keywords indicating 2026-relevant content
  const keywords2026 = [
    '2026', '2025', 'election', 're-election', 'current',
    'serve', 'committee', 'ranking', 'chair', 'leadership',
    'proposed', 'legislation', 'bill', 'vote', 'recently',
    'controversies', 'investigation', 'political positions'
  ];
  
  // Extract relevant paragraphs
  let relevant = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (keywords2026.some(kw => lower.includes(kw))) {
      relevant.push(line);
    }
  }
  
  // If we didn't find enough 2026 content, take the first few paragraphs anyway
  if (relevant.length < 3) {
    relevant = lines.slice(0, 6);
  }
  
  return relevant.join('\n');
}

/**
 * Summarize text to approximately 500 words
 */
function summarizeTo500Words(text) {
  if (!text) return null;
  
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length <= 500) {
    return text;
  }
  
  // Split into sentences and take until ~500 words
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let summary = '';
  let wordCount = 0;
  
  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;
    if (wordCount + sentenceWords > 550) break; // Stop near 500
    
    summary += sentence;
    wordCount += sentenceWords;
  }
  
  return summary.trim() || text.substring(0, 500);
}

async function updateSenatorBio(senatorId, senatorName, bio) {
  try {
    if (!bio || bio.trim().length === 0) {
      return false;
    }
    
    await pb.collection('politicians').update(senatorId, {
      bio: bio,
    });
    
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to update: ${error.message}`);
    return false;
  }
}

async function scrapeSenatorBios() {
  console.log('📖 Scraping Senator Bios (2026 Focus)');
  console.log('=====================================\n');
  
  try {
    // Get all senators from PocketBase
    const senators = await pb.collection('politicians').getFullList({
      filter: `office_type="senator"`,
      requestKey: null,
    });
    
    console.log(`📊 Found ${senators.length} senators\n`);
    
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const senator of senators) {
      console.log(`${senator.name}`);
      
      if (!senator.wikipedia_url) {
        console.log(`   ⚠️  No Wikipedia URL`);
        skipped++;
        continue;
      }
      
      // Fetch Wikipedia content
      const fullContent = await getWikipediaContent(senator.name, senator.wikipedia_url);
      
      if (!fullContent) {
        console.log(`   ⚠️  No content fetched`);
        failed++;
        continue;
      }
      
      // Extract 2026-relevant content
      const relevant2026 = extract2026Content(fullContent, senator.name);
      
      // Summarize to 500 words
      const summary = summarizeTo500Words(relevant2026);
      
      const wordCount = summary.split(/\s+/).length;
      console.log(`   📝 Summary: ~${wordCount} words`);
      
      // Update PocketBase
      const success = await updateSenatorBio(senator.id, senator.name, summary);
      
      if (success) {
        console.log(`   ✅ Updated`);
        updated++;
      } else {
        failed++;
      }
      
      console.log();
    }
    
    console.log('\n' + '='.repeat(40));
    console.log(`✅ Updated: ${updated}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${senators.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function main() {
  await authenticate();
  await scrapeSenatorBios();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
