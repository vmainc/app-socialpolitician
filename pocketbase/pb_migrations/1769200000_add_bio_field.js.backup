/// <reference path="../pb_data/types.d.ts" />
/**
 * Add bio field to politicians collection if it doesn't exist
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512");
  
  if (!collection) {
    console.log('Politicians collection not found');
    return;
  }
  
  // Check if bio field already exists
  const existingBioField = collection.fields.find(f => f.name === 'bio');
  if (existingBioField) {
    console.log('Bio field already exists');
    return;
  }
  
  // Add bio field
  collection.fields.add(new Field({
    "system": false,
    "id": "bio_field_1769200000",
    "name": "bio",
    "type": "text",
    "required": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 5000,
      "pattern": ""
    }
  }));
  
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512");
  
  if (!collection) {
    return;
  }
  
  // Remove bio field on rollback
  const bioField = collection.fields.find(f => f.name === 'bio');
  if (bioField) {
    collection.fields.removeById(bioField.id);
  }
  
  return app.save(collection);
});
