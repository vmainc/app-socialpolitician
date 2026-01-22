/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration: Add Conversation Persona fields to presidents collection
 * 
 * Fields added:
 * - persona_voice_summary (text, optional)
 * - persona_traits (json array, optional)
 * - persona_rhetoric_patterns (json array, optional)
 * - persona_pushback_playbook (json object, optional)
 * - persona_red_lines (json array, optional)
 * - persona_citation_style (text/select, optional)
 * - persona_accuracy_mode (text/select, optional)
 * - persona_example_snippets (json array, optional)
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("presidents");

  // 1. persona_voice_summary - text field (2-5 sentences)
  collection.fields.addAt(collection.fields.length, new Field({
    "id": "text_persona_voice",
    "name": "persona_voice_summary",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 0,
      "max": 1000,
      "pattern": ""
    }
  }));

  // 2. persona_traits - JSON array of strings (3-7 tags)
  collection.fields.addAt(collection.fields.length, new Field({
    "id": "json_persona_traits",
    "name": "persona_traits",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }));

  // 3. persona_rhetoric_patterns - JSON array of strings
  collection.fields.addAt(collection.fields.length, new Field({
    "id": "json_persona_rhetoric",
    "name": "persona_rhetoric_patterns",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }));

  // 4. persona_pushback_playbook - JSON object
  collection.fields.addAt(collection.fields.length, new Field({
    "id": "json_persona_pushback",
    "name": "persona_pushback_playbook",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }));

  // 5. persona_red_lines - JSON array of strings
  collection.fields.addAt(collection.fields.length, new Field({
    "id": "json_persona_redlines",
    "name": "persona_red_lines",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }));

  // 6. persona_citation_style - text/select field
  collection.fields.addAt(collection.fields.length, new Field({
    "id": "text_persona_citation",
    "name": "persona_citation_style",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": ["none", "light", "source-forward"]
    }
  }));

  // 7. persona_accuracy_mode - text/select field
  collection.fields.addAt(collection.fields.length, new Field({
    "id": "text_persona_accuracy",
    "name": "persona_accuracy_mode",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": ["historical-only", "recent-but-cautious"]
    }
  }));

  // 8. persona_example_snippets - JSON array of strings
  collection.fields.addAt(collection.fields.length, new Field({
    "id": "json_persona_examples",
    "name": "persona_example_snippets",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }));

  return app.save(collection);
}, (app) => {
  // Rollback: remove all persona fields
  const collection = app.findCollectionByNameOrId("presidents");
  
  collection.fields.removeById("text_persona_voice");
  collection.fields.removeById("json_persona_traits");
  collection.fields.removeById("json_persona_rhetoric");
  collection.fields.removeById("json_persona_pushback");
  collection.fields.removeById("json_persona_redlines");
  collection.fields.removeById("text_persona_citation");
  collection.fields.removeById("text_persona_accuracy");
  collection.fields.removeById("json_persona_examples");

  return app.save(collection);
});
