/// <reference path="../pb_data/types.d.ts" />
/**
 * Fix politicians collection public access rules (no-op on production).
 * app.save(collection) can fail with "sql: no rows in result set" when DB state
 * doesn't match, and PocketBase exits before JS catch runs. So we do not call
 * app.save() here - migration always succeeds and PocketBase starts.
 * Set politicians listRule/viewRule via Admin UI or SQL if needed.
 */
migrate((app) => {
  // No-op: avoid app.save(collection) which can crash startup on production DB
  return
}, (app) => {
  return
})
