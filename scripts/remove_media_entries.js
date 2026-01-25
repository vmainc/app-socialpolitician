/**
 * Remove media entries from politicians collection
 * Finds and deletes records that are media organizations, not actual politicians
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
const POCKETBASE_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
const POCKETBASE_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!POCKETBASE_ADMIN_PASSWORD) {
  console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable is required');
  process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);

/**
 * Check if a record is a media organization
 */
function isMediaEntry(politician) {
  const name = (politician.name || '').toLowerCase();
  const slug = (politician.slug || '').toLowerCase();
  const currentPosition = (politician.current_position || '').toLowerCase();
  const website = (politician.website_url || '').toLowerCase();
  
  // Media-related keywords
  const mediaKeywords = [
    'media',
    'cnn',
    'fox news',
    'msnbc',
    'abc news',
    'cbs news',
    'nbc news',
    'news',
    'network',
    'broadcast',
    'television',
    'tv station',
    'radio station',
    'newspaper',
    'magazine',
    'publication',
    'press',
    '.com',
    '.org',
  ];
  
  // Check name
  if (mediaKeywords.some(keyword => name.includes(keyword))) {
    return true;
  }
  
  // Check slug (common patterns like "cnn-com")
  if (slug.includes('cnn') || slug.includes('com') || slug.includes('media') || slug.includes('news')) {
    // But exclude if it's clearly a person's name
    if (!slug.match(/^[a-z]+-[a-z]+$/)) {
      return true;
    }
  }
  
  // Check current_position
  if (currentPosition.includes('media') || currentPosition.includes('news') || currentPosition.includes('journalist')) {
    return true;
  }
  
  // Check if website is a media domain
  const mediaDomains = [
    'cnn.com',
    'foxnews.com',
    'msnbc.com',
    'abcnews.com',
    'cbsnews.com',
    'nbcnews.com',
    'reuters.com',
    'ap.org',
    'bloomberg.com',
    'wsj.com',
    'nytimes.com',
    'washingtonpost.com',
  ];
  
  if (mediaDomains.some(domain => website.includes(domain))) {
    return true;
  }
  
  return false;
}

async function main() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');

    console.log('🔍 Searching for media entries...');
    
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
      
      if (result.items.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    console.log(`📊 Total politicians: ${allPoliticians.length}\n`);
    
    // Find media entries
    const mediaEntries = allPoliticians.filter(isMediaEntry);
    
    console.log(`📰 Found ${mediaEntries.length} media entries:\n`);
    mediaEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.name} (${entry.slug})`);
      if (entry.current_position) {
        console.log(`   Position: ${entry.current_position}`);
      }
      if (entry.website_url) {
        console.log(`   Website: ${entry.website_url}`);
      }
      console.log('');
    });
    
    if (mediaEntries.length === 0) {
      console.log('✅ No media entries found. Nothing to remove.');
      return;
    }
    
    // Confirm deletion
    console.log(`\n⚠️  About to delete ${mediaEntries.length} media entries.`);
    console.log('   This action cannot be undone.\n');
    
    // Delete media entries
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const entry of mediaEntries) {
      try {
        await pb.collection('politicians').delete(entry.id);
        console.log(`✅ Deleted: ${entry.name} (${entry.slug})`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete ${entry.name}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Deleted: ${deletedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📰 Total media entries removed: ${deletedCount}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

main();
