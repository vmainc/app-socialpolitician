/// <reference path="../pb_data/types.d.ts" />
/**
 * Fix user_favorites.politician relation to use the actual politicians collection ID.
 * Run after create_user_favorites; fixes 400 on list when expand=politician if ID was wrong.
 */
migrate((app) => {
  try {
    const uf = app.findCollectionByNameOrId("user_favorites");
    const pol = app.findCollectionByNameOrId("politicians");
    if (!uf || !pol) return;
    const f = uf.fields.getByName("politician");
    if (!f || f.collectionId === pol.id) return;
    f.collectionId = pol.id;
    return app.save(uf);
  } catch (_) {
    // no-op
  }
}, (app) => {
  // no down: leave relation as-is
});
