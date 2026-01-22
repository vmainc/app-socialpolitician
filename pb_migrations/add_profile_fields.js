/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration: Add missing profile fields to presidents collection
 * 
 * Adds 15 new fields for comprehensive factual profile data:
 * - Identity & Life: death_place, age_at_inauguration
 * - Presidential Service: terms_served, years_in_office, predecessor, successor
 * - Government & Military: military_service, military_branch, military_rank, major_conflicts, prior_offices
 * - Family: first_lady, children
 * - Education & Career: religion
 * - Historical Context: major_legislation, notable_controversies
 * - Metadata: last_verified, data_notes
 * 
 * Idempotent: Checks for existing fields before adding
 */

migrate((app) => {
  const collection = app.findCollectionByNameOrId("presidents");

  // Helper function to check if field exists
  const fieldExists = (name) => {
    return collection.fields.some(f => f.name === name);
  };

  // Identity & Life
  if (!fieldExists("death_place")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_death_place",
      "name": "death_place",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  if (!fieldExists("age_at_inauguration")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "number_age_inaug",
      "name": "age_at_inauguration",
      "type": "number",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "noDecimal": true
      }
    }));
  }

  // Presidential Service
  if (!fieldExists("terms_served")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "number_terms_served",
      "name": "terms_served",
      "type": "number",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "noDecimal": true
      }
    }));
  }

  if (!fieldExists("years_in_office")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "number_years_office",
      "name": "years_in_office",
      "type": "number",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "noDecimal": false
      }
    }));
  }

  if (!fieldExists("predecessor")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_predecessor",
      "name": "predecessor",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  if (!fieldExists("successor")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_successor",
      "name": "successor",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  // Government & Military
  if (!fieldExists("military_service")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "bool_military_service",
      "name": "military_service",
      "type": "bool",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {}
    }));
  }

  if (!fieldExists("military_branch")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_military_branch",
      "name": "military_branch",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  if (!fieldExists("military_rank")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_military_rank",
      "name": "military_rank",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  if (!fieldExists("major_conflicts")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_major_conflicts",
      "name": "major_conflicts",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  if (!fieldExists("prior_offices")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_prior_offices",
      "name": "prior_offices",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  // Family
  if (!fieldExists("first_lady")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_first_lady",
      "name": "first_lady",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  if (!fieldExists("children")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_children",
      "name": "children",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  // Education & Career
  if (!fieldExists("religion")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_religion",
      "name": "religion",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  // Historical Context
  if (!fieldExists("major_legislation")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_major_legislation",
      "name": "major_legislation",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  if (!fieldExists("notable_controversies")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_notable_controversies",
      "name": "notable_controversies",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  // Metadata
  if (!fieldExists("last_verified")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_last_verified",
      "name": "last_verified",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  if (!fieldExists("data_notes")) {
    collection.fields.addAt(collection.fields.length, new Field({
      "id": "text_data_notes",
      "name": "data_notes",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
        "min": null,
        "max": null,
        "pattern": ""
      }
    }));
  }

  return app.save(collection);
}, (app) => {
  // Rollback: remove all added fields
  const collection = app.findCollectionByNameOrId("presidents");
  
  collection.fields.removeById("text_data_notes");
  collection.fields.removeById("text_last_verified");
  collection.fields.removeById("text_notable_controversies");
  collection.fields.removeById("text_major_legislation");
  collection.fields.removeById("text_religion");
  collection.fields.removeById("text_children");
  collection.fields.removeById("text_first_lady");
  collection.fields.removeById("text_prior_offices");
  collection.fields.removeById("text_major_conflicts");
  collection.fields.removeById("text_military_rank");
  collection.fields.removeById("text_military_branch");
  collection.fields.removeById("bool_military_service");
  collection.fields.removeById("text_successor");
  collection.fields.removeById("text_predecessor");
  collection.fields.removeById("number_years_office");
  collection.fields.removeById("number_terms_served");
  collection.fields.removeById("number_age_inaug");
  collection.fields.removeById("text_death_place");

  return app.save(collection);
});
