/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // Set public read access rules
  collection.listRule = '@request.auth.id = "" || @request.auth.id != ""'
  collection.viewRule = '@request.auth.id = "" || @request.auth.id != ""'
  
  // Keep write rules restricted (optional - can be set later)
  // collection.createRule = '@request.auth.id != ""'
  // collection.updateRule = '@request.auth.id != ""'
  // collection.deleteRule = '@request.auth.id != ""'

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // Revert to no public access
  collection.listRule = ""
  collection.viewRule = ""

  return app.save(collection)
})
