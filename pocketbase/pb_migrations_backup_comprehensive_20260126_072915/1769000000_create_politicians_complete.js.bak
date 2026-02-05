/// <reference path="../pb_data/types.d.ts" />
/**
 * Complete migration to create politicians collection with all required fields
 * Based on web/src/types/politician.ts
 */
migrate((app) => {
  // Check if politicians collection already exists
  const existing = app.findCollectionByNameOrId("pbc_3830222512");
  if (existing) {
    console.log('politicians collection already exists, skipping creation');
    return;
  }
  
  const collection = new Collection({
    "id": "pbc_3830222512",
    "name": "politicians",
    "type": "base",
    "system": false,
    "fields": [
      {
        "system": false,
        "id": "name_field",
        "name": "name",
        "type": "text",
        "required": true,
        "unique": false,
        "options": {
          "min": 1,
          "max": 200,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "slug_field",
        "name": "slug",
        "type": "text",
        "required": true,
        "unique": true,
        "options": {
          "min": 1,
          "max": 200,
          "pattern": "^[a-z0-9-]+$"
        }
      },
      {
        "system": false,
        "id": "office_type_field",
        "name": "office_type",
        "type": "select",
        "required": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "senator",
            "representative",
            "governor",
            "other"
          ]
        }
      },
      {
        "system": false,
        "id": "state_field",
        "name": "state",
        "type": "text",
        "required": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "district_field",
        "name": "district",
        "type": "text",
        "required": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 50,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "political_party_field",
        "name": "political_party",
        "type": "text",
        "required": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "current_position_field",
        "name": "current_position",
        "type": "text",
        "required": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 200,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "position_start_date_field",
        "name": "position_start_date",
        "type": "date",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "photo_field",
        "name": "photo",
        "type": "file",
        "required": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "maxSize": 5242880,
          "mimeTypes": ["image/jpeg", "image/png", "image/webp"],
          "thumbs": ["100x100"],
          "protected": false
        }
      },
      {
        "system": false,
        "id": "website_url_field",
        "name": "website_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "wikipedia_url_field",
        "name": "wikipedia_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "facebook_url_field",
        "name": "facebook_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "youtube_url_field",
        "name": "youtube_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "instagram_url_field",
        "name": "instagram_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "x_url_field",
        "name": "x_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "linkedin_url_field",
        "name": "linkedin_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "tiktok_url_field",
        "name": "tiktok_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "truth_social_url_field",
        "name": "truth_social_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [
      "CREATE INDEX idx_politicians_slug ON politicians (slug)",
      "CREATE INDEX idx_politicians_office_type ON politicians (office_type)",
      "CREATE INDEX idx_politicians_state ON politicians (state)"
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512");
  if (collection) {
    return app.delete(collection);
  }
});
