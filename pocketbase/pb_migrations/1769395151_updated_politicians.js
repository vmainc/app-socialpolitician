/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // remove field
  collection.fields.removeById("text3467370857")

  // add field
  collection.fields.addAt(23, new Field({
    "hidden": false,
    "id": "select2308263648",
    "maxSelect": 1,
    "name": "party",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Democrat",
      "Republican",
      "Independent"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3467370857",
    "max": 0,
    "min": 0,
    "name": "party",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("select2308263648")

  return app.save(collection)
})
