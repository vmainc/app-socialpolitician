/**
 * Scrape office start dates for senators
 * 
 * Checks senator websites and Wikipedia for "Assumed Office" or "Took Office" dates
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/scrapeSenatorOfficeDates.ts
 */

import PocketBase from 'pocketbase';

// Extract date from text - handles various formats
function extractDate(text: string): string | null {
  // Common date patterns
  const patterns = [
    // YYYY-MM-DD format
    /(\d{4}-\d{2}-\d{2})/,
    // Month DD, YYYY format
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
    // MM/DD/YYYY format
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // DD Month YYYY format
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let dateStr = match[0];
        
        // Convert month names to numbers if needed
        const monthMap: Record<string, string> = {
          'january': '01', 'february': '02', 'march': '03', 'april': '04',
          'may': '05', 'june': '06', 'july': '07', 'august': '08',
          'september': '09', 'october': '10', 'november': '11', 'december': '12'
        };
        
        // Handle "Month DD, YYYY" format
        if (match[1] && monthMap[match[1].toLowerCase()]) {
          const month = monthMap[match[1].toLowerCase()];
          const day = match[2].padStart(2, '0');
          const year = match[3];
          dateStr = `${year}-${month}-${day}`;
        }
        // Handle "DD Month YYYY" format
        else if (match[2] && monthMap[match[2].toLowerCase()]) {
          const day = match[1].padStart(2, '0');
          const month = monthMap[match[2].toLowerCase()];
          const year = match[3];
          dateStr = `${year}-${month}-${day}`;
        }
        // Handle MM/DD/YYYY format
        else if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const month = parts[0].padStart(2, '0');
            const day = parts[1].padStart(2, '0');
            const year = parts[2];
            dateStr = `${year}-${month}-${day}`;
          }
        }
        
        // Validate date
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          // Check if date is reasonable (not before 1900, not in future)
          const year = date.getFullYear();
          if (year >= 1900 && year <= new Date().getFullYear()) {
            return dateStr.split('T')[0]; // Return YYYY-MM-DD format
          }
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }
  
  return null;
}

// Extract office start date from HTML
function extractOfficeDate(html: string): string | null {
  const normalizedHtml = html.toLowerCase();
  
  // Look for common patterns indicating office start date
  const datePatterns = [
    /assumed\s+office[:\s]+([^<\n]+)/i,
    /took\s+office[:\s]+([^<\n]+)/i,
    /sworn\s+in[:\s]+([^<\n]+)/i,
    /since[:\s]+([^<\n]+)/i,
    /office\s+since[:\s]+([^<\n]+)/i,
    /serving\s+since[:\s]+([^<\n]+)/i,
    /elected[:\s]+([^<\n]+)/i,
    /inaugurated[:\s]+([^<\n]+)/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const dateText = match[1].trim();
      const date = extractDate(dateText);
      if (date) {
        return date;
      }
    }
  }
  
  // Also check for dates near "senator" or "senate"
  const senatorDatePattern = /senator[^<]*?(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i;
  const senatorMatch = html.match(senatorDatePattern);
  if (senatorMatch && senatorMatch[1]) {
    const date = extractDate(senatorMatch[1]);
    if (date) {
      return date;
    }
  }
  
  return null;
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

async function fetchWikipediaPage(wikipediaUrl: string): Promise<string | null> {
  try {
    const response = await fetch(wikipediaUrl, {
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
  
  console.log('📊 Senator Office Date Scraper');
  console.log('==========================');
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
    
    const senators = await pb.collection('politicians').getFullList({
      filter: `current_position="U.S. Senator"`,
    });
    
    console.log(`📄 Found ${senators.length} senators`);
    console.log('');
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ name: string; error: string }> = [];
    
    // Process each senator
    for (let i = 0; i < senators.length; i++) {
      const senator = senators[i];
      
      // Skip if already has date
      if (senator.position_start_date) {
        console.log(`[${i + 1}/${senators.length}] ⏭️  ${senator.name}: Already has date (${senator.position_start_date})`);
        skippedCount++;
        continue;
      }
      
      console.log(`[${i + 1}/${senators.length}] 🔍 ${senator.name}`);
      
      try {
        let officeDate: string | null = null;
        
        // Try senator website first
        if (senator.website_url) {
          const html = await fetchWebsite(senator.website_url);
          if (html) {
            officeDate = extractOfficeDate(html);
            if (officeDate) {
              console.log(`  ✅ Found on website: ${officeDate}`);
            }
          }
        }
        
        // If not found, try Wikipedia
        if (!officeDate && senator.wikipedia_url) {
          const html = await fetchWikipediaPage(senator.wikipedia_url);
          if (html) {
            officeDate = extractOfficeDate(html);
            if (officeDate) {
              console.log(`  ✅ Found on Wikipedia: ${officeDate}`);
            }
          }
        }
        
        if (officeDate) {
          await pb.collection('politicians').update(senator.id, {
            position_start_date: officeDate,
          });
          updatedCount++;
        } else {
          console.log(`  ℹ️  No office date found`);
          skippedCount++;
        }
        
        // Be nice to the servers
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err: any) {
        errorCount++;
        const errorMsg = err?.message || 'Unknown error';
        errors.push({ name: senator.name, error: errorMsg });
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
  console.log('✅ Scraping complete!');
}

main().catch(console.error);
