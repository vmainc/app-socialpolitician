/// <reference path="../pb_data/.pb_migrations/types.d.ts" />
migrate((app) => {
  // Create president_facts collection
  const collection = new Collection({
    "id": "president_facts_collection",
    "name": "president_facts",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "president_relation",
        "name": "president",
        "type": "relation",
        "required": true,
        "unique": false,
        "options": {
          "collectionId": "pbc_4278886452", // presidents collection ID
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": ["name"]
        }
      },
      {
        "system": false,
        "id": "category_field",
        "name": "category",
        "type": "select",
        "required": true,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "basic_info",
            "birth_family",
            "education",
            "military_service",
            "career",
            "presidency",
            "achievements",
            "personal"
          ]
        }
      },
      {
        "system": false,
        "id": "fact_type_field",
        "name": "fact_type",
        "type": "text",
        "required": true,
        "unique": false,
        "options": {
          "min": 1,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "label_field",
        "name": "label",
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
        "id": "value_field",
        "name": "value",
        "type": "text",
        "required": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": 500,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "date_field",
        "name": "date",
        "type": "date",
        "required": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "source_url_field",
        "name": "source_url",
        "type": "url",
        "required": false,
        "unique": false,
        "options": {
          "exceptDomains": null,
          "onlyDomains": null
        }
      },
      {
        "system": false,
        "id": "order_field",
        "name": "order",
        "type": "number",
        "required": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null
        }
      }
    ],
    "indexes": [
      "CREATE INDEX idx_president_facts_president ON president_facts (president)",
      "CREATE INDEX idx_president_facts_category ON president_facts (category)",
      "CREATE INDEX idx_president_facts_order ON president_facts (order)"
    ],
    "listRule": null, // Public read
    "viewRule": null, // Public read
    "createRule": null, // Admin only (set via admin UI)
    "updateRule": null, // Admin only
    "deleteRule": null // Admin only
  });

  return app.save(collection);
}, (app) => {
  // Downgrade: remove collection
  const collection = app.findCollectionByNameOrId("president_facts_collection");
  return app.save(collection);
});
