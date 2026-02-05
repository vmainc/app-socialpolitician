/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // update field
  collection.fields.addAt(20, new Field({
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
      "Governor",
      "Other",
      "Unknown"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // update field
  collection.fields.addAt(20, new Field({
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
})
