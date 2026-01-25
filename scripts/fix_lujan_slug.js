/**
 * Fix Ben Ray Luján's slug and name
 * - Decodes HTML entity &aacute; in name to á
 * - Updates slug from ben-ray-luj-aacute-n to ben-ray-lujan
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
 * Decode HTML entities (Node.js compatible)
 */
function decodeHtmlEntities(text) {
  if (!text) return '';
  
  // Common HTML entity mappings
  const entityMap = {
    '&aacute;': 'á',
    '&eacute;': 'é',
    '&iacute;': 'í',
    '&oacute;': 'ó',
    '&uacute;': 'ú',
    '&ntilde;': 'ñ',
    '&ccedil;': 'ç',
    '&Aacute;': 'Á',
    '&Eacute;': 'É',
    '&Iacute;': 'Í',
    '&Oacute;': 'Ó',
    '&Uacute;': 'Ú',
    '&Ntilde;': 'Ñ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(entityMap)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  // Also handle numeric entities like &#225;
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Handle hex entities like &#xE1;
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return decoded;
}

/**
 * Generate slug from name (removes accents)
 */
function normalizeSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

async function main() {
  try {
    console.log('🔐 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');

    // Find Ben Ray Luján by current slug or name
    console.log('🔍 Searching for Ben Ray Luján...');
    let politician;
    
    try {
      // Try by current slug first
      politician = await pb.collection('politicians').getFirstListItem('slug="ben-ray-luj-aacute-n"');
      console.log('✅ Found by slug: ben-ray-luj-aacute-n');
    } catch (e) {
      // Try by name with HTML entity
      try {
        politician = await pb.collection('politicians').getFirstListItem('name~"Ben Ray Luj&aacute;n"');
        console.log('✅ Found by name with HTML entity');
      } catch (e2) {
        // Try by normalized name
        try {
          politician = await pb.collection('politicians').getFirstListItem('name~"Ben Ray Lujan"');
          console.log('✅ Found by normalized name');
        } catch (e3) {
          console.error('❌ Could not find Ben Ray Luján');
          console.error('   Tried: slug="ben-ray-luj-aacute-n"');
          console.error('   Tried: name~"Ben Ray Luj&aacute;n"');
          console.error('   Tried: name~"Ben Ray Lujan"');
          process.exit(1);
        }
      }
    }

    console.log(`\n📋 Current record:`);
    console.log(`   ID: ${politician.id}`);
    console.log(`   Name: ${politician.name}`);
    console.log(`   Slug: ${politician.slug}`);

    // Decode HTML entities in name
    const decodedName = decodeHtmlEntities(politician.name);
    const newSlug = normalizeSlug(decodedName);

    console.log(`\n🔄 Updating:`);
    console.log(`   Name: "${politician.name}" → "${decodedName}"`);
    console.log(`   Slug: "${politician.slug}" → "${newSlug}"`);

    // Update the record
    await pb.collection('politicians').update(politician.id, {
      name: decodedName,
      slug: newSlug,
    });

    console.log('\n✅ Successfully updated Ben Ray Luján!');
    console.log(`\n🔗 New URL: https://app.socialpolitician.com/politicians/${newSlug}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

main();
