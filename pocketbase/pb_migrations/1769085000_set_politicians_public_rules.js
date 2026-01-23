/// <reference path="../pb_data/types.d.ts" />
/**
 * Set public read access rules for politicians collection
 * This migration updates the existing collection to allow public access
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")
  
  if (!collection) {
    console.log('politicians collection not found');
    return;
  }

  // Set public read access rules
  collection.listRule = '@request.auth.id = "" || @request.auth.id != ""'
  collection.viewRule = '@request.auth.id = "" || @request.auth.id != ""'
  
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")
  
  if (!collection) {
    return;
  }

  // Revert to no public access
  collection.listRule = ""
  collection.viewRule = ""

  return app.save(collection)
})
