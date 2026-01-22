/// <reference path="../pb_data/.pb_migrations/types.d.ts" />
/**
 * Migration: Create politicians collection
 * 
 * Stores all politician data migrated from WordPress
 * Public read access, admin-only write access
 */

migrate((app) => {
  const collection = new Collection({
    "id": "politicians_collection",
    "name": "politicians",
    "type": "base",
    "system": false,
    "schema": [
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
        "required": true,
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
        "id": "politician_rank_field",
        "name": "politician_rank",
        "type": "number",
        "required": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "system": false,
        "id": "bio_field",
        "name": "bio",
        "type": "text",
        "required": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 5000,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "wikipedia_url_field",
        "name": "wikipedia_URL",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "official_website_field",
        "name": "official_website",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "facebook_field",
        "name": "facebook",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "twitter_url_field",
        "name": "twitter_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "instagram_field",
        "name": "instagram",
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
        "id": "youtube_channel_id_field",
        "name": "youtube_channel_id",
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
        "id": "truth_social_url_field",
        "name": "truth_social_url",
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
        "id": "rss_feed_field",
        "name": "rss_feed",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "profile_picture_field",
        "name": "profile_picture",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "last_updated_field",
        "name": "last_updated",
        "type": "date",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "social_media_verification_date_field",
        "name": "social_media_verification_date",
        "type": "date",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "data_notes_field",
        "name": "data_notes",
        "type": "text",
        "required": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 1000,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "sources_field",
        "name": "sources",
        "type": "json",
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
  // Rollback: delete collection
  const collection = app.findCollectionByNameOrId("politicians");
  return app.delete(collection);
});
