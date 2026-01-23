/// <reference path="../pb_data/types.d.ts" />
/**
 * Fix politicians collection public access rules
 * Sets listRule and viewRule to allow public read access
 * Compatible with PocketBase v0.35.1
 * 
 * Rule syntax: 'id != ""' evaluates to true for all records, allowing public access
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")
  
  if (!collection) {
    // Try by name if ID doesn't work
    const collectionByName = app.findCollectionByNameOrId("politicians")
    if (!collectionByName) {
      console.log('⚠️  politicians collection not found - skipping migration')
      return
    }
    collection = collectionByName
  }

  // Set public read access rules using always-true expression
  // This syntax works in PocketBase v0.35.1
  collection.listRule = 'id != ""'
  collection.viewRule = 'id != ""'
  
  console.log('✅ Updated politicians collection rules:')
  console.log('   listRule:', collection.listRule)
  console.log('   viewRule:', collection.viewRule)
  
  return app.save(collection)
}, (app) => {
  // Rollback: remove public access
  const collection = app.findCollectionByNameOrId("pbc_3830222512") || 
                     app.findCollectionByNameOrId("politicians")
  
  if (!collection) {
    return
  }

  collection.listRule = ""
  collection.viewRule = ""

  return app.save(collection)
})
