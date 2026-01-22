/**
 * Export V1 presidents collection schema and import into V2
 * Adds fields one-by-one to ensure they're properly created
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   V1_POCKETBASE_URL=http://127.0.0.1:8090 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/exportImportPresidentsCollection.ts
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
  console.log('🔄 Export/Import Presidents Collection');
  console.log('======================================');
  console.log(`V1 URL: ${v1PbUrl}`);
  console.log(`V2 URL: ${v2PbUrl}`);
  console.log('');

  if (!adminEmail || !adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set');
    process.exit(1);
  }

  try {
    // Authenticate with both
    await v2Pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated with V2 PocketBase');

    await v1Pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated with V1 PocketBase');

    // Export from V1
    console.log('');
    console.log('📤 Exporting presidents collection from V1...');
    const v1Collection = await v1Pb.collections.getOne('presidents');
    const v1Data = v1Collection as any;
    
    const exportData = {
      name: v1Data.name,
      type: v1Data.type,
      fields: v1Data.fields || [],
      listRule: v1Data.listRule || '',
      viewRule: v1Data.viewRule || '',
      createRule: v1Data.createRule,
      updateRule: v1Data.updateRule,
      deleteRule: v1Data.deleteRule,
      indexes: v1Data.indexes || [],
    };

    // Save export to file
    const exportPath = path.join(process.cwd(), 'presidents-collection-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`✅ Exported to: ${exportPath}`);
    console.log(`   Fields: ${exportData.fields.length}`);

    // Filter out system fields
    const nonSystemFields = exportData.fields.filter((field: any) => {
      return !field.system && field.name !== 'id' && field.name !== 'created' && field.name !== 'updated';
    });
    console.log(`   Non-system fields: ${nonSystemFields.length}`);

    // Delete existing V2 collection if it exists
    console.log('');
    console.log('🔍 Checking V2 collection...');
    try {
      const existing = await v2Pb.collections.getOne('presidents');
      console.log('⚠️  Collection exists, deleting...');
      await v2Pb.collections.delete(existing.id);
      console.log('✅ Deleted existing collection');
    } catch (err: any) {
      if (err?.status === 404) {
        console.log('ℹ️  Collection doesn\'t exist, will create new');
      } else {
        throw err;
      }
    }

    // Create collection first (empty)
    console.log('');
    console.log('📝 Creating collection in V2...');
    const created = await v2Pb.collections.create({
      name: 'presidents',
      type: 'base',
      schema: [],
      listRule: exportData.listRule,
      viewRule: exportData.viewRule,
      createRule: exportData.createRule,
      updateRule: exportData.updateRule,
      deleteRule: exportData.deleteRule,
    });
    console.log('✅ Created collection');

    // Add fields one by one
    console.log('');
    console.log('📝 Adding fields one by one...');
    const collectionId = (created as any).id;
    let addedCount = 0;
    let errorCount = 0;

    for (const field of nonSystemFields) {
      try {
        // Remove system-generated ID
        const { id, system, ...fieldData } = field;
        
        // Get current schema
        const current = await v2Pb.collections.getOne(collectionId);
        const currentSchema = (current as any).schema || [];
        
        // Add new field
        await v2Pb.collections.update(collectionId, {
          schema: [...currentSchema, fieldData],
        });
        
        addedCount++;
        process.stdout.write(`✓ Added: ${field.name}\r`);
      } catch (err: any) {
        errorCount++;
        console.error(`\n❌ Failed to add ${field.name}: ${err?.message}`);
      }
    }

    console.log('');
    console.log('');
    console.log('✅ Import complete!');
    console.log(`   Added: ${addedCount} fields`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount}`);
    }

    // Verify
    console.log('');
    console.log('🔍 Verifying collection...');
    const final = await v2Pb.collections.getOne(collectionId);
    const finalFields = (final as any).schema || [];
    console.log(`✅ Collection has ${finalFields.length} fields`);

    console.log('');
    console.log('📋 Field List:');
    finalFields.forEach((field: any, idx: number) => {
      const required = field.required ? '✅' : '  ';
      const unique = field.unique ? '🔑' : '  ';
      console.log(`   ${idx + 1}. ${required} ${unique} ${field.name} (${field.type})`);
    });

    console.log('');
    console.log('✅ Done!');
    console.log(`   Export saved: ${exportPath}`);
    console.log('   Admin UI: http://127.0.0.1:8091/_/');
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
