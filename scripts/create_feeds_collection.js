#!/usr/bin/env node
/**
 * Create feeds collection with public read access
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';

if (!adminPassword) {
  console.error('❌ POCKETBASE_ADMIN_PASSWORD required');
  process.exit(1);
}

async function main() {
  console.log('🔄 Creating feeds collection');
  console.log('===========================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');

  const pb = new PocketBase(pbUrl);

  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin');
    console.log('');

    // Check if collection already exists
    try {
      const existing = await pb.collection('feeds').getList(1, 1);
      console.log('✅ Feeds collection already exists');
      console.log(`   Total records: ${existing.totalItems}`);
      
      // Update rules to allow public read access
      const collection = await pb.collections.getOne('feeds');
      if (collection.listRule !== 'id != ""' || collection.viewRule !== 'id != ""') {
        await pb.collections.update('feeds', {
          listRule: 'id != ""',
          viewRule: 'id != ""',
        });
        console.log('✅ Updated collection rules for public read access');
      } else {
        console.log('✅ Collection rules already set for public access');
      }
      return;
    } catch (err) {
      if (err?.status !== 404) throw err;
    }

    // Get politicians collection ID
    const politiciansCollection = await pb.collections.getOne('politicians');
    console.log(`   Found politicians collection: ${politiciansCollection.id}`);
    
    // Create the collection (without indexes first)
    console.log('📦 Creating feeds collection...');
    
    const collection = await pb.collections.create({
      name: 'feeds',
      type: 'base',
      schema: [
        {
          name: 'politician',
          type: 'relation',
          required: true,
          options: {
            collectionId: politiciansCollection.id,
            cascadeDelete: true,
            maxSelect: 1,
            displayFields: ['name']
          }
        },
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: {
            maxSelect: 1,
            values: ['twitter', 'instagram', 'youtube', 'truth', 'tiktok', 'rss', 'website']
          }
        },
        {
          name: 'fetched_at',
          type: 'date',
          required: true
        },
        {
          name: 'payload',
          type: 'json',
          required: false
        },
        {
          name: 'normalized_items',
          type: 'json',
          required: false
        }
      ],
      listRule: 'id != ""',
      viewRule: 'id != ""',
    });
    
    console.log('✅ Collection created, adding indexes...');
    
    // Add indexes after collection is created
    try {
      await pb.collections.update(collection.id, {
        indexes: [
          'CREATE INDEX idx_feeds_politician ON feeds (politician)',
          'CREATE INDEX idx_feeds_platform ON feeds (platform)',
          'CREATE INDEX idx_feeds_fetched_at ON feeds (fetched_at)',
          'CREATE UNIQUE INDEX idx_feeds_politician_platform ON feeds (politician, platform)'
        ]
      });
      console.log('✅ Indexes created');
    } catch (indexError) {
      console.log('⚠️  Could not create indexes (may need to be done manually):', indexError.message);
    }

    console.log('✅ Feeds collection created successfully');
    console.log(`   Collection ID: ${collection.id}`);
    console.log('   Rules: Public read access enabled');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main();
