/// <reference path="../pb_data/.pb_migrations/types.d.ts" />
/**
 * Migration: Create feeds collection
 * 
 * Stores feed snapshots from social media platforms and RSS
 * Public read access, server writes via admin token
 */

migrate((app) => {
  const collection = new Collection({
    "id": "feeds_collection",
    "name": "feeds",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "politician_relation_field",
        "name": "politician",
        "type": "relation",
        "required": true,
        "unique": false,
        "options": {
          "collectionId": "politicians_collection",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": ["name"]
        }
      },
      {
        "system": false,
        "id": "platform_field",
        "name": "platform",
        "type": "select",
        "required": true,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "twitter",
            "instagram",
            "youtube",
            "truth",
            "tiktok",
            "rss",
            "website"
          ]
        }
      },
      {
        "system": false,
        "id": "fetched_at_field",
        "name": "fetched_at",
        "type": "date",
        "required": true,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "payload_field",
        "name": "payload",
        "type": "json",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "normalized_items_field",
        "name": "normalized_items",
        "type": "json",
        "required": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [
      "CREATE INDEX idx_feeds_politician ON feeds (politician)",
      "CREATE INDEX idx_feeds_platform ON feeds (platform)",
      "CREATE INDEX idx_feeds_fetched_at ON feeds (fetched_at)",
      "CREATE UNIQUE INDEX idx_feeds_politician_platform ON feeds (politician, platform)"
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
  const collection = app.findCollectionByNameOrId("feeds");
  return app.delete(collection);
});
