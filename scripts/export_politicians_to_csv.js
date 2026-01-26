/**
 * Export all politicians from PocketBase to CSV
 * Usage: node scripts/export_politicians_to_csv.js
 * 
 * Environment variables:
 * - POCKETBASE_URL (default: http://127.0.0.1:8091)
 * - POCKETBASE_ADMIN_EMAIL (default: admin@vma.agency)
 * - POCKETBASE_ADMIN_PASSWORD (required)
 * - OUTPUT_FILE (default: politicians_export.csv)
 */

import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

// Default to local PocketBase instance on VPS
// Override with environment variables if needed
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const POCKETBASE_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const POCKETBASE_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'VMAmadmia42O200!';
const OUTPUT_FILE = process.env.OUTPUT_FILE || path.join(process.cwd(), 'politicians_export.csv');

const pb = new PocketBase(POCKETBASE_URL);

/**
 * Escape CSV field value
 */
function escapeCsvField(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Convert array/object to string for CSV
 */
function formatValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (Array.isArray(value)) {
    return value.join('; ');
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

async function main() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    console.log(`   URL: ${POCKETBASE_URL}`);
    console.log(`   Email: ${POCKETBASE_ADMIN_EMAIL}`);
    console.log(`   Password: ${POCKETBASE_ADMIN_PASSWORD ? '***' : '(not set)'}\n`);
    
    await pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');

    console.log('📥 Fetching all politicians...');
    
    // Get all politicians
    let allPoliticians = [];
    let page = 1;
    const perPage = 500;
    let hasMore = true;
    
    while (hasMore) {
      const result = await pb.collection('politicians').getList(page, perPage, {
        sort: 'name',
      });
      
      allPoliticians = allPoliticians.concat(result.items);
      console.log(`   Fetched page ${page}: ${result.items.length} records (total: ${allPoliticians.length})`);
      
      if (result.items.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    console.log(`\n✅ Fetched ${allPoliticians.length} total politicians\n`);

    if (allPoliticians.length === 0) {
      console.log('⚠️  No politicians found');
      return;
    }

    // Get all unique field names from all records
    const allFields = new Set();
    allPoliticians.forEach(p => {
      Object.keys(p).forEach(key => allFields.add(key));
    });
    
    const fieldNames = Array.from(allFields).sort();
    console.log(`📋 Found ${fieldNames.length} unique fields:`);
    console.log(`   ${fieldNames.join(', ')}\n`);

    // Build CSV
    console.log('📝 Building CSV...');
    
    // Header row
    const headerRow = fieldNames.map(f => escapeCsvField(f)).join(',');
    
    // Data rows
    const dataRows = allPoliticians.map(politician => {
      return fieldNames.map(field => {
        const value = politician[field];
        return escapeCsvField(formatValue(value));
      }).join(',');
    });
    
    // Combine
    const csvContent = [headerRow, ...dataRows].join('\n');
    
    // Write to file
    fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf-8');
    
    console.log(`✅ Exported ${allPoliticians.length} politicians to:`);
    console.log(`   ${OUTPUT_FILE}\n`);
    
    // Show sample of state values
    console.log('📊 Sample state values found:');
    const stateValues = new Set();
    allPoliticians.forEach(p => {
      if (p.state) {
        stateValues.add(p.state);
      }
    });
    const sortedStates = Array.from(stateValues).sort();
    console.log(`   Found ${sortedStates.length} unique state values:`);
    sortedStates.slice(0, 20).forEach(state => {
      const count = allPoliticians.filter(p => p.state === state).length;
      console.log(`   - "${state}": ${count} politicians`);
    });
    if (sortedStates.length > 20) {
      console.log(`   ... and ${sortedStates.length - 20} more`);
    }
    
    // Show sample of office_type values
    console.log('\n📊 Sample office_type values found:');
    const officeTypes = new Set();
    allPoliticians.forEach(p => {
      if (p.office_type) {
        officeTypes.add(p.office_type);
      }
    });
    officeTypes.forEach(ot => {
      const count = allPoliticians.filter(p => p.office_type === ot).length;
      console.log(`   - "${ot}": ${count} politicians`);
    });
    
    // Show records with empty/null state
    const emptyState = allPoliticians.filter(p => !p.state || p.state.trim() === '').length;
    if (emptyState > 0) {
      console.log(`\n⚠️  Found ${emptyState} politicians with empty/null state field`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    if (error.message.includes('Failed to authenticate')) {
      console.error('\n💡 Tip: Make sure POCKETBASE_ADMIN_PASSWORD is set correctly.');
      console.error('   You can override the default password with:');
      console.error('   export POCKETBASE_ADMIN_PASSWORD="your-actual-password"');
    }
    process.exit(1);
  }
}

main();
