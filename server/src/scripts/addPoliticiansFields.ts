/**
 * Add fields to politicians collection one by one
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/addPoliticiansFields.ts
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(pbUrl);

const fields = [
  { name: 'name', type: 'text', required: true, unique: false, options: { min: null, max: null, pattern: '' } },
  { name: 'slug', type: 'text', required: true, unique: false, options: { min: null, max: null, pattern: '' } },
  { name: 'wikipedia_title', type: 'text', required: true, unique: false, options: { min: null, max: null, pattern: '' } },
  { name: 'wikipedia_url', type: 'url', required: true, unique: false, options: { exceptDomains: null, onlyDomains: null } },
  { name: 'summary', type: 'text', required: true, unique: false, options: { min: null, max: null, pattern: '' } },
  { name: 'knowledge_base', type: 'text', required: true, unique: false, options: { min: null, max: null, pattern: '' } },
  { name: 'system_prompt', type: 'text', required: true, unique: false, options: { min: null, max: null, pattern: '' } },
  { name: 'portrait', type: 'file', required: false, unique: false, options: { maxSelect: 1, maxSize: 0, mimeTypes: [], thumbs: [], protected: false } },
  { name: 'portrait_source_url', type: 'url', required: false, unique: false, options: { exceptDomains: null, onlyDomains: null } },
];

async function main() {
  console.log('🔄 Adding Fields to Politicians Collection');
  console.log('=========================================');
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
    const collection = await pb.collections.getOne('politicians');
    console.log(`✅ Found collection: ${collection.id}`);
    console.log(`   Current fields: ${(collection as any).schema?.length || 0}`);
    console.log('');

    // Get current fields (PocketBase uses 'fields' not 'schema')
    let currentFields: any[] = (collection as any).fields || [];

    // Add fields one by one
    console.log('📝 Adding fields one by one...');
    let added = 0;
    let failed = 0;

    for (const field of fields) {
      try {
        // Add to current fields
        currentFields.push(field);
        
        // Update collection - try both 'schema' and 'fields'
        try {
          const updated = await pb.collections.update(collection.id, {
            schema: [...currentFields], // API expects 'schema' but stores in 'fields'
          });
          
          // Log response for debugging
          console.log(`   Update response for ${field.name}:`, Object.keys(updated));
        } catch (updateErr: any) {
          throw updateErr;
        }
        
        // Verify it was added
        const verify = await pb.collections.getOne(collection.id);
        const verifyFields = (verify as any).fields || [];
        
        if (verifyFields.length > currentFields.length - 1) {
          added++;
          console.log(`✅ Added: ${field.name} (${field.type})`);
          currentFields = verifyFields; // Update to actual fields
        } else {
          // Field wasn't added, remove from our array
          currentFields.pop();
          failed++;
          console.log(`⚠️  ${field.name} not persisted (will retry manually)`);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err: any) {
        failed++;
        currentSchema.pop();
        console.error(`❌ Failed: ${field.name} - ${err?.message}`);
      }
    }

    console.log('');
    console.log(`✅ Added ${added} fields`);
    if (failed > 0) {
      console.log(`⚠️  ${failed} fields need manual addition`);
    }

    // Final verification
    console.log('');
    console.log('🔍 Final verification...');
    const final = await pb.collections.getOne(collection.id);
    const finalFields = (final as any).fields || [];
    
    // Filter out system fields for count
    const nonSystemFields = finalFields.filter((f: any) => !f.system);
    console.log(`✅ Collection now has ${nonSystemFields.length} non-system fields`);
    
    if (nonSystemFields.length > 0) {
      console.log('');
      console.log('📋 Fields:');
      nonSystemFields.forEach((field: any, idx: number) => {
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
