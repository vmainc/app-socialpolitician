/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // add field
  collection.fields.addAt(18, new Field({
    "hidden": false,
    "id": "select1630665765",
    "maxSelect": 1,
    "name": "office_type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "senator",
      "representative",
      "governor",
      "other"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3830222512")

  // remove field
  collection.fields.removeById("select1630665765")

  return app.save(collection)
})
