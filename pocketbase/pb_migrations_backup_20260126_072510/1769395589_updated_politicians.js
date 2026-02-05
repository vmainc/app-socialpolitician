/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // remove field
  collection.fields.removeById("text185255306")

  // add field
  collection.fields.addAt(22, new Field({
    "hidden": false,
    "id": "date185255306",
    "max": "",
    "min": "",
    "name": "term_end_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // add field
  collection.fields.addAt(19, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text185255306",
    "max": 0,
    "min": 0,
    "name": "term_end_date",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("date185255306")

  return app.save(collection)
})
