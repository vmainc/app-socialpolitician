/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // remove field
  collection.fields.removeById("text1129964974")

  // add field
  collection.fields.addAt(23, new Field({
    "hidden": false,
    "id": "select1129964974",
    "maxSelect": 1,
    "name": "chamber",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Senator",
      "Representative",
      "Governor"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // add field
  collection.fields.addAt(19, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1129964974",
    "max": 0,
    "min": 0,
    "name": "chamber",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("select1129964974")

  return app.save(collection)
})
