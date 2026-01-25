#!/usr/bin/env node

/**
 * Find which voting representatives are missing from PocketBase
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
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isDelegate(name) {
  const normalized = normalizeName(name);
  return DELEGATES.some(d => normalizeName(d) === normalized);
}

async function findMissing() {
  console.log('🔍 Finding Missing Voting Representatives');
  console.log('==========================================\n');
  
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
    
    // Get all representatives from PocketBase
    const pbReps = await pb.collection('politicians').getFullList({
      filter: 'office_type="representative"',
      sort: 'name',
    });
    
    console.log(`📊 Representatives in PocketBase: ${pbReps.length}\n`);
    
    // Get scraped representatives
    const indexFile = path.join(projectRoot, 'portraits/representatives/index.json');
    if (!fs.existsSync(indexFile)) {
      console.error('❌ Index file not found');
      process.exit(1);
    }
    
    const scraped = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    console.log(`📥 Scraped representatives: ${scraped.length}\n`);
    
    // Separate delegates from voting representatives
    const scrapedVoting = scraped.filter(rep => !isDelegate(rep.name));
    const scrapedDelegates = scraped.filter(rep => isDelegate(rep.name));
    
    console.log(`📊 Breakdown:`);
    console.log(`   Voting representatives (scraped): ${scrapedVoting.length}`);
    console.log(`   Delegates (scraped): ${scrapedDelegates.length}\n`);
    
    // Create normalized name maps
    const pbNames = new Set(pbReps.map(rep => normalizeName(rep.name)));
    
    // Find missing voting representatives
    const missing = scrapedVoting.filter(rep => {
      const normalized = normalizeName(rep.name);
      // Check exact match
      if (pbNames.has(normalized)) return false;
      
      // Check last name match (in case of name variations)
      const lastName = normalized.split(' ').pop();
      const pbLastNames = Array.from(pbNames).map(n => n.split(' ').pop());
      if (pbLastNames.includes(lastName) && lastName.length > 2) {
        // Might be a match, check manually
        return false;
      }
      
      return true;
    });
    
    console.log(`⚠️  Missing Voting Representatives (${missing.length}):\n`);
    missing.forEach((rep, i) => {
      console.log(`   ${i + 1}. ${rep.name}`);
      if (rep.district) {
        console.log(`      District: ${rep.district}`);
      }
    });
    
    console.log(`\n📋 Delegates (not part of 435):\n`);
    scrapedDelegates.forEach((rep, i) => {
      console.log(`   ${i + 1}. ${rep.name}`);
    });
    
    const expected = 435;
    const actual = pbReps.length;
    const difference = expected - actual;
    
    console.log(`\n🎯 Expected: ${expected} voting representatives`);
    console.log(`📊 Actual: ${actual} representatives in PocketBase`);
    console.log(`⚠️  Difference: ${difference > 0 ? `Missing ${difference}` : `Extra ${Math.abs(difference)}`}\n`);
    
    if (missing.length > 0) {
      console.log(`💡 These ${missing.length} voting representatives are in the scraped list but not in PocketBase.`);
      console.log(`   They may need to be added manually or there may be a name matching issue.\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findMissing().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
