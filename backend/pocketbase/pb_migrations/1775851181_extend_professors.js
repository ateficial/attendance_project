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
  const collection = app.findCollectionByNameOrId("professors");
  const subjectsCollection = app.findCollectionByNameOrId("subjects");

  ensureField(collection, {
    name: "session_passcode",
    type: "text",
    required: true,
    min: 4,
    max: 8,
    pattern: "^[0-9]{4,8}$",
    default: "0000"
  });
  ensureField(collection, { name: "passcode_updated_at", type: "date", required: false });
  ensureField(collection, { name: "name_ar", type: "text", required: false, max: 200 });
  ensureField(collection, { name: "employee_id", type: "text", required: false, max: 50 });
  ensureField(collection, { name: "phone", type: "text", required: false, max: 50 });
  ensureField(collection, { name: "avatar_url", type: "text", required: false, max: 500 });
  ensureField(collection, { name: "department", type: "text", required: false, max: 100 });
  ensureField(collection, { name: "office_location", type: "text", required: false, max: 120 });
  ensureField(collection, {
    name: "assigned_subjects",
    type: "relation",
    required: false,
    collectionId: subjectsCollection.id,
    minSelect: 0,
    maxSelect: 999
  });
  ensureField(collection, {
    name: "status",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["active", "inactive"],
    default: "active"
  });

  ensureIndex(collection, "CREATE UNIQUE INDEX idx_professors_employee_id ON professors (employee_id) WHERE employee_id != ''");

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("professors");
  return app.save(collection);
})
