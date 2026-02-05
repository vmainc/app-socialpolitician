/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // update field
  collection.fields.addAt(19, new Field({
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
      "Independent",
      "Other",
      "Unknown"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // update field
  collection.fields.addAt(19, new Field({
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
})
