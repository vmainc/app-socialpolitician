/// <reference path="../pb_data/types.d.ts" />
/**
 * Fix politicians collection public access rules
 * Sets listRule and viewRule to allow public read access
 * Compatible with PocketBase v0.35.1
 *
 * Rule syntax: 'id != ""' evaluates to true for all records, allowing public access
 * Wrapped in try/catch so "sql: no rows in result set" on save does not block startup.
 */
migrate((app) => {
  let collection = app.findCollectionByNameOrId("pbc_3830222512")
  if (!collection) {
    collection = app.findCollectionByNameOrId("politicians")
  }
  if (!collection) {
    return
  }

  collection.listRule = 'id != ""'
  collection.viewRule = 'id != ""'

  try {
    return app.save(collection)
  } catch (e) {
    // e.g. "sql: no rows in result set" when DB state doesn't match - allow startup
    console.log('⚠️  Could not save politicians rules (collection may already match):', e?.message || e)
    return
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512") ||
                     app.findCollectionByNameOrId("politicians")
  if (!collection) return
  collection.listRule = ""
  collection.viewRule = ""
  try {
    return app.save(collection)
  } catch (_) {
    return
  }
})
