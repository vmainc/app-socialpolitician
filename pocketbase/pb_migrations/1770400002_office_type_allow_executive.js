/// <reference path="../pb_data/types.d.ts" />
/**
 * Ensure office_type select includes president, vice_president, cabinet (for Executive import).
 * Replaces the field so new values persist. Run after 1770400001; safe if 1770400001 already added them.
 */
migrate((app) => {
  const col = app.findCollectionByNameOrId("politicians") || app.findCollectionByNameOrId("pbc_3830222512");
  if (!col) return;

  const f = col.fields.getByName("office_type");
  if (!f || f.type !== "select") return;

  const existing = Array.isArray(f.values) ? [...f.values] : ["senator", "representative", "governor", "other"];
  const need = ["president", "vice_president", "cabinet"];
  const combined = [...new Set([...existing, ...need])];
  if (combined.length === existing.length) return; // already there

  let idx = 18;
  for (let i = 0; i < col.fields.length; i++) {
    if (col.fields[i] && col.fields[i].name === "office_type") { idx = i; break; }
  }
  col.fields.removeById(f.id);
  col.fields.addAt(idx, new Field({
    hidden: false,
    id: f.id,
    maxSelect: 1,
    name: "office_type",
    presentable: false,
    required: false,
    system: false,
    type: "select",
    values: combined,
  }));

  return app.save(col);
}, (app) => {
  // No revert
});
