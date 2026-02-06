/// <reference path="../pb_data/types.d.ts" />
/**
 * Add optional avatar (profile photo) file field to users collection.
 * Used on Account page and shown next to comments when author matches current user.
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  if (!collection) {
    console.log("users collection not found, skipping avatar field");
    return;
  }
  if (collection.fields.find((f) => f.name === "avatar")) {
    console.log("users.avatar field already exists");
    return;
  }
  collection.fields.add(
    new Field({
      system: false,
      id: "avatar_users_1770300002",
      name: "avatar",
      type: "file",
      required: false,
      unique: false,
      options: {
        maxSelect: 1,
        maxSize: 2097152,
        mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        protected: false,
      },
    })
  );
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  if (!collection) return;
  const f = collection.fields.find((x) => x.name === "avatar");
  if (f) collection.fields.removeById(f.id);
  return app.save(collection);
});
