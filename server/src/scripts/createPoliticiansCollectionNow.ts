/**
 * Create politicians collection immediately
 * This script creates the collection with all required fields
 */

import PocketBase from 'pocketbase';

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';

async function main() {
  console.log('🔄 Creating Politicians Collection');
  console.log('==================================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');

  if (!adminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable required');
    console.error('   Set it to your PocketBase admin password');
    process.exit(1);
  }

  const pb = new PocketBase(pbUrl);

  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin');
    console.log('');

    // Check if collection exists
    try {
      const existing = await pb.collections.getOne('politicians');
      console.log('⚠️  Politicians collection already exists');
      console.log(`   Collection ID: ${existing.id}`);
      console.log(`   Fields: ${existing.schema?.length || 0}`);
      process.exit(0);
    } catch (err: any) {
      if (err?.status !== 404) {
        throw err;
      }
    }

    // Create collection with all fields
    console.log('📝 Creating politicians collection...');
    
    const collection = await pb.collections.create({
      name: 'politicians',
      type: 'base',
      schema: [
        {
          name: 'name',
          type: 'text',
          required: true,
          unique: false,
          options: { min: 1, max: 200 }
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          options: { min: 1, max: 200, pattern: '^[a-z0-9-]+$' }
        },
        {
          name: 'office_type',
          type: 'select',
          required: false,
          options: {
            maxSelect: 1,
            values: ['senator', 'representative', 'governor', 'other']
          }
        },
        {
          name: 'state',
          type: 'text',
          required: false,
          options: { max: 100 }
        },
        {
          name: 'district',
          type: 'text',
          required: false,
          options: { max: 50 }
        },
        {
          name: 'political_party',
          type: 'text',
          required: false,
          options: { max: 100 }
        },
        {
          name: 'current_position',
          type: 'text',
          required: false,
          options: { max: 200 }
        },
        {
          name: 'position_start_date',
          type: 'date',
          required: false
        },
        {
          name: 'photo',
          type: 'file',
          required: false,
          options: {
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            thumbs: ['100x100']
          }
        },
        {
          name: 'website_url',
          type: 'url',
          required: false
        },
        {
          name: 'wikipedia_url',
          type: 'url',
          required: false
        },
        {
          name: 'facebook_url',
          type: 'url',
          required: false
        },
        {
          name: 'youtube_url',
          type: 'url',
          required: false
        },
        {
          name: 'instagram_url',
          type: 'url',
          required: false
        },
        {
          name: 'x_url',
          type: 'url',
          required: false
        },
        {
          name: 'linkedin_url',
          type: 'url',
          required: false
        },
        {
          name: 'tiktok_url',
          type: 'url',
          required: false
        },
        {
          name: 'truth_social_url',
          type: 'url',
          required: false
        }
      ],
      listRule: '',
      viewRule: '',
      createRule: null,
      updateRule: null,
      deleteRule: null
    });

    console.log('✅ Collection created successfully!');
    console.log(`   Collection ID: ${collection.id}`);
    console.log(`   Fields: ${collection.schema?.length || 0}`);
    console.log('');
    console.log('🎉 Politicians collection is ready!');
    
  } catch (error: any) {
    console.error('❌ Failed to create collection:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main();
