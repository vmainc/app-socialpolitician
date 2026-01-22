/**
 * Add a single field directly using HTTP API
 * Test script to see if direct HTTP works better than SDK
 */

import PocketBase from 'pocketbase';

const pbUrl = 'http://127.0.0.1:8091';
const adminEmail = 'admin@vma.agency';
const adminPassword = 'VMAmadmia42O200!';

const pb = new PocketBase(pbUrl);

async function main() {
  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated');

    const collection = await pb.collections.getOne('presidents');
    console.log('✅ Got collection:', collection.id);
    console.log('Current schema:', (collection as any).schema?.length || 0);

    // Try adding one field
    const newField = {
      name: 'name',
      type: 'text',
      required: true,
      unique: false,
    };

    const currentSchema = (collection as any).schema || [];
    const updatedSchema = [...currentSchema, newField];

    console.log('Updating with schema length:', updatedSchema.length);
    
    const updated = await pb.collections.update(collection.id, {
      schema: updatedSchema,
    });

    console.log('✅ Updated');
    console.log('New schema length:', (updated as any).schema?.length || 0);

    // Verify
    const verified = await pb.collections.getOne(collection.id);
    console.log('Verified schema length:', (verified as any).schema?.length || 0);
  } catch (error: any) {
    console.error('Error:', error?.message);
    if (error?.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
  }
}

main();
