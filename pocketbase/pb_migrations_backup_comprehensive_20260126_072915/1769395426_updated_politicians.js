/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // update field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "date3150345784",
    "max": "",
    "min": "",
    "name": "birthdate",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // update field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "date3150345784",
    "max": "",
    "min": "",
    "name": "term_start_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
})
