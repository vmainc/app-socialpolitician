/**
 * Enrich governors with websites and social media from NGA
 * 
 * Source: https://www.nga.org/governors/
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/enrichGovernorsFromNGA.ts
 */

import PocketBase from 'pocketbase';

interface NGAGovernorData {
  name: string;
  state: string;
  website_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  tiktok_url?: string | null;
}

function normalizeName(name: string): string {
  // Remove titles and clean up
  return name
    .replace(/^Gov\.\s*/i, '')
    .replace(/^Governor\s*/i, '')
    .trim();
}

function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Extract social media links from HTML
function extractSocialMediaLinks(html: string, baseUrl: string): {
  facebook_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  tiktok_url?: string | null;
} {
  const links: any = {};
  
  const normalizedHtml = html
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  
  const patterns = {
    facebook: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com)\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*facebook\.com\/[^"'\s<>]+)/gi,
    ],
    youtube: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*youtube\.com\/[^"'\s<>]+)/gi,
    ],
    instagram: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*instagram\.com\/[^"'\s<>]+)/gi,
    ],
    twitter: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*twitter\.com\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*x\.com\/[^"'\s<>]+)/gi,
    ],
    linkedin: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*linkedin\.com\/[^"'\s<>]+)/gi,
    ],
    tiktok: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*tiktok\.com\/[^"'\s<>]+)/gi,
    ],
  };
  
  for (const [platform, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const matches = normalizedHtml.matchAll(regex);
      for (const match of matches) {
        let url = match[1];
        
        if (url && !url.startsWith('http')) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          } else if (url.startsWith('/')) {
            url = `${baseUrl}${url}`;
          } else {
            continue;
          }
        }
        
        if (url) {
          url = url.replace(/&amp;/g, '&').split('"')[0].split("'")[0].split('?')[0];
          
          if (platform === 'facebook' && !links.facebook_url && url.includes('facebook.com')) {
            links.facebook_url = url;
          } else if (platform === 'youtube' && !links.youtube_url && url.includes('youtube.com')) {
            links.youtube_url = url;
          } else if (platform === 'instagram' && !links.instagram_url && url.includes('instagram.com')) {
            links.instagram_url = url;
          } else if (platform === 'twitter' && !links.x_url && (url.includes('twitter.com') || url.includes('x.com'))) {
            links.x_url = url;
          } else if (platform === 'linkedin' && !links.linkedin_url && url.includes('linkedin.com')) {
            links.linkedin_url = url;
          } else if (platform === 'tiktok' && !links.tiktok_url && url.includes('tiktok.com')) {
            links.tiktok_url = url;
          }
        }
      }
    }
  }
  
  return links;
}

// Parse NGA governors page
function parseNGAPage(html: string): NGAGovernorData[] {
  const governors: NGAGovernorData[] = [];
  
  // Extract governor entries from list items
  // Structure: <li><a href="..."><div><small class="state">State</small>Gov. Name</div></a></li>
  const listItems = html.match(/<li[^>]*>[\s\S]*?current-governors__item[\s\S]*?<\/li>/gi) || [];
  
  const seen = new Set<string>();
  
  for (const item of listItems) {
    // Extract link
    const linkMatch = item.match(/<a[^>]*href="([^"]+)"[^>]*>/i);
    if (!linkMatch) continue;
    
    const link = linkMatch[1];
    
    // Extract state from <small class="state">State</small>
    const stateMatch = item.match(/<small[^>]*class="state"[^>]*>([^<]+)<\/small>/i);
    if (!stateMatch) continue;
    
    const state = stateMatch[1].trim();
    
    // Extract governor name from text after state (usually "Gov. Name")
    const nameMatch = item.match(/Gov\.\s+([^<\n]+)/i);
    if (!nameMatch) continue;
    
    const name = normalizeName(nameMatch[1].trim());
    
    if (!name || !state) continue;
    
    // Skip if we've seen this governor already
    const key = `${name}-${state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    // Extract website URL
    let websiteUrl: string | null = null;
    if (link.startsWith('http')) {
      websiteUrl = link;
    } else if (link.startsWith('/')) {
      websiteUrl = `https://www.nga.org${link}`;
    }
    
    governors.push({
      name: name,
      state: state,
      website_url: websiteUrl,
    });
  }
  
  return governors;
}

async function fetchNGAPage(): Promise<string> {
  const response = await fetch('https://www.nga.org/governors/');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.text();
}

async function fetchGovernorPage(url: string): Promise<string | null> {
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

function matchGovernorByName(ngaGov: NGAGovernorData, pbGov: any): boolean {
  const ngaName = ngaGov.name.toLowerCase().replace(/[^a-z\s]/g, '');
  const pbName = pbGov.name.toLowerCase().replace(/[^a-z\s]/g, '');
  
  // Extract last names
  const ngaLast = ngaName.split(' ').pop() || '';
  const pbLast = pbName.split(' ').pop() || '';
  
  // Match if last names match and states match
  if (ngaLast === pbLast && ngaLast.length > 2) {
    const ngaState = ngaGov.state.toLowerCase();
    const pbState = (pbGov.state || '').toLowerCase();
    
    if (ngaState === pbState || 
        ngaState.includes(pbState) || 
        pbState.includes(ngaState)) {
      return true;
    }
  }
  
  return false;
}

async function main() {
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  
  console.log('📊 NGA Governor Enrichment Script');
  console.log('==========================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');
  
  if (!pbAdminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }
  
  // Fetch NGA page
  let ngaHtml: string;
  try {
    ngaHtml = await fetchNGAPage();
    console.log('✅ Fetched NGA page');
  } catch (error: any) {
    console.error('❌ Failed to fetch NGA page:', error.message);
    process.exit(1);
  }
  
  // Parse governors from NGA
  const ngaGovernors = parseNGAPage(ngaHtml);
  console.log(`📄 Found ${ngaGovernors.length} governors on NGA page`);
  console.log('');
  
  // Get governors from PocketBase
  const pb = new PocketBase(pbUrl);
  
  try {
    await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
    console.log('✅ Authenticated as admin');
    
    const pbGovernors = await pb.collection('politicians').getFullList({
      filter: `current_position="Governor"`,
    });
    
    console.log(`📄 Found ${pbGovernors.length} governors in PocketBase`);
    console.log('');
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ name: string; error: string }> = [];
    
    // Match and enrich governors
    for (let i = 0; i < pbGovernors.length; i++) {
      const pbGov = pbGovernors[i];
      
      // Find matching NGA governor
      const ngaMatch = ngaGovernors.find(nga => matchGovernorByName(nga, pbGov));
      
      if (!ngaMatch) {
        console.log(`[${i + 1}/${pbGovernors.length}] ⏭️  ${pbGov.name}: No NGA match`);
        skippedCount++;
        continue;
      }
      
      console.log(`[${i + 1}/${pbGovernors.length}] 🔍 ${pbGov.name} (${pbGov.state})`);
      
      try {
        const updateData: any = {};
        let hasUpdates = false;
        
        // Update website URL if NGA has one
        if (ngaMatch.website_url && ngaMatch.website_url.includes('nga.org')) {
          // This is an NGA profile page, try to find actual governor website
          const ngaProfileHtml = await fetchGovernorPage(ngaMatch.website_url);
          if (ngaProfileHtml) {
            // Look for official website link on NGA profile page
            // Try multiple patterns
            let officialWebsite: string | null = null;
            
            // Pattern 1: Direct link to governor website
            const websitePatterns = [
              /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>.*?(?:official\s+website|website|visit|go to|governor.*?website)[^<]*<\/a>/i,
              /<a[^>]*href="(https?:\/\/[^"]+gov[^"]*)"[^>]*>/i,
              /<a[^>]*href="(https?:\/\/[^"]+governor[^"]*)"[^>]*>/i,
              /website[^<]*<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i,
            ];
            
            for (const pattern of websitePatterns) {
              const match = ngaProfileHtml.match(pattern);
              if (match && match[1] && !match[1].includes('nga.org')) {
                officialWebsite = match[1];
                break;
              }
            }
            
            // If not found, look for any external link that might be the website
            if (!officialWebsite) {
              const allLinks = ngaProfileHtml.matchAll(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/gi);
              const excludedDomains = [
                'nga.org', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
                'youtube.com', 'linkedin.com', 'flickr.com', 'pinterest.com',
                'tiktok.com', 'snapchat.com', 'reddit.com', 'wikipedia.org'
              ];
              
              for (const linkMatch of allLinks) {
                const url = linkMatch[1];
                const isExcluded = excludedDomains.some(domain => url.includes(domain));
                
                if (!isExcluded && 
                    (url.includes('.gov') || url.includes('/gov') || url.includes('governor'))) {
                  officialWebsite = url;
                  break;
                }
              }
            }
            
            if (officialWebsite) {
              updateData.website_url = officialWebsite;
              hasUpdates = true;
              console.log(`  ✅ Found official website: ${officialWebsite}`);
              
              // Now scrape social media from the official website
              const officialSiteHtml = await fetchGovernorPage(officialWebsite);
              if (officialSiteHtml) {
                const baseUrl = new URL(officialWebsite).origin;
                const socialLinks = extractSocialMediaLinks(officialSiteHtml, baseUrl);
                
                if (socialLinks.facebook_url) {
                  updateData.facebook_url = socialLinks.facebook_url;
                  hasUpdates = true;
                }
                if (socialLinks.youtube_url) {
                  updateData.youtube_url = socialLinks.youtube_url;
                  hasUpdates = true;
                }
                if (socialLinks.instagram_url) {
                  updateData.instagram_url = socialLinks.instagram_url;
                  hasUpdates = true;
                }
                if (socialLinks.x_url) {
                  updateData.x_url = socialLinks.x_url;
                  hasUpdates = true;
                }
                if (socialLinks.linkedin_url) {
                  updateData.linkedin_url = socialLinks.linkedin_url;
                  hasUpdates = true;
                }
                if (socialLinks.tiktok_url) {
                  updateData.tiktok_url = socialLinks.tiktok_url;
                  hasUpdates = true;
                }
                
                if (Object.keys(socialLinks).length > 0) {
                  const platforms = Object.keys(socialLinks).filter(k => socialLinks[k]).map(k => k.replace('_url', '').toUpperCase()).join(', ');
                  console.log(`  ✅ Found social media: ${platforms}`);
                }
              }
            } else {
              // Extract social media links from NGA profile as fallback
              const baseUrl = new URL(ngaMatch.website_url).origin;
              const socialLinks = extractSocialMediaLinks(ngaProfileHtml, baseUrl);
              
              if (socialLinks.facebook_url) {
                updateData.facebook_url = socialLinks.facebook_url;
                hasUpdates = true;
              }
              if (socialLinks.youtube_url) {
                updateData.youtube_url = socialLinks.youtube_url;
                hasUpdates = true;
              }
              if (socialLinks.instagram_url) {
                updateData.instagram_url = socialLinks.instagram_url;
                hasUpdates = true;
              }
              if (socialLinks.x_url) {
                updateData.x_url = socialLinks.x_url;
                hasUpdates = true;
              }
              if (socialLinks.linkedin_url) {
                updateData.linkedin_url = socialLinks.linkedin_url;
                hasUpdates = true;
              }
              if (socialLinks.tiktok_url) {
                updateData.tiktok_url = socialLinks.tiktok_url;
                hasUpdates = true;
              }
              
              if (Object.keys(socialLinks).length > 0) {
                const platforms = Object.keys(socialLinks).filter(k => socialLinks[k]).map(k => k.replace('_url', '').toUpperCase()).join(', ');
                console.log(`  ✅ Found social media (from NGA): ${platforms}`);
              }
            }
          }
        }
        
        if (hasUpdates) {
          await pb.collection('politicians').update(pbGov.id, updateData);
          updatedCount++;
        } else {
          console.log(`  ℹ️  No new data found`);
          skippedCount++;
        }
        
        // Be nice to servers
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err: any) {
        errorCount++;
        const errorMsg = err?.message || 'Unknown error';
        errors.push({ name: pbGov.name, error: errorMsg });
        console.log(`  ❌ Error: ${errorMsg}`);
      }
    }
    
    console.log('');
    console.log('📊 Summary:');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('');
      console.log('Errors:');
      errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
    }
    
  } catch (authErr: any) {
    console.error('❌ Failed to authenticate with PocketBase:', authErr?.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Enrichment complete!');
}

main().catch(console.error);
