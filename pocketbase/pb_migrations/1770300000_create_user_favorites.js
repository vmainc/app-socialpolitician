/// <reference path="../pb_data/types.d.ts" />
/**
 * Create user_favorites collection: one record per user+politician.
 * List/view/create/delete: only for the authenticated user (own records).
 */
migrate((app) => {
  try {
    const existing = app.findCollectionByNameOrId("user_favorites");
    if (existing) {
      console.log("user_favorites collection already exists");
      return;
    }
  } catch (_) {
    // Collection doesn't exist, continue
  }

  const usersCol = app.findCollectionByNameOrId("users");
  const politiciansId = "pbc_3830222512";
  if (!usersCol) {
    console.warn("users collection not found, skipping user_favorites");
    return;
  }

  const collection = new Collection({
    name: "user_favorites",
    type: "base",
    system: false,
    fields: [
      {
        name: "user",
        type: "relation",
        required: true,
        collectionId: usersCol.id,
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
      },
      {
        name: "politician",
        type: "relation",
        required: true,
        collectionId: politiciansId,
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_user_favorites_user_politician ON user_favorites (user, politician)",
    ],
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "@request.auth.id != '' && user = @request.auth.id",
    updateRule: "",
    deleteRule: "user = @request.auth.id",
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("user_favorites");
    if (collection) return app.delete(collection);
  } catch (_) {
    // ignore
  }
});
