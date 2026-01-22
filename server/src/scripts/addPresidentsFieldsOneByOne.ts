/**
 * Add presidents collection fields one by one using update API
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/addPresidentsFieldsOneByOne.ts
 */

import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function main() {
  console.log('🔄 Adding Presidents Collection Fields');
  console.log('======================================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');

  if (!adminEmail || !adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
    process.exit(1);
  }

  try {
    // Authenticate
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated');

    // Get collection
    const collection = await pb.collections.getOne('presidents');
    console.log(`✅ Found collection: ${collection.id}`);

    // Load export file
    const exportPath = path.join(process.cwd(), 'presidents-collection-export.json');
    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    
    // Filter non-system fields
    const fieldsToAdd = exportData.fields.filter((field: any) => {
      return !field.system && field.name !== 'id' && field.name !== 'created' && field.name !== 'updated';
    });

    console.log(`📋 Found ${fieldsToAdd.length} fields to add`);
    console.log('');

    // Get current schema
    let currentSchema = (collection as any).schema || [];
    console.log(`Current fields: ${currentSchema.length}`);

    // Add fields one by one
    let added = 0;
    let failed = 0;

    for (const field of fieldsToAdd) {
      try {
        // Remove id and system from field
        const { id, system, ...fieldData } = field;
        
        // Add to current schema
        currentSchema.push(fieldData);
        
        // Update collection
        await pb.collections.update(collection.id, {
          schema: currentSchema,
        });
        
        added++;
        console.log(`✅ Added: ${field.name} (${field.type})`);
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err: any) {
        failed++;
        console.error(`❌ Failed: ${field.name} - ${err?.message}`);
        // Remove from schema if failed
        currentSchema.pop();
      }
    }

    console.log('');
    console.log(`✅ Added ${added} fields`);
    if (failed > 0) {
      console.log(`❌ Failed ${failed} fields`);
    }

    // Verify
    console.log('');
    console.log('🔍 Verifying...');
    const verified = await pb.collections.getOne(collection.id);
    const verifiedFields = (verified as any).schema || [];
    
    console.log(`✅ Collection now has ${verifiedFields.length} fields`);
    
    if (verifiedFields.length > 0) {
      console.log('');
      console.log('📋 Fields:');
      verifiedFields.forEach((field: any, idx: number) => {
        console.log(`   ${idx + 1}. ${field.name} (${field.type})`);
      });
    }

    console.log('');
    console.log('✅ Done!');
    console.log(`   Admin UI: http://127.0.0.1:8091/_/#/collections?collection=${collection.id}`);
  } catch (error: any) {
    console.error('');
    console.error('❌ Error:', error?.message || error);
    if (error?.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main().catch(console.error);
