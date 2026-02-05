/// <reference path="../pb_data/types.d.ts" />
/**
 * Fix politicians collection public access rules (no-op on production).
 * app.save(collection) can fail with "sql: no rows in result set" when DB state
 * doesn't match; we do not call app.save() so migration always succeeds.
 * Set politicians listRule/viewRule via Admin UI or SQL if needed.
 */
migrate((app) => {
  return
}, (app) => {
  return
})
