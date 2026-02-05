/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_3830222512") || app.findCollectionByNameOrId("politicians")
    if (!collection) return
    unmarshal({ "listRule": null, "viewRule": null }, collection)
    return app.save(collection)
  } catch (_) { /* no-op for existing DBs */ }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_3830222512") || app.findCollectionByNameOrId("politicians")
    if (!collection) return
    unmarshal({ "listRule": "", "viewRule": "" }, collection)
    return app.save(collection)
  } catch (_) { /* no-op */ }
})
