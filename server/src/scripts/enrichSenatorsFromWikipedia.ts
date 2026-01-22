/**
 * Enrich senators with Wikipedia data
 * 
 * Source: https://en.wikipedia.org/wiki/List_of_current_United_States_senators
 * 
 * Usage:
 *   POCKETBASE_URL=http://127.0.0.1:8091 \
 *   POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
 *   POCKETBASE_ADMIN_PASSWORD=password \
 *   npx tsx server/src/scripts/enrichSenatorsFromWikipedia.ts
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

interface WikipediaSenatorData {
  name: string;
  wikipediaTitle: string;
  wikipediaUrl: string;
  state: string;
  party: string;
  // Additional fields that might be available
  born?: string;
  assumedOffice?: string;
  previousOffice?: string;
}

function normalizeName(name: string): string {
  // Remove common suffixes and clean up
  return name
    .replace(/\s*\(.*?\)\s*/g, '') // Remove parenthetical content
    .replace(/\s*\[.*?\]\s*/g, '') // Remove bracketed content
    .trim();
}

function extractWikipediaTitle(link: string): string {
  // Extract title from Wikipedia URL
  // Format: /wiki/Title or https://en.wikipedia.org/wiki/Title
  const match = link.match(/\/wiki\/(.+)$/);
  if (match) {
    return decodeURIComponent(match[1].replace(/_/g, ' '));
  }
  return '';
}

// Parse Wikipedia table - simpler approach: find all senator name links
function parseWikipediaTable(html: string): WikipediaSenatorData[] {
  const senators: WikipediaSenatorData[] = [];
  
  // Find the senators table (id="senators")
  const tableMatch = html.match(/<table[^>]*id="senators"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    console.log('⚠️  Could not find senators table, trying alternative method...');
    // Fallback: find any table with senator links
    return parseWikipediaTableFallback(html);
  }
  
  const tableHtml = tableMatch[1];
  
  // Extract all links to senator Wikipedia pages
  // Pattern: <a href="/wiki/Name" title="Name">Name</a> or <a href="/wiki/Name">Name</a>
  const linkRegex = /<a[^>]*href="(\/wiki\/[^"]+)"[^>]*(?:title="([^"]+)")?[^>]*>([^<]+)<\/a>/gi;
  const seenUrls = new Set<string>();
  
  let linkMatch;
  while ((linkMatch = linkRegex.exec(tableHtml)) !== null) {
    const url = linkMatch[1];
    const title = linkMatch[2] || linkMatch[3];
    const text = linkMatch[3];
    
    // Skip if not a person page or already seen
    if (seenUrls.has(url) || 
        url.includes('List_of') || 
        url.includes('Category:') ||
        url.includes('File:') ||
        url.includes('Template:') ||
        !url.includes('_')) {
      continue;
    }
    
    const wikipediaUrl = `https://en.wikipedia.org${url}`;
    const wikipediaTitle = extractWikipediaTitle(url);
    const name = normalizeName(text || title);
    
    if (name && name.length > 3) {
      senators.push({
        name: name,
        wikipediaTitle: wikipediaTitle,
        wikipediaUrl: wikipediaUrl,
        state: '',
        party: '',
      });
      seenUrls.add(url);
    }
  }
  
  return senators;
}

// Fallback parser: find all senator name links in the page
function parseWikipediaTableFallback(html: string): WikipediaSenatorData[] {
  const senators: WikipediaSenatorData[] = [];
  const seenUrls = new Set<string>();
  
  // Find all links that look like senator names
  // Look for links with underscores (person pages) near "senator" context
  const sections = html.split(/<h[23][^>]*>/i);
  
  for (const section of sections) {
    if (!section.toLowerCase().includes('senator')) continue;
    
    const linkRegex = /<a[^>]*href="(\/wiki\/[^"]+)"[^>]*(?:title="([^"]+)")?[^>]*>([^<]+)<\/a>/gi;
    let linkMatch;
    
    while ((linkMatch = linkRegex.exec(section)) !== null) {
      const url = linkMatch[1];
      const title = linkMatch[2] || linkMatch[3];
      const text = linkMatch[3];
      
      // Only include person pages (have underscore, not lists/categories)
      if (seenUrls.has(url) || 
          !url.includes('_') ||
          url.includes('List_of') || 
          url.includes('Category:') ||
          url.includes('File:') ||
          url.includes('Template:')) {
        continue;
      }
      
      const wikipediaUrl = `https://en.wikipedia.org${url}`;
      const wikipediaTitle = extractWikipediaTitle(url);
      const name = normalizeName(text || title);
      
      if (name && name.length > 3 && name.split(' ').length >= 2) {
        senators.push({
          name: name,
          wikipediaTitle: wikipediaTitle,
          wikipediaUrl: wikipediaUrl,
          state: '',
          party: '',
        });
        seenUrls.add(url);
      }
    }
  }
  
  return senators;
}

async function fetchSenatorsFromWikipedia(): Promise<WikipediaSenatorData[]> {
  console.log('📡 Fetching senators from Wikipedia...');
  
  try {
    const response = await fetch('https://en.wikipedia.org/wiki/List_of_current_United_States_senators');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    console.log(`✅ Fetched HTML (${html.length} bytes)`);
    
    const senators = parseWikipediaTable(html);
    console.log(`✅ Parsed ${senators.length} senators from Wikipedia`);
    
    return senators;
  } catch (error: any) {
    console.error('❌ Error fetching from Wikipedia:', error.message);
    throw error;
  }
}

// Common name variations/nicknames
const nameVariations: Record<string, string[]> = {
  'richard': ['dick', 'rick', 'rich'],
  'charles': ['chuck', 'charlie'],
  'james': ['jim', 'jimmy'],
  'robert': ['bob', 'rob'],
  'william': ['bill', 'will', 'billy'],
  'joseph': ['joe', 'joey'],
  'thomas': ['tom', 'tommy'],
  'michael': ['mike', 'mikey'],
  'christopher': ['chris'],
  'benjamin': ['ben'],
  'edward': ['ed', 'eddie'],
  'daniel': ['dan', 'danny'],
  'kenneth': ['ken', 'kenny'],
  'timothy': ['tim'],
  'anthony': ['tony'],
  'patrick': ['pat'],
  'raymond': ['ray'],
  'lawrence': ['larry'],
  'stephen': ['steve'],
  'jeffrey': ['jeff'],
  'angus': ['gus'],
};

function normalizeFirstName(firstName: string): string[] {
  const lower = firstName.toLowerCase();
  const variations = [lower];
  
  // Add known variations
  if (nameVariations[lower]) {
    variations.push(...nameVariations[lower]);
  }
  
  // Also add if it's a variation of another name
  for (const [full, vars] of Object.entries(nameVariations)) {
    if (vars.includes(lower)) {
      variations.push(full);
      variations.push(...vars);
    }
  }
  
  return variations;
}

function matchSenatorByName(wikiSenator: WikipediaSenatorData, pbSenator: any): boolean {
  // Normalize names (remove Jr., Sr., accents, etc.)
  const normalizeForMatching = (name: string): string => {
    return name.toLowerCase()
      .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
      .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&uuml;/g, 'ü')
      .replace(/&ntilde;/g, 'ñ')
      .replace(/[^a-záéíóúüñ\s]/g, '')
      .replace(/[,\.]/g, '')
      .replace(/\s+jr\.?\s*$/i, '')
      .replace(/\s+sr\.?\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  // Normalize names (remove Jr., Sr., etc., and fix accents)
  const wikiNameNormalized = normalizeForMatching(wikiSenator.name);
  const pbNameNormalized = normalizeForMatching(pbSenator.name);
  
  // Handle special cases with known Wikipedia titles
  const knownMatches: Record<string, string> = {
    'richard j durbin': 'dick durbin',
    'richard durbin': 'dick durbin',
    'charles e schumer': 'chuck schumer',
    'charles schumer': 'chuck schumer',
    'margaret wood hassan': 'maggie hassan',
    'james c justice': 'jim justice',
    'ben ray lujan': 'ben ray lujan',
    'james e risch': 'jim risch',
    'angus s king': 'angus king',
    'angus king': 'angus king',
  };
  
  // Check known matches with normalized names
  for (const [pb, wiki] of Object.entries(knownMatches)) {
    if (pbNameNormalized.includes(pb) && wikiNameNormalized.includes(wiki)) {
      return true;
    }
  }
  
  // Use normalized names for matching
  const wikiName = wikiNameNormalized;
  const pbName = pbNameNormalized;
  
  // Extract last name from both
  const wikiParts = wikiName.split(' ').filter(p => p.length > 0);
  const pbParts = pbName.split(' ').filter(p => p.length > 0);
  
  const wikiLast = wikiParts[wikiParts.length - 1] || '';
  const pbLast = pbParts[pbParts.length - 1] || '';
  
  // Match if last names match
  if (wikiLast === pbLast && wikiLast.length > 2) {
    const wikiFirst = wikiParts[0] || '';
    const pbFirst = pbParts[0] || '';
    
    // Get name variations
    const wikiFirstVariations = normalizeFirstName(wikiFirst);
    const pbFirstVariations = normalizeFirstName(pbFirst);
    
    // Check if any variations match
    const firstMatch = wikiFirstVariations.some(w => pbFirstVariations.includes(w)) ||
                      pbFirstVariations.some(p => wikiFirstVariations.includes(p));
    
    if (firstMatch || 
        wikiFirst === pbFirst || 
        wikiFirst.includes(pbFirst) || 
        pbFirst.includes(wikiFirst) ||
        (wikiFirst.length > 2 && pbFirst.length > 2 && 
         (wikiFirst.substring(0, 3) === pbFirst.substring(0, 3)))) {
      return true;
    }
  }
  
  // Also try state match if available
  if (wikiSenator.state && pbSenator.state) {
    const wikiState = wikiSenator.state.toLowerCase();
    const pbState = pbSenator.state.toLowerCase();
    
    // Match state abbreviations or full names
    if (wikiState === pbState || 
        (wikiState.length === 2 && pbState.includes(wikiState)) ||
        (pbState.length === 2 && wikiState.includes(pbState))) {
      // If states match, check if last names match
      if (wikiLast === pbLast && wikiLast.length > 2) {
        return true;
      }
    }
  }
  
  return false;
}

async function main() {
  const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8091';
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@vma.agency';
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  
  console.log('📊 Wikipedia Enrichment Script');
  console.log('==========================');
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log('');
  
  if (!pbAdminPassword) {
    console.error('❌ POCKETBASE_ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }
  
  // Fetch senators from Wikipedia
  let wikiSenators: WikipediaSenatorData[];
  try {
    wikiSenators = await fetchSenatorsFromWikipedia();
  } catch (error: any) {
    console.error('❌ Failed to fetch from Wikipedia:', error.message);
    process.exit(1);
  }
  
  if (wikiSenators.length === 0) {
    console.error('❌ No senators found in Wikipedia');
    process.exit(1);
  }
  
  console.log(`📄 Found ${wikiSenators.length} senators in Wikipedia`);
  console.log('');
  
  // Get senators from PocketBase
  const pb = new PocketBase(pbUrl);
  
  try {
    await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
    console.log('✅ Authenticated as admin');
    
    const pbSenators = await pb.collection('politicians').getFullList({
      filter: `current_position="U.S. Senator"`,
    });
    
    console.log(`📄 Found ${pbSenators.length} senators in PocketBase`);
    console.log('');
    
    let matchedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: Array<{ name: string; error: string }> = [];
    const unmatched: string[] = [];
    
    // Match and update senators
    for (const pbSenator of pbSenators) {
      // Fix HTML entities in name
      let pbName = pbSenator.name;
      if (pbName.includes('&')) {
        pbName = pbName.replace(/&aacute;/g, 'á')
                       .replace(/&eacute;/g, 'é')
                       .replace(/&iacute;/g, 'í')
                       .replace(/&oacute;/g, 'ó')
                       .replace(/&uacute;/g, 'ú')
                       .replace(/&uuml;/g, 'ü')
                       .replace(/&ntilde;/g, 'ñ');
        // Update the name in the record if it had entities
        if (pbName !== pbSenator.name) {
          try {
            await pb.collection('politicians').update(pbSenator.id, { name: pbName });
            pbSenator.name = pbName;
          } catch (e) {
            // Ignore update errors
          }
        }
      }
      
      // Find matching Wikipedia senator
      const wikiMatch = wikiSenators.find(w => matchSenatorByName(w, pbSenator));
      
      if (wikiMatch) {
        matchedCount++;
        
        try {
          // Update with Wikipedia data
          const updateData: any = {
            wikipedia_url: wikiMatch.wikipediaUrl,
          };
          
          // Only update fields that exist and are not already set
          if (wikiMatch.wikipediaTitle && !pbSenator.wikipedia_title) {
            updateData.wikipedia_title = wikiMatch.wikipediaTitle;
          }
          
          await pb.collection('politicians').update(pbSenator.id, updateData);
          updatedCount++;
          
          console.log(`✅ ${pbSenator.name}: ${wikiMatch.wikipediaUrl}`);
        } catch (err: any) {
          errorCount++;
          errors.push({ name: pbSenator.name, error: err?.message || 'Unknown error' });
        }
      } else {
        unmatched.push(pbSenator.name);
      }
    }
    
    console.log('');
    console.log(`✅ Matched: ${matchedCount}`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⚠️  Unmatched: ${unmatched.length}`);
    
    if (unmatched.length > 0 && unmatched.length <= 20) {
      console.log('');
      console.log('Unmatched senators:');
      unmatched.forEach(name => console.log(`  - ${name}`));
    }
    
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
