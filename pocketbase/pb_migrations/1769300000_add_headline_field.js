/// <reference path="../pb_data/types.d.ts" />
/**
 * Add headline field to politicians collection.
 * Headline = short summary shown in full in the profile hero.
 * Bio = longer ~500-word summary for the Biography accordion.
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512");
  if (!collection) return;
  if (collection.fields.find((f) => f.name === "headline")) return;

  collection.fields.add(new Field({
    "system": false,
    "id": "headline_field_1769300000",
    "name": "headline",
    "type": "text",
    "required": false,
    "unique": false,
    "options": { "min": null, "max": 2000, "pattern": "" }
  }));
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512");
  if (!collection) return;
  const f = collection.fields.find((f) => f.name === "headline");
  if (f) collection.fields.removeById(f.id);
  return app.save(collection);
});
