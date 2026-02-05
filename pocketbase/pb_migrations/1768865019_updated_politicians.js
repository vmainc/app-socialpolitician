/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_3830222512") || app.findCollectionByNameOrId("politicians")
    if (!collection) return
    // Skip if office_type already exists (e.g. production DB)
    if (collection.fields.getByName("office_type")) return
    collection.fields.addAt(18, new Field({
      "hidden": false,
      "id": "select1630665765",
      "maxSelect": 1,
      "name": "office_type",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "select",
      "values": [
        "senator",
        "representative",
        "governor",
        "other"
      ]
    }))
    return app.save(collection)
  } catch (_) { /* no-op if duplicate field or other error */ }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_3830222512") || app.findCollectionByNameOrId("politicians")
    if (!collection) return
    const f = collection.fields.getById("select1630665765") || collection.fields.getByName("office_type")
    if (!f) return
    collection.fields.removeById(f.id)
    return app.save(collection)
  } catch (_) { /* no-op */ }
})
