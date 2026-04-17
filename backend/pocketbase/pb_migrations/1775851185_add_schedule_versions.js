/// <reference path="../pb_data/types.d.ts" />

function ensureField(collection, field) {
  if (!collection.fields || typeof collection.fields.getByName !== "function") {
    collection.fields = new FieldsList();
  }
  const exists = collection.fields.getByName(field.name);
  if (!exists) collection.fields.add(new Field(field));
}

function ensureIndex(collection, indexSql) {
  if (!Array.isArray(collection.indexes)) collection.indexes = [];
  if (!collection.indexes.includes(indexSql)) collection.indexes.push(indexSql);
}

migrate((app) => {
  const superusersCollection = app.findCollectionByNameOrId("_superusers");

  let collection;
  try {
    collection = app.findCollectionByNameOrId("schedule_versions");
  } catch (e) {
    collection = new Collection({
      name: "schedule_versions",
      type: "base",
      system: false,
      fields: [],
      indexes: [],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: ""
    });
  }

  collection.name = "schedule_versions";
  collection.type = "base";
  collection.system = false;
  collection.listRule = "@request.auth.collectionName = '_superusers'";
  collection.viewRule = "@request.auth.collectionName = '_superusers'";
  collection.createRule = "@request.auth.collectionName = '_superusers'";
  collection.updateRule = "@request.auth.collectionName = '_superusers'";
  collection.deleteRule = "@request.auth.collectionName = '_superusers'";

  ensureField(collection, { name: "label", type: "text", required: true, min: 3, max: 200 });
  ensureField(collection, {
    name: "level",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["1", "2", "3", "4"]
  });
  ensureField(collection, {
    name: "published_by",
    type: "relation",
    required: false,
    collectionId: superusersCollection.id,
    maxSelect: 1
  });
  ensureField(collection, { name: "published_at", type: "date", required: false });
  ensureField(collection, { name: "is_active", type: "bool", required: false, default: false });
  ensureField(collection, { name: "snapshot_json", type: "json", required: false, maxSize: 2000000 });

  ensureIndex(collection, "CREATE INDEX idx_schedule_versions_level ON schedule_versions (level)");

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("schedule_versions");
    return app.delete(collection);
  } catch (e) {
    return null;
  }
})
