/**
 * Create presidents collection with all fields in V2 PocketBase
 * Run this after deleting the collection in Admin UI
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/createPresidentsCollectionWithFields.ts
 */

import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

async function main() {
  console.log('🔄 Creating Presidents Collection with Fields');
  console.log('=============================================');
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

    // Load export file
    const exportPath = path.join(process.cwd(), 'presidents-collection-export.json');
    if (!fs.existsSync(exportPath)) {
      console.error(`❌ Export file not found: ${exportPath}`);
      process.exit(1);
    }

    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    console.log(`✅ Loaded export file`);
    console.log(`   Fields in export: ${exportData.fields.length}`);

    // Filter non-system fields
    const fieldsToAdd = exportData.fields.filter((field: any) => {
      return !field.system && field.name !== 'id' && field.name !== 'created' && field.name !== 'updated';
    });

    console.log(`   Non-system fields: ${fieldsToAdd.length}`);

    // Prepare schema (remove id from each field)
    const schema = fieldsToAdd.map((field: any) => {
      const { id, system, ...fieldData } = field;
      return fieldData;
    });

    // Create collection with all fields at once
    console.log('');
    console.log('📝 Creating collection with all fields...');
    
    const collection = await pb.collections.create({
      name: 'presidents',
      type: 'base',
      schema: schema,
      listRule: exportData.listRule || '',
      viewRule: exportData.viewRule || '',
      createRule: exportData.createRule || null,
      updateRule: exportData.updateRule || null,
      deleteRule: exportData.deleteRule || null,
    });

    console.log('✅ Collection created!');
    console.log(`   Collection ID: ${collection.id}`);

    // Verify
    console.log('');
    console.log('🔍 Verifying collection...');
    const verified = await pb.collections.getOne(collection.id);
    const verifiedFields = (verified as any).schema || [];
    
    console.log(`✅ Collection has ${verifiedFields.length} fields`);
    
    if (verifiedFields.length > 0) {
      console.log('');
      console.log('📋 Field List:');
      verifiedFields.forEach((field: any, idx: number) => {
        const required = field.required ? '✅' : '  ';
        const unique = field.unique ? '🔑' : '  ';
        console.log(`   ${idx + 1}. ${required} ${unique} ${field.name} (${field.type})`);
      });
    } else {
      console.log('');
      console.log('⚠️  No fields found in collection');
      console.log('   This may be a PocketBase API limitation');
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
