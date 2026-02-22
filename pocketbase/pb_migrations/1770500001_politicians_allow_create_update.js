/// <reference path="../pb_data/types.d.ts" />
/**
 * Set politicians createRule and updateRule to "" so anyone (including import script) can create/update.
 * Empty string = allow anyone; required for npm run pb:import to work.
 */
migrate((app) => {
  const col = app.findCollectionByNameOrId("politicians") || app.findCollectionByNameOrId("pbc_3830222512");
  if (!col) return;
  col.createRule = "";
  col.updateRule = "";
  return app.save(col);
}, (app) => {
  // No revert
});
