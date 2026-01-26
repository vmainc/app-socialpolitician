#!/usr/bin/env node

/**
 * Fetch Wikipedia URLs for all politicians missing them
 * Uses Wikipedia API to search for politician pages and verify they exist
 * 
 * Usage:
 *   node scripts/fetch_wikipedia_urls.mjs
 * 
 *   # Dry run (default)
 *   DRY_RUN=true node scripts/fetch_wikipedia_urls.mjs
 * 
 *   # Actually update records
 *   DRY_RUN=false node scripts/fetch_wikipedia_urls.mjs
 */

import PocketBase from "pocketbase";
import fetch from "node-fetch";

const PB_BASE_URL = process.env.PB_BASE_URL || "http://127.0.0.1:8091";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || "admin@vma.agency";
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || "VMAmadmia42O200!";
const DRY_RUN = process.env.DRY_RUN !== "false"; // Default to true (dry run)

const pb = new PocketBase(PB_BASE_URL);
const COLLECTION_NAME = "politicians";

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 500ms between requests

async function rateLimitedFetch(url) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SocialPoliticianBot/1.0 (https://socialpolitician.com; contact@socialpolitician.com)"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (error) {
    return null;
  }
}

async function authenticate() {
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log("✅ Authenticated with PocketBase\n");
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);
    process.exit(1);
  }
}

/**
 * Generate Wikipedia page name from politician name
 * Examples: "John Smith" -> "John_Smith", "Ben Ray Luján" -> "Ben_Ray_Luján"
 */
function generateWikipediaPageName(name) {
  if (!name || typeof name !== "string") return null;
  
  // Remove common suffixes
  let cleanName = name
    .replace(/\s+Jr\.?$/i, "")
    .replace(/\s+Sr\.?$/i, "")
    .replace(/\s+III$/i, "")
    .replace(/\s+II$/i, "")
    .trim();
  
  // Replace spaces with underscores
  return cleanName.replace(/\s+/g, "_");
}

/**
 * Search Wikipedia for a politician page
 * Returns the full Wikipedia URL if found, null otherwise
 */
async function findWikipediaUrl(politicianName) {
  if (!politicianName || typeof politicianName !== "string") {
    return null;
  }

  const pageName = generateWikipediaPageName(politicianName);
  if (!pageName) return null;

  // Try direct page lookup first
  const directUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageName)}`;
  
  try {
    const response = await rateLimitedFetch(directUrl);
    if (response && response.ok) {
      const html = await response.text();
      // Check if page exists (not a disambiguation or redirect page)
      if (!html.includes('class="mw-disambig"') && !html.includes('This is a redirect')) {
        return directUrl;
      }
    }
  } catch (error) {
    // Continue to search API
  }

  // If direct lookup fails, use Wikipedia search API
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(politicianName)}&srlimit=5&format=json&srnamespace=0`;
    const response = await rateLimitedFetch(searchUrl);
    
    if (!response || !response.ok) return null;
    
    const data = await response.json();
    const results = data?.query?.search || [];
    
    if (results.length === 0) return null;
    
    // Look for exact name match in results
    const nameLower = politicianName.toLowerCase();
    for (const result of results) {
      const titleLower = result.title.toLowerCase();
      // Check if the title contains the politician's name (allowing for middle names, etc.)
      if (titleLower.includes(nameLower) || nameLower.includes(titleLower.split("(")[0].trim())) {
        return `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`;
      }
    }
    
    // If no exact match, use first result (might be close enough)
    if (results[0]) {
      return `https://en.wikipedia.org/wiki/${encodeURIComponent(results[0].title)}`;
    }
  } catch (error) {
    console.error(`   ⚠️  Search API error: ${error.message}`);
    return null;
  }

  return null;
}

async function fetchWikipediaUrls() {
  console.log("🔍 Fetching Wikipedia URLs for Politicians");
  console.log("=" .repeat(60));
  console.log(`📋 Collection: ${COLLECTION_NAME}`);
  console.log(`🌐 PocketBase URL: ${PB_BASE_URL}`);
  console.log(`🔍 Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will update records)"}\n`);

  await authenticate();

  let page = 1;
  const perPage = 200;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  while (true) {
    try {
      const result = await pb.collection(COLLECTION_NAME).getList(page, perPage, {
        requestKey: null,
      });

      if (!result.items || result.items.length === 0) {
        break;
      }

      console.log(`📄 Processing page ${page} (${result.items.length} records)...`);

      for (const record of result.items) {
        totalProcessed++;

        const name = record.name || record.slug || record.id;
        const existingWikiUrl = record.wikipedia_url || "";

        // Skip if already has Wikipedia URL
        if (existingWikiUrl && existingWikiUrl.trim().length > 0) {
          totalSkipped++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`  [DRY RUN] Would search Wikipedia for: ${name}`);
        } else {
          process.stdout.write(`  🔍 Searching: ${name}... `);
        }

        try {
          const wikiUrl = await findWikipediaUrl(name);

          if (wikiUrl) {
            if (DRY_RUN) {
              console.log(`    → Found: ${wikiUrl}`);
              totalUpdated++;
            } else {
              await pb.collection(COLLECTION_NAME).update(record.id, {
                wikipedia_url: wikiUrl,
              });
              console.log(`✅ Found: ${wikiUrl}`);
              totalUpdated++;
            }
          } else {
            if (DRY_RUN) {
              console.log(`    → Not found`);
            } else {
              console.log(`❌ Not found`);
            }
            totalNotFound++;
          }
        } catch (error) {
          console.error(`\n  ❌ Error processing ${name}: ${error.message}`);
        }
      }

      if (page >= result.totalPages) {
        break;
      }

      page++;
    } catch (error) {
      console.error(`❌ Error processing page ${page}:`, error.message);
      break;
    }
  }

  // Summary
  console.log("\n" + "=" .repeat(60));
  console.log("📊 Wikipedia URL Fetch Summary");
  console.log("=" .repeat(60));
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Already had URL: ${totalSkipped}`);
  console.log(`URLs found & updated: ${totalUpdated}`);
  console.log(`Not found: ${totalNotFound}`);

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN MODE - No changes were made");
    console.log("   Run with DRY_RUN=false to apply updates\n");
  } else {
    console.log("\n✅ Wikipedia URL fetch complete!\n");
  }
}

fetchWikipediaUrls().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
