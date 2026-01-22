/**
 * Create presidents collection fields in V2 PocketBase
 * Uses PocketBase Admin API to add fields one by one
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   V1_POCKETBASE_URL=http://127.0.0.1:8090 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/createPresidentsFields.ts
 */

import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const v2PbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const v1PbUrl = process.env.V1_POCKETBASE_URL || 'http://127.0.0.1:8090';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const v2Pb = new PocketBase(v2PbUrl);
const v1Pb = new PocketBase(v1PbUrl);

async function main() {
  console.log('🔄 Creating Presidents Collection Fields');
  console.log('=========================================');
  console.log(`V1 URL: ${v1PbUrl}`);
  console.log(`V2 URL: ${v2PbUrl}`);
  console.log('');

  if (!adminEmail || !adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
    process.exit(1);
  }

  try {
    // Authenticate with V2
    console.log('🔐 Authenticating with V2...');
    await v2Pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated with V2 PocketBase');

    // Authenticate with V1
    console.log('🔐 Authenticating with V1...');
    await v1Pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated with V1 PocketBase');

    // Get V1 collection schema
    console.log('');
    console.log('📤 Fetching schema from V1...');
    const v1Collection = await v1Pb.collections.getOne('presidents');
    const v1Data = v1Collection as any;
    const v1Fields = v1Data.fields || [];
    
    // Filter non-system fields
    const fieldsToAdd = v1Fields.filter((field: any) => {
      return !field.system && field.name !== 'id' && field.name !== 'created' && field.name !== 'updated';
    });
    
    console.log(`✅ Found ${fieldsToAdd.length} fields to add`);

    // Get or create V2 collection
    console.log('');
    console.log('🔍 Checking V2 collection...');
    let v2Collection;
    let collectionId: string;
    
    try {
      v2Collection = await v2Pb.collections.getOne('presidents');
      collectionId = v2Collection.id;
      console.log('✅ Found existing collection');
      
      // Get current schema
      const currentSchema = (v2Collection as any).schema || [];
      console.log(`   Current fields: ${currentSchema.length}`);
      
      if (currentSchema.length > 0) {
        console.log('⚠️  Collection already has fields. Deleting to recreate...');
        await v2Pb.collections.delete(collectionId);
        
        // Recreate empty collection
        const recreated = await v2Pb.collections.create({
          name: 'presidents',
          type: 'base',
          schema: [],
          listRule: (v1Collection as any).listRule || '',
          viewRule: (v1Collection as any).viewRule || '',
          createRule: (v1Collection as any).createRule,
          updateRule: (v1Collection as any).updateRule,
          deleteRule: (v1Collection as any).deleteRule,
        });
        collectionId = recreated.id;
        console.log('✅ Recreated collection');
      }
    } catch (err: any) {
      if (err?.status === 404) {
        console.log('ℹ️  Collection doesn\'t exist, creating...');
        const created = await v2Pb.collections.create({
          name: 'presidents',
          type: 'base',
          schema: [],
          listRule: (v1Collection as any).listRule || '',
          viewRule: (v1Collection as any).viewRule || '',
          createRule: (v1Collection as any).createRule,
          updateRule: (v1Collection as any).updateRule,
          deleteRule: (v1Collection as any).deleteRule,
        });
        collectionId = created.id;
        console.log('✅ Created collection');
      } else {
        throw err;
      }
    }

    // Add fields one by one using update with cumulative schema
    console.log('');
    console.log('📝 Adding fields one by one...');
    let currentSchema: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const field of fieldsToAdd) {
      try {
        // Remove system-generated ID and system flag
        const { id, system, ...fieldData } = field;
        
        // Add field to schema
        currentSchema.push(fieldData);
        
        // Update collection with new schema
        await v2Pb.collections.update(collectionId, {
          schema: currentSchema,
        });
        
        successCount++;
        console.log(`✅ Added: ${field.name} (${field.type})`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err: any) {
        errorCount++;
        console.error(`❌ Failed to add ${field.name}: ${err?.message}`);
        if (err?.response) {
          console.error('   Response:', JSON.stringify(err.response, null, 2));
        }
        // Remove failed field from schema
        currentSchema.pop();
      }
    }

    console.log('');
    console.log('✅ Field creation complete!');
    console.log(`   Success: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount}`);
    }

    // Verify final state
    console.log('');
    console.log('🔍 Verifying collection...');
    const final = await v2Pb.collections.getOne(collectionId);
    const finalSchema = (final as any).schema || [];
    
    console.log(`✅ Collection has ${finalSchema.length} fields`);
    
    if (finalSchema.length > 0) {
      console.log('');
      console.log('📋 Field List:');
      finalSchema.forEach((field: any, idx: number) => {
        const required = field.required ? '✅' : '  ';
        const unique = field.unique ? '🔑' : '  ';
        console.log(`   ${idx + 1}. ${required} ${unique} ${field.name} (${field.type})`);
      });
    } else {
      console.log('');
      console.log('⚠️  No fields found. This may be a PocketBase API limitation.');
      console.log('   Try adding fields manually via Admin UI:');
      console.log(`   http://127.0.0.1:8091/_/#/collections?collection=${collectionId}`);
    }

    console.log('');
    console.log('✅ Done!');
    console.log(`   Admin UI: http://127.0.0.1:8091/_/`);
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
