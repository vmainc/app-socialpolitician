/**
 * Scrape social media links from representative official websites
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/scrapeRepresentativeSocialMedia.ts
 */

import PocketBase from 'pocketbase';

interface SocialMediaLinks {
  facebook_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  tiktok_url?: string | null;
  truth_social_url?: string | null;
}

// Extract social media links from HTML
function extractSocialMediaLinks(html: string, baseUrl: string): SocialMediaLinks {
  const links: SocialMediaLinks = {};
  
  // Normalize HTML - handle encoded entities and different quote styles
  const normalizedHtml = html
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // More comprehensive patterns for social media links
  const patterns = {
    facebook: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com)\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*facebook\.com\/[^"'\s<>]+)/gi,
      /facebook\.com\/([a-zA-Z0-9.]+)/gi, // Extract username from anywhere
    ],
    youtube: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*youtube\.com\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*youtu\.be\/[^"'\s<>]+)/gi,
      /youtube\.com\/(?:channel\/|user\/|@)?([a-zA-Z0-9_-]+)/gi, // Extract channel/user
    ],
    instagram: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*instagram\.com\/[^"'\s<>]+)/gi,
      /instagram\.com\/([a-zA-Z0-9_.]+)/gi, // Extract username
    ],
    twitter: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*twitter\.com\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*x\.com\/[^"'\s<>]+)/gi,
      /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/gi, // Extract username
    ],
    linkedin: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*linkedin\.com\/[^"'\s<>]+)/gi,
    ],
    tiktok: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*tiktok\.com\/[^"'\s<>]+)/gi,
    ],
    truth_social: [
      /(?:href|data-href|data-url)=["'](https?:\/\/(?:www\.)?truthsocial\.com\/[^"'\s<>]+)/gi,
      /(?:href|data-href|data-url)=["']([^"']*truthsocial\.com\/[^"'\s<>]+)/gi,
    ],
  };
  
  // Extract links for each platform
  for (const [platform, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const matches = normalizedHtml.matchAll(regex);
      for (const match of matches) {
        let url = match[1] || match[0];
        
        // Handle username-only matches (from patterns that extract usernames)
        if (!url.includes('://') && !url.includes('.')) {
          // This is just a username, construct full URL
          if (platform === 'facebook') {
            url = `https://www.facebook.com/${url}`;
          } else if (platform === 'youtube') {
            url = `https://www.youtube.com/@${url}`;
          } else if (platform === 'instagram') {
            url = `https://www.instagram.com/${url}`;
          } else if (platform === 'twitter') {
            url = `https://www.x.com/${url}`;
          } else {
            continue; // Skip if we can't construct URL
          }
        }
        
        // Clean up URL
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
          // Normalize URL
          url = url.replace(/&amp;/g, '&').split('"')[0].split("'")[0].split('?')[0];
          
          // Map to PocketBase fields
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
          } else if (platform === 'truth_social' && !links.truth_social_url && url.includes('truthsocial.com')) {
            links.truth_social_url = url;
          }
        }
      }
    }
  }
  
  return links;
}

async function fetchWebsite(url: string): Promise<string | null> {
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

async function main() {
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  
  console.log('📊 Scrape Representative Social Media Script');
  console.log('=============================================');
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
    
    // Filter to only those with websites
    const withWebsites = representatives.filter(r => r.website_url && r.website_url !== '');
    console.log(`📊 ${withWebsites.length} representatives have websites`);
    console.log('');
    
    for (let i = 0; i < withWebsites.length; i++) {
      const rep = withWebsites[i];
      
      console.log(`[${i + 1}/${withWebsites.length}] 🔍 ${rep.name} (${rep.state})`);
      
      try {
        if (!rep.website_url) {
          console.log(`  ⏭️  No website URL`);
          skippedCount++;
          continue;
        }
        
        // Fetch website HTML
        const html = await fetchWebsite(rep.website_url);
        if (!html) {
          console.log(`  ⏭️  Could not fetch website`);
          skippedCount++;
          continue;
        }
        
        // Extract social media links
        const baseUrl = new URL(rep.website_url).origin;
        const socialLinks = extractSocialMediaLinks(html, baseUrl);
        
        // Check if we found any new links
        const hasNewLinks = Object.keys(socialLinks).some(key => socialLinks[key as keyof SocialMediaLinks]);
        
        if (hasNewLinks) {
          const updateData: any = {};
          
          if (socialLinks.facebook_url) updateData.facebook_url = socialLinks.facebook_url;
          if (socialLinks.youtube_url) updateData.youtube_url = socialLinks.youtube_url;
          if (socialLinks.instagram_url) updateData.instagram_url = socialLinks.instagram_url;
          if (socialLinks.x_url) updateData.x_url = socialLinks.x_url;
          if (socialLinks.linkedin_url) updateData.linkedin_url = socialLinks.linkedin_url;
          if (socialLinks.tiktok_url) updateData.tiktok_url = socialLinks.tiktok_url;
          if (socialLinks.truth_social_url) updateData.truth_social_url = socialLinks.truth_social_url;
          
          await pb.collection('politicians').update(rep.id, updateData);
          
          const platforms = Object.keys(socialLinks)
            .filter(key => socialLinks[key as keyof SocialMediaLinks])
            .map(key => key.replace('_url', '').toUpperCase())
            .join(', ');
          
          console.log(`  ✅ Found social media: ${platforms}`);
          updatedCount++;
        } else {
          console.log(`  ℹ️  No social media links found`);
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
  console.log('✅ Social media scraping complete!');
}

main().catch(console.error);
