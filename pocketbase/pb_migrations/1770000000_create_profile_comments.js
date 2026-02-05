/// <reference path="../pb_data/types.d.ts" />
/**
 * Create profile_comments collection for politician profile comment sections.
 * Supports: text content, emojis, images, gifs, videos. Comments can be threaded.
 */
migrate((app) => {
  const politiciansId = "pbc_3830222512";
  try {
    const existing = app.findCollectionByNameOrId("profile_comments");
    if (existing) {
      console.log("profile_comments collection already exists");
      return;
    }
  } catch (e) {
    // Collection doesn't exist, continue
  }

  const collection = new Collection({
    name: "profile_comments",
    type: "base",
    system: false,
    fields: [
      {
        name: "politician",
        type: "relation",
        required: true,
        collectionId: politiciansId,
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
      },
      {
        name: "author_name",
        type: "text",
        required: false,
        options: { min: null, max: 100, pattern: "" },
      },
      {
        name: "content",
        type: "text",
        required: true,
        options: { min: 1, max: 10000, pattern: "" },
      },
      {
        name: "media",
        type: "file",
        required: false,
        options: {
          maxSelect: 5,
          maxSize: 10485760,
          mimeTypes: ["image/*", "video/*", "image/gif"],
          protected: false,
        },
      },
    ],
    indexes: [
      "CREATE INDEX idx_profile_comments_politician ON profile_comments (politician)",
      "CREATE INDEX idx_profile_comments_created ON profile_comments (created)",
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("profile_comments");
    if (collection) {
      return app.delete(collection);
    }
  } catch (e) {
    // Ignore
  }
});
