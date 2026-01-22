/// <reference path="../pb_data/types.d.ts" />
/**
 * Simple migration to create politicians collection
 * This creates a basic collection that can be extended later
 */
migrate((app) => {
  // Check if collection already exists
  try {
    const existing = app.findCollectionByNameOrId("pbc_3830222512");
    if (existing) {
      console.log('politicians collection already exists');
      return;
    }
  } catch (e) {
    // Collection doesn't exist, continue
  }
  
  const collection = new Collection({
    "id": "pbc_3830222512",
    "name": "politicians",
    "type": "base",
    "system": false,
    "fields": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "options": {}
      },
      {
        "name": "slug",
        "type": "text",
        "required": true,
        "unique": true,
        "options": {}
      },
      {
        "name": "office_type",
        "type": "select",
        "required": false,
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
        "name": "state",
        "type": "text",
        "required": false,
        "options": {}
      },
      {
        "name": "district",
        "type": "text",
        "required": false,
        "options": {}
      },
      {
        "name": "political_party",
        "type": "text",
        "required": false,
        "options": {}
      },
      {
        "name": "current_position",
        "type": "text",
        "required": false,
        "options": {}
      },
      {
        "name": "position_start_date",
        "type": "date",
        "required": false,
        "options": {}
      },
      {
        "name": "photo",
        "type": "file",
        "required": false,
        "options": {
          "maxSelect": 1
        }
      },
      {
        "name": "website_url",
        "type": "url",
        "required": false,
        "options": {}
      },
      {
        "name": "wikipedia_url",
        "type": "url",
        "required": false,
        "options": {}
      },
      {
        "name": "facebook_url",
        "type": "url",
        "required": false,
        "options": {}
      },
      {
        "name": "youtube_url",
        "type": "url",
        "required": false,
        "options": {}
      },
      {
        "name": "instagram_url",
        "type": "url",
        "required": false,
        "options": {}
      },
      {
        "name": "x_url",
        "type": "url",
        "required": false,
        "options": {}
      },
      {
        "name": "linkedin_url",
        "type": "url",
        "required": false,
        "options": {}
      },
      {
        "name": "tiktok_url",
        "type": "url",
        "required": false,
        "options": {}
      },
      {
        "name": "truth_social_url",
        "type": "url",
        "required": false,
        "options": {}
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512");
  if (collection) {
    return app.delete(collection);
  }
});
