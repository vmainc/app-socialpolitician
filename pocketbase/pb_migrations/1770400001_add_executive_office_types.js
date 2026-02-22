/// <reference path="../pb_data/types.d.ts" />
/**
 * Allow executive branch in politicians.office_type select:
 * add president, vice_president, cabinet so Executive page import works on dev.
 * Replaces the field so the new values are persisted (in-place mutation may not save).
 */
migrate((app) => {
  const col = app.findCollectionByNameOrId("politicians") || app.findCollectionByNameOrId("pbc_3830222512");
  if (!col) return;

  const f = col.fields.getByName("office_type");
  if (!f || f.type !== "select") return;

  const existing = Array.isArray(f.values) ? [...f.values] : ["senator", "representative", "governor", "other"];
  const add = ["president", "vice_president", "cabinet"];
  const combined = [...new Set([...existing, ...add])];

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
  const col = app.findCollectionByNameOrId("politicians") || app.findCollectionByNameOrId("pbc_3830222512");
  if (!col) return;
  const f = col.fields.getByName("office_type");
  if (!f || f.type !== "select" || !Array.isArray(f.values)) return;
  const filtered = (f.values || []).filter(
    (v) => v !== "president" && v !== "vice_president" && v !== "cabinet"
  );
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
    values: filtered,
  }));
  return app.save(col);
});
