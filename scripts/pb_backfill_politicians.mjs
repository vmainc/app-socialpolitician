#!/usr/bin/env node

/**
 * Backfill normalized fields in politicians collection
 * Maps existing data to new party/chamber/status/office_title/term_start_date/official_website_domain fields
 * 
 * Usage:
 *   # Dry run (default)
 *   node scripts/pb_backfill_politicians.mjs
 * 
 *   # Actually update records
 *   DRY_RUN=false node scripts/pb_backfill_politicians.mjs
 * 
 *   # With custom PocketBase URL
 *   PB_BASE_URL="http://127.0.0.1:8091" \
 *   PB_ADMIN_EMAIL="admin@vma.agency" \
 *   PB_ADMIN_PASSWORD="VMAmadmia42O200!" \
 *   DRY_RUN=false \
 *   node scripts/pb_backfill_politicians.mjs
 */

import PocketBase from "pocketbase";

const PB_BASE_URL = process.env.PB_BASE_URL || "http://127.0.0.1:8091";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || "admin@vma.agency";
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || "VMAmadmia42O200!";
const DRY_RUN = process.env.DRY_RUN !== "false"; // Default to true (dry run)

const pb = new PocketBase(PB_BASE_URL);
const COLLECTION_NAME = "politicians";

// =====================
// Mapping Functions
// =====================

function normalizeParty(politicalParty) {
  if (!politicalParty || typeof politicalParty !== "string") {
    return null; // Return null if no party info (don't set Unknown since it's not in select options)
  }

  const party = politicalParty.toLowerCase().trim();

  if (party.includes("democrat") || party === "d" || party.includes("democratic")) {
    return "Democrat";
  }
  if (party.includes("republican") || party === "r" || party.includes("gop")) {
    return "Republican";
  }
  if (party.includes("independent") || party === "i") {
    return "Independent";
  }
  
  // If party doesn't match the 3 available options, return null (don't set)
  return null;
}

function normalizeChamber(officeType, currentPosition) {
  const office = (officeType || "").toLowerCase();
  const position = (currentPosition || "").toLowerCase();
  const combined = `${office} ${position}`;

  // Map to the 3 available select options
  if (combined.includes("senator") || combined.includes("senate")) {
    return "Senator";
  }
  if (combined.includes("representative") || combined.includes("house") || combined.includes("congress")) {
    return "Representative";
  }
  if (combined.includes("governor")) {
    return "Governor";
  }

  // If no match, return null (don't set)
  return null;
}

function normalizeStatus(currentPosition) {
  if (!currentPosition || typeof currentPosition !== "string") {
    return "Unknown";
  }

  const position = currentPosition.toLowerCase();

  if (position.includes("former")) {
    return "Former";
  }
  if (position.includes("retired")) {
    return "Retired";
  }
  if (position.includes("deceased") || position.includes("died")) {
    return "Deceased";
  }
  if (position.includes("candidate") || position.includes("running for")) {
    return "Candidate";
  }
  if (position.includes("challenger")) {
    return "Challenger";
  }

  // Default to Incumbent if there's any position info
  if (position.trim().length > 0) {
    return "Incumbent";
  }

  return "Unknown";
}

function extractOfficeTitle(currentPosition, officeType) {
  if (currentPosition && typeof currentPosition === "string" && currentPosition.trim()) {
    return currentPosition.trim();
  }
  if (officeType && typeof officeType === "string" && officeType.trim()) {
    return officeType.trim();
  }
  return "";
}

function extractDomain(websiteUrl) {
  if (!websiteUrl || typeof websiteUrl !== "string") {
    return "";
  }

  try {
    const url = new URL(websiteUrl);
    let hostname = url.hostname;

    // Remove www. prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }

    return hostname;
  } catch (error) {
    // Invalid URL, try to extract domain manually
    const match = websiteUrl.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
    if (match && match[1]) {
      return match[1].replace(/^www\./, "");
    }
    return "";
  }
}

// =====================
// Main Backfill Logic
// =====================

async function authenticate() {
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log("✅ Authenticated with PocketBase\n");
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);
    process.exit(1);
  }
}

async function backfillPoliticians() {
  console.log("🔄 Backfilling Normalized Fields in Politicians Collection");
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

  const updateStats = {
    party: 0,
    chamber: 0,
    status: 0,
    office_title: 0,
    term_start_date: 0,
    official_website_domain: 0,
  };

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

        const updates = {};
        let hasUpdates = false;

        // Party
        if (!record.party && record.political_party) {
          const party = normalizeParty(record.political_party);
          if (party) { // Only set if we got a valid party value
            updates.party = party;
            updateStats.party++;
            hasUpdates = true;
          }
        }

        // Chamber
        if (!record.chamber) {
          const chamber = normalizeChamber(record.office_type, record.current_position);
          if (chamber) { // Only set if we got a valid chamber value
            updates.chamber = chamber;
            updateStats.chamber++;
            hasUpdates = true;
          }
        }

        // Status
        if (!record.status && record.current_position) {
          const status = normalizeStatus(record.current_position);
          updates.status = status;
          updateStats.status++;
          hasUpdates = true;
        }

        // Office Title
        if (!record.office_title) {
          const officeTitle = extractOfficeTitle(record.current_position, record.office_type);
          if (officeTitle) {
            updates.office_title = officeTitle;
            updateStats.office_title++;
            hasUpdates = true;
          }
        }

        // Term Start Date - skip if field doesn't exist in schema
        // Note: term_start_date field is missing from your schema, so we skip it
        // if (!record.term_start_date && record.position_start_date) {
        //   updates.term_start_date = record.position_start_date;
        //   updateStats.term_start_date++;
        //   hasUpdates = true;
        // }

        // Official Website Domain
        // Note: field is URL type, but we'll try to set it as text (may need to be fixed in schema)
        if (!record.official_website_domain && record.website_url) {
          const domain = extractDomain(record.website_url);
          if (domain) {
            // Convert domain to full URL format since field is URL type
            updates.official_website_domain = `https://${domain}`;
            updateStats.official_website_domain++;
            hasUpdates = true;
          }
        }

        if (hasUpdates) {
          if (DRY_RUN) {
            console.log(`  [DRY RUN] Would update: ${record.name || record.id}`);
            console.log(`    Updates: ${JSON.stringify(updates)}`);
            totalUpdated++;
          } else {
            try {
              await pb.collection(COLLECTION_NAME).update(record.id, updates);
              console.log(`  ✅ Updated: ${record.name || record.id}`);
              totalUpdated++;
            } catch (error) {
              console.error(`  ❌ Failed to update ${record.name || record.id}: ${error.message}`);
              totalSkipped++;
            }
          }
        } else {
          totalSkipped++;
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
  console.log("📊 Backfill Summary");
  console.log("=" .repeat(60));
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log("\n📋 Field Update Counts:");
  console.log(`   party: ${updateStats.party}`);
  console.log(`   chamber: ${updateStats.chamber}`);
  console.log(`   status: ${updateStats.status}`);
  console.log(`   office_title: ${updateStats.office_title}`);
  // console.log(`   term_start_date: ${updateStats.term_start_date}`); // Field not in schema
  console.log(`   official_website_domain: ${updateStats.official_website_domain}`);

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN MODE - No changes were made");
    console.log("   Run with DRY_RUN=false to apply updates\n");
  } else {
    console.log("\n✅ Backfill complete!\n");
  }
}

backfillPoliticians().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
