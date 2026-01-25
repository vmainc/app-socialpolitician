/**
 * Remove presidents from politicians collection
 * Finds and deletes records that are U.S. Presidents (historical or current)
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
 * List of all U.S. Presidents (for reference and matching)
 */
const US_PRESIDENTS = [
  'George Washington', 'John Adams', 'Thomas Jefferson', 'James Madison',
  'James Monroe', 'John Quincy Adams', 'Andrew Jackson', 'Martin Van Buren',
  'William Henry Harrison', 'John Tyler', 'James K. Polk', 'Zachary Taylor',
  'Millard Fillmore', 'Franklin Pierce', 'James Buchanan', 'Abraham Lincoln',
  'Andrew Johnson', 'Ulysses S. Grant', 'Rutherford B. Hayes', 'James A. Garfield',
  'Chester A. Arthur', 'Grover Cleveland', 'Benjamin Harrison', 'William McKinley',
  'Theodore Roosevelt', 'William Howard Taft', 'Woodrow Wilson', 'Warren G. Harding',
  'Calvin Coolidge', 'Herbert Hoover', 'Franklin D. Roosevelt', 'Harry S. Truman',
  'Dwight D. Eisenhower', 'John F. Kennedy', 'Lyndon B. Johnson', 'Richard Nixon',
  'Gerald Ford', 'Jimmy Carter', 'Ronald Reagan', 'George H. W. Bush',
  'Bill Clinton', 'George W. Bush', 'Barack Obama', 'Donald Trump', 'Joe Biden'
];

/**
 * Check if a politician record is a U.S. President
 */
function isPresident(politician) {
  const name = politician.name || '';
  const currentPosition = (politician.current_position || '').toLowerCase();
  const officeType = (politician.office_type || '').toLowerCase();
  
  // Check if name matches any president (exact or partial match)
  const normalizedName = name.toLowerCase().trim();
  for (const president of US_PRESIDENTS) {
    const normalizedPresident = president.toLowerCase().trim();
    // Exact match
    if (normalizedName === normalizedPresident) {
      return true;
    }
    // Check if name contains president's last name (for cases like "Warren G. Harding")
    const presidentParts = normalizedPresident.split(' ');
    const nameParts = normalizedName.split(' ');
    if (presidentParts.length > 1 && nameParts.length > 1) {
      // Match last name
      const presidentLastName = presidentParts[presidentParts.length - 1];
      const nameLastName = nameParts[nameParts.length - 1];
      if (presidentLastName === nameLastName && presidentLastName.length > 3) {
        // Also check first name to reduce false positives
        const presidentFirstName = presidentParts[0];
        const nameFirstName = nameParts[0];
        if (presidentFirstName === nameFirstName || 
            (presidentFirstName.length > 2 && nameFirstName.startsWith(presidentFirstName.substring(0, 3)))) {
          return true;
        }
      }
    }
  }
  
  // Check current_position for president-related terms
  if (currentPosition.includes('president') && 
      (currentPosition.includes('united states') || currentPosition.includes('u.s.') || currentPosition.includes('us'))) {
    return true;
  }
  
  // Check if office_type is somehow set to president (shouldn't happen but check anyway)
  if (officeType === 'president') {
    return true;
  }
  
  return false;
}

async function main() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');

    console.log('🔍 Searching for presidents in politicians collection...');
    
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
    
    // Find presidents
    const presidents = allPoliticians.filter(isPresident);
    
    console.log(`👔 Found ${presidents.length} presidents in politicians collection:\n`);
    presidents.forEach((president, index) => {
      console.log(`${index + 1}. ${president.name} (${president.slug})`);
      if (president.current_position) {
        console.log(`   Position: ${president.current_position}`);
      }
      if (president.office_type) {
        console.log(`   Office Type: ${president.office_type}`);
      }
      console.log('');
    });
    
    if (presidents.length === 0) {
      console.log('✅ No presidents found in politicians collection. Nothing to remove.');
      return;
    }
    
    // Confirm deletion
    console.log(`\n⚠️  About to delete ${presidents.length} presidents from politicians collection.`);
    console.log('   These should be in the separate "presidents" collection, not "politicians".');
    console.log('   This action cannot be undone.\n');
    
    // Delete presidents
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const president of presidents) {
      try {
        await pb.collection('politicians').delete(president.id);
        console.log(`✅ Deleted: ${president.name} (${president.slug})`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete ${president.name}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Deleted: ${deletedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`👔 Total presidents removed from politicians collection: ${deletedCount}`);
    console.log('\n💡 Note: Presidents should be in the separate "presidents" collection, not "politicians".');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

main();
