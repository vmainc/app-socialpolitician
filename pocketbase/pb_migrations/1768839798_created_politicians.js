/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    if (app.findCollectionByNameOrId("pbc_3830222512") || app.findCollectionByNameOrId("politicians")) return;
  } catch (_) { /* ignore */ }
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      }
    ],
    "id": "pbc_3830222512",
    "indexes": [],
    "listRule": "",
    "name": "politicians",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": ""
  });

  try {
    return app.save(collection);
  } catch (e) {
    if (String(e && e.message || e).includes("already exists") || String(e && e.message || e).includes("unique")) return;
    throw e;
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512") || app.findCollectionByNameOrId("politicians");
  if (!collection) return;
  return app.delete(collection);
})
