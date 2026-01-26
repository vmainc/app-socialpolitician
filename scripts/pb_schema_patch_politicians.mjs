#!/usr/bin/env node

/**
 * Add normalized fields to politicians collection
 * Adds: party, chamber, status, office_title, term_start_date, term_end_date, birth_date, official_website_domain
 * 
 * Usage:
 *   PB_BASE_URL="http://127.0.0.1:8091" \
 *   PB_ADMIN_EMAIL="admin@vma.agency" \
 *   PB_ADMIN_PASSWORD="VMAmadmia42O200!" \
 *   node scripts/pb_schema_patch_politicians.mjs
 */

import PocketBase from "pocketbase";

const PB_BASE_URL = process.env.PB_BASE_URL || "http://127.0.0.1:8091";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || "admin@vma.agency";
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || "VMAmadmia42O200!";

const pb = new PocketBase(PB_BASE_URL);
const COLLECTION_NAME = "politicians";

// Generate a simple ID for fields (PocketBase will accept or regenerate)
function generateFieldId(fieldName) {
  // Create a simple numeric ID based on field name hash
  const hash = fieldName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `field${Math.abs(hash).toString().slice(0, 10)}`;
}

// Field definitions
const NEW_FIELDS = [
  {
    id: generateFieldId("party"),
    name: "party",
    type: "select",
    required: false,
    system: false,
    hidden: false,
    presentable: false,
    options: {
      maxSelect: 1,
      values: ["Democrat", "Republican", "Independent", "Nonpartisan", "Other", "Unknown"],
    },
  },
  {
    id: generateFieldId("chamber"),
    name: "chamber",
    type: "select",
    required: false,
    system: false,
    hidden: false,
    presentable: false,
    options: {
      maxSelect: 1,
      values: ["Senate", "House", "Governor", "State Senate", "State House", "Mayor", "Cabinet", "Judicial", "Other", "Unknown"],
    },
  },
  {
    id: generateFieldId("status"),
    name: "status",
    type: "select",
    required: false,
    system: false,
    hidden: false,
    presentable: false,
    options: {
      maxSelect: 1,
      values: ["Incumbent", "Challenger", "Former", "Retired", "Deceased", "Candidate", "Unknown"],
    },
  },
  {
    id: generateFieldId("office_title"),
    name: "office_title",
    type: "text",
    required: false,
    system: false,
    hidden: false,
    presentable: false,
    options: {
      min: 0,
      max: 0,
      pattern: "",
    },
  },
  {
    id: generateFieldId("term_start_date"),
    name: "term_start_date",
    type: "date",
    required: false,
    system: false,
    hidden: false,
    presentable: false,
    options: {},
  },
  {
    id: generateFieldId("term_end_date"),
    name: "term_end_date",
    type: "date",
    required: false,
    system: false,
    hidden: false,
    presentable: false,
    options: {},
  },
  {
    id: generateFieldId("birth_date"),
    name: "birth_date",
    type: "date",
    required: false,
    system: false,
    hidden: false,
    presentable: false,
    options: {},
  },
  {
    id: generateFieldId("official_website_domain"),
    name: "official_website_domain",
    type: "text",
    required: false,
    system: false,
    hidden: false,
    presentable: false,
    options: {
      min: 0,
      max: 0,
      pattern: "",
    },
  },
];

async function authenticate() {
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log("✅ Authenticated with PocketBase\n");
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);
    process.exit(1);
  }
}

async function getCollection() {
  try {
    const collection = await pb.collections.getOne(COLLECTION_NAME);
    return collection;
  } catch (error) {
    console.error(`❌ Failed to get collection "${COLLECTION_NAME}":`, error.message);
    process.exit(1);
  }
}

function fieldExists(schema, fieldName) {
  return schema.some((field) => field.name === fieldName);
}

async function addFields() {
  console.log("🔧 Adding Normalized Fields to Politicians Collection");
  console.log("=" .repeat(60));
  console.log(`📋 Collection: ${COLLECTION_NAME}`);
  console.log(`🌐 PocketBase URL: ${PB_BASE_URL}\n`);

  await authenticate();

  const collection = await getCollection();
  const currentSchema = collection.schema || collection.fields || [];

  console.log(`📊 Current schema has ${currentSchema.length} fields\n`);

  const fieldsToAdd = [];
  const fieldsToSkip = [];

  for (const newField of NEW_FIELDS) {
    if (fieldExists(currentSchema, newField.name)) {
      fieldsToSkip.push(newField.name);
      console.log(`⏭️  Field "${newField.name}" already exists, skipping`);
    } else {
      fieldsToAdd.push(newField);
      console.log(`➕ Will add field: ${newField.name} (${newField.type})`);
    }
  }

  if (fieldsToAdd.length === 0) {
    console.log("\n✅ All fields already exist. Nothing to add.");
    return;
  }

  console.log(`\n📝 Adding ${fieldsToAdd.length} new field(s)...\n`);

  try {
    const updatedSchema = [...currentSchema, ...fieldsToAdd];

    await pb.collections.update(collection.id, {
      schema: updatedSchema,
    });

    console.log("✅ Successfully added fields to collection schema!\n");

    // Verify
    const verifyCollection = await pb.collections.getOne(COLLECTION_NAME);
    const verifySchema = verifyCollection.schema || verifyCollection.fields || [];

    console.log("🔍 Verification:");
    for (const field of fieldsToAdd) {
      const exists = fieldExists(verifySchema, field.name);
      if (exists) {
        console.log(`   ✅ ${field.name} - confirmed`);
      } else {
        console.log(`   ⚠️  ${field.name} - NOT FOUND (may need manual addition)`);
      }
    }

    if (fieldsToSkip.length > 0) {
      console.log(`\n⏭️  Skipped ${fieldsToSkip.length} existing field(s): ${fieldsToSkip.join(", ")}`);
    }

    console.log("\n✅ Schema update complete!");
    console.log("\n📋 Next step: Run backfill script to populate these fields:");
    console.log("   node scripts/pb_backfill_politicians.mjs\n");
  } catch (error) {
    console.error("\n❌ Failed to update schema:", error.message);
    if (error.response) {
      console.error("   Response:", JSON.stringify(error.response, null, 2));
    }
    console.error("\n⚠️  You may need to add fields manually in PocketBase Admin UI:");
    console.error(`   1. Go to: ${PB_BASE_URL}/_/`);
    console.error(`   2. Navigate to Collections > ${COLLECTION_NAME}`);
    console.error(`   3. Add each field manually\n`);
    process.exit(1);
  }
}

addFields().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
