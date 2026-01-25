#!/usr/bin/env node

/**
 * Identify which 4 voting representatives are missing
 * Compares PocketBase with expected 435 count
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'VMAmadmia42O200!';

const pb = new PocketBase(PB_URL);

// Non-voting delegates (these are extra, not part of the 435)
const DELEGATES = [
  'Amata Coleman Radewagen',
  'Eleanor Holmes Norton',
  'James Moylan',
  'Kimberlyn King-Hinds',
  'Pablo Hernández Rivera',
  'Stacey Plaskett',
];

function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function isDelegate(name) {
  const normalized = normalizeName(name);
  return DELEGATES.some(d => normalizeName(d) === normalized);
}

async function identifyMissing() {
  console.log('🔍 Identifying Missing Voting Representatives');
  console.log('============================================\n');
  
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
    
    // Get all representatives from PocketBase
    const pbReps = await pb.collection('politicians').getFullList({
      filter: 'office_type="representative"',
      sort: 'name',
    });
    
    // Filter out delegates
    const pbVoting = pbReps.filter(rep => !isDelegate(rep.name));
    
    console.log(`📊 PocketBase:`);
    console.log(`   Total: ${pbReps.length}`);
    console.log(`   Voting: ${pbVoting.length}`);
    console.log(`   Delegates: ${pbReps.length - pbVoting.length}\n`);
    
    // Get scraped list
    const indexFile = path.join(projectRoot, 'portraits/representatives/index.json');
    if (!fs.existsSync(indexFile)) {
      console.error('❌ Index file not found');
      process.exit(1);
    }
    
    const scraped = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    const scrapedVoting = scraped.filter(rep => !isDelegate(rep.name));
    
    console.log(`📥 Scraped:`);
    console.log(`   Total: ${scraped.length}`);
    console.log(`   Voting: ${scrapedVoting.length}`);
    console.log(`   Delegates: ${scraped.length - scrapedVoting.length}\n`);
    
    // Create normalized name sets
    const pbNames = new Set(pbVoting.map(rep => normalizeName(rep.name)));
    const scrapedNames = new Set(scrapedVoting.map(rep => normalizeName(rep.name)));
    
    // Find what's in PocketBase but not in scraped (these might be the extra 6)
    const inPBButNotScraped = pbVoting.filter(rep => {
      const normalized = normalizeName(rep.name);
      return !scrapedNames.has(normalized);
    });
    
    console.log(`📋 Representatives in PocketBase but NOT in scraped list (${inPBButNotScraped.length}):\n`);
    inPBButNotScraped.forEach((rep, i) => {
      console.log(`   ${i + 1}. ${rep.name}`);
      console.log(`      State: ${rep.state || '(empty)'}`);
      console.log(`      Position: ${rep.current_position || '(empty)'}`);
      console.log(`      ID: ${rep.id}`);
      console.log('');
    });
    
    const expected = 435;
    const actual = pbVoting.length;
    const difference = expected - actual;
    
    console.log(`\n🎯 Summary:`);
    console.log(`   Expected: ${expected} voting representatives`);
    console.log(`   Actual: ${actual} voting representatives in PocketBase`);
    console.log(`   Difference: ${difference > 0 ? `Missing ${difference}` : `Extra ${Math.abs(difference)}`}\n`);
    
    if (difference > 0) {
      console.log(`💡 To reach 435, we need to add ${difference} more voting representatives.`);
      console.log(`   They may be:`);
      console.log(`   1. In PocketBase but marked as delegates (check the ${inPBButNotScraped.length} listed above)`);
      console.log(`   2. Not yet imported into PocketBase`);
      console.log(`   3. Missing from the Wikipedia page we scraped\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

identifyMissing().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
