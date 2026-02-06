/// <reference path="../pb_data/types.d.ts" />
/**
 * Allow users to update and view their own record (e.g. profile photo / avatar).
 * Without this, only admins could PATCH the users collection.
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  if (!collection) {
    console.log("users collection not found, skipping rules");
    return;
  }
  // Allow authenticated user to view and update only their own record
  collection.updateRule = "@request.auth.id = id";
  if (!collection.viewRule || collection.viewRule === "null") {
    collection.viewRule = "@request.auth.id = id";
  }
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  if (!collection) return;
  collection.updateRule = "";
  // Don't revert viewRule in case it was set by PocketBase setup
  return app.save(collection);
});
