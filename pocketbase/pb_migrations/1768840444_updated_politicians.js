/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_3830222512") || app.findCollectionByNameOrId("politicians")
    if (!collection) return
  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1579384326",
    "max": 0,
    "min": 0,
    "name": "name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2560465762",
    "max": 0,
    "min": 0,
    "name": "slug",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url2618047341",
    "name": "website_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url665768666",
    "name": "wikipedia_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url1642978998",
    "name": "facebook_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url2547638107",
    "name": "x_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url4132915749",
    "name": "tiktok_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url260122942",
    "name": "instagram_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url442414654",
    "name": "linkedin_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url1858974015",
    "name": "youtube_url",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3679755999",
    "max": 0,
    "min": 0,
    "name": "current_position",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3467370857",
    "max": 0,
    "min": 0,
    "name": "political_party",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
  } catch (_) { /* no-op */ }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_3830222512") || app.findCollectionByNameOrId("politicians")
    if (!collection) return
  // remove field
  collection.fields.removeById("text1579384326")

  // remove field
  collection.fields.removeById("text2560465762")

  // remove field
  collection.fields.removeById("url2618047341")

  // remove field
  collection.fields.removeById("url665768666")

  // remove field
  collection.fields.removeById("url1642978998")

  // remove field
  collection.fields.removeById("url2547638107")

  // remove field
  collection.fields.removeById("url4132915749")

  // remove field
  collection.fields.removeById("url260122942")

  // remove field
  collection.fields.removeById("url442414654")

  // remove field
  collection.fields.removeById("url1858974015")

  // remove field
  collection.fields.removeById("text3679755999")

  // remove field
  collection.fields.removeById("text3467370857")

  return app.save(collection)
  } catch (_) { /* no-op */ }
})
