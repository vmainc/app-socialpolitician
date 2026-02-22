/// <reference path="../pb_data/types.d.ts" />
/**
 * Sync politicians collection rules to match live production.
 * Live uses: listRule/viewRule "id != \"\"", createRule/updateRule/deleteRule "".
 * Ensures dev can create/update records when authenticated as admin (same as live).
 */
migrate((app) => {
  const col = app.findCollectionByNameOrId("politicians") || app.findCollectionByNameOrId("pbc_3830222512");
  if (!col) return;

  col.listRule = 'id != ""';
  col.viewRule = 'id != ""';
  col.createRule = "";
  col.updateRule = "";
  col.deleteRule = "";

  return app.save(col);
}, (app) => {
  // No revert - keep rules as-is if rolling back
});
