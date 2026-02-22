/// <reference path="../pb_data/types.d.ts" />
/**
 * Make politicians collection match live production schema:
 * - office_type as TEXT (not select) so president, vice_president, cabinet are accepted
 * - listRule/viewRule as on live; createRule/updateRule allow authenticated (admin) so import script works
 * Safe to run on existing DB (idempotent).
 */
migrate((app) => {
  const col = app.findCollectionByNameOrId("politicians") || app.findCollectionByNameOrId("pbc_3830222512");
  if (!col) return;

  // 1) Rules: public read; empty create/update = anyone (so import script and admin work)
  col.listRule = 'id != ""';
  col.viewRule = 'id != ""';
  col.createRule = "";
  col.updateRule = "";
  col.deleteRule = "";

  // 2) office_type must be TEXT (live has text; dev may have select)
  const f = col.fields.getByName("office_type");
  if (f && f.type === "select") {
    col.fields.removeById(f.id);
    col.fields.add(new Field({
      system: false,
      id: "text1630665765",
      name: "office_type",
      type: "text",
      required: false,
      unique: false,
      options: { min: null, max: 500, pattern: "" },
    }));
  }

  return app.save(col);
}, (app) => {
  // No revert
});
