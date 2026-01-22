/**
 * Find and add official websites for US Representatives
 * 
 * Sources:
 * - Wikipedia pages (often have official website links)
 * - House.gov member pages
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/findRepresentativeWebsites.ts
 */

import PocketBase from 'pocketbase';

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.text();
  } catch (error: any) {
    return null;
  }
}

function extractOfficialWebsite(html: string, baseUrl: string): string | null {
  // Look for official website links
  // Common patterns:
  // - "Official website" link
  // - "Website" link
  // - Links to house.gov or congress.gov
  // - External links that look like official sites
  
  const excludedDomains = [
    'wikipedia.org', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
    'youtube.com', 'linkedin.com', 'flickr.com', 'pinterest.com', 'tiktok.com',
    'snapchat.com', 'reddit.com', 'wikimedia.org', 'commons.wikimedia.org'
  ];
  
  // Pattern 1: Look for "Official website" or "Website" links
  const officialPatterns = [
    /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>.*?(?:official\s+website|official\s+site|website|visit\s+website)[^<]*<\/a>/i,
    /official\s+website[^<]*<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i,
    /website[^<]*<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i,
  ];
  
  for (const pattern of officialPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const url = match[1].replace(/&amp;/g, '&').split('"')[0].split("'")[0];
      const isExcluded = excludedDomains.some(domain => url.includes(domain));
      if (!isExcluded && (url.includes('.gov') || url.includes('house.gov') || url.includes('congress.gov'))) {
        return url;
      }
    }
  }
  
  // Pattern 2: Look for house.gov or congress.gov links
  const houseGovPattern = /<a[^>]*href="(https?:\/\/(?:www\.)?(?:house\.gov|congress\.gov)[^"]+)"[^>]*>/i;
  const houseMatch = html.match(houseGovPattern);
  if (houseMatch && houseMatch[1]) {
    return houseMatch[1].replace(/&amp;/g, '&').split('"')[0].split("'")[0];
  }
  
  // Pattern 3: Look for external links in infobox or sidebar
  const infoboxMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (infoboxMatch) {
    const infoboxHtml = infoboxMatch[1];
    const links = infoboxHtml.matchAll(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/gi);
    
    for (const linkMatch of links) {
      const url = linkMatch[1].replace(/&amp;/g, '&').split('"')[0].split("'")[0];
      const isExcluded = excludedDomains.some(domain => url.includes(domain));
      
      if (!isExcluded && 
          (url.includes('.gov') || 
           url.includes('house.gov') || 
           url.includes('congress.gov') ||
           (url.includes('http') && !url.includes('wikipedia')))) {
        // Check if it's likely an official site
        if (url.includes('.gov') || url.match(/https?:\/\/(?:www\.)?[a-z-]+\.(?:gov|org|com)/)) {
          return url;
        }
      }
    }
  }
  
  // Pattern 4: Look for any .gov link that's not excluded
  const allLinks = html.matchAll(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/gi);
  for (const linkMatch of allLinks) {
    const url = linkMatch[1].replace(/&amp;/g, '&').split('"')[0].split("'")[0];
    const isExcluded = excludedDomains.some(domain => url.includes(domain));
    
    if (!isExcluded && url.includes('.gov') && !url.includes('wikipedia')) {
      return url;
    }
  }
  
  return null;
}

async function findWebsiteFromWikipedia(wikipediaUrl: string): Promise<string | null> {
  const html = await fetchPage(wikipediaUrl);
  if (!html) return null;
  
  return extractOfficialWebsite(html, wikipediaUrl);
}

async function findWebsiteFromHouseGov(name: string, state: string): Promise<string | null> {
  // Try to find house.gov member page
  // Format is usually: https://[name].house.gov or https://house.gov/[name]
  // But this is unreliable, so we'll primarily use Wikipedia
  
  // For now, return null - we'll rely on Wikipedia scraping
  return null;
}

async function main() {
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  
  console.log('📊 Find Representative Websites Script');
  console.log('======================================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');
  
  if (!pbAdminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }
  
  const pb = new PocketBase(pbUrl);
  
  try {
    await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
    console.log('✅ Authenticated as admin');
    console.log('');
    
    const representatives = await pb.collection('politicians').getFullList({
      filter: `current_position="U.S. Representative"`,
    });
    
    console.log(`📄 Found ${representatives.length} representatives`);
    console.log('');
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ name: string; error: string }> = [];
    
    // Filter to only those without websites
    const withoutWebsites = representatives.filter(r => !r.website_url || r.website_url === '');
    console.log(`📊 ${withoutWebsites.length} representatives need websites`);
    console.log('');
    
    for (let i = 0; i < withoutWebsites.length; i++) {
      const rep = withoutWebsites[i];
      
      console.log(`[${i + 1}/${withoutWebsites.length}] 🔍 ${rep.name} (${rep.state})`);
      
      try {
        let website: string | null = null;
        
        // Try Wikipedia first
        if (rep.wikipedia_url) {
          website = await findWebsiteFromWikipedia(rep.wikipedia_url);
          if (website) {
            console.log(`  ✅ Found website: ${website}`);
          }
        }
        
        // If not found, try house.gov (for future enhancement)
        if (!website) {
          website = await findWebsiteFromHouseGov(rep.name, rep.state || '');
        }
        
        if (website) {
          await pb.collection('politicians').update(rep.id, {
            website_url: website,
          });
          updatedCount++;
        } else {
          console.log(`  ⏭️  No website found`);
          skippedCount++;
        }
        
        // Be nice to servers
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err: any) {
        errorCount++;
        const errorMsg = err?.message || 'Unknown error';
        errors.push({ name: rep.name, error: errorMsg });
        console.log(`  ❌ Error: ${errorMsg}`);
      }
    }
    
    console.log('');
    console.log('📊 Summary:');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log('');
      console.log('Errors:');
      errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
    } else if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
    
  } catch (authErr: any) {
    console.error('❌ Failed to authenticate with PocketBase:', authErr?.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Website search complete!');
}

main().catch(console.error);
