#!/usr/bin/env node

/**
 * Add bio field to PocketBase politicians collection
 * Uses PocketBase Admin API to add the field programmatically
 */

import PocketBase from 'pocketbase';
import fetch from 'node-fetch';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'VMAmadmia42O200!';

const pb = new PocketBase(PB_URL);

async function addBioField() {
  console.log('🔧 Adding Bio Field to PocketBase Schema');
  console.log('=========================================\n');
  
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');
    
    // Get the collection - try by name first, then by ID
    let collection;
    let collectionId;
    
    try {
      collection = await pb.collections.getOne('politicians');
      collectionId = (collection as any).id;
    } catch (error: any) {
      // Try by ID if name doesn't work
      collectionId = 'pbc_3830222512'; // politicians collection ID
      collection = await pb.collections.getOne(collectionId);
    }
    
    console.log(`📋 Collection: ${(collection as any).name} (${collectionId})\n`);
    
    // Get current schema (handle both 'schema' and 'fields' properties)
    const currentSchema = (collection as any).schema || (collection as any).fields || [];
    
    // Check if bio field already exists
    const existingBioField = currentSchema.find((f: any) => f.name === 'bio');
    
    if (existingBioField) {
      console.log('ℹ️  Bio field already exists in schema');
      console.log(`   Type: ${existingBioField.type}`);
      console.log(`   Options: ${JSON.stringify(existingBioField.options || {})}\n`);
      return;
    }
    
    console.log(`📊 Current schema has ${currentSchema.length} fields`);
    console.log('➕ Bio field does not exist. Adding it...\n');
    
    // Check if bio field already exists in current schema
    const bioExists = currentSchema.some((f: any) => f.name === 'bio');
    if (bioExists) {
      console.log('ℹ️  Bio field already exists in schema\n');
      return;
    }
    
    // Add bio field to schema
    const newField = {
      name: 'bio',
      type: 'text',
      required: false,
      unique: false,
      system: false,
      options: {
        min: null,
        max: 5000,
        pattern: ''
      }
    };
    
    // Update collection with new schema
    const updatedSchema = [...currentSchema, newField];
    
    await pb.collections.update(collectionId, {
      schema: updatedSchema
    });
    
    console.log('✅ Bio field added successfully!\n');
    console.log('📋 Field details:');
    console.log(`   Name: bio`);
    console.log(`   Type: text`);
    console.log(`   Max length: 5000`);
    console.log(`   Required: false\n`);
    
    // Verify it was added
    const updatedCollection = await pb.collections.getOne(collectionId);
    const bioField = updatedCollection.schema.find(f => f.name === 'bio');
    
    if (bioField) {
      console.log('✅ Verification: Bio field confirmed in schema\n');
    } else {
      console.log('⚠️  Warning: Bio field not found after adding. May need manual verification.\n');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('schema') || error.message.includes('field')) {
      console.error('\n⚠️  Unable to add field programmatically.');
      console.error('   You may need to add it manually in PocketBase Admin UI:\n');
      console.error('   1. Go to: http://127.0.0.1:8091/_/');
      console.error('   2. Navigate to Collections > politicians');
      console.error('   3. Click "Add new field"');
      console.error('   4. Name: "bio", Type: "Text", Max: 5000');
      console.error('   5. Save\n');
    }
    
    process.exit(1);
  }
}

addBioField().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
