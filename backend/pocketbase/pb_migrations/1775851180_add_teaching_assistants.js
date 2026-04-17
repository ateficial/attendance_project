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
  const subjectsCollection = app.findCollectionByNameOrId("subjects");
  const groupsCollection = app.findCollectionByNameOrId("groups");

  let collection;
  try {
    collection = app.findCollectionByNameOrId("teaching_assistants");
  } catch (e) {
    collection = new Collection({
      name: "teaching_assistants",
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

  collection.name = "teaching_assistants";
  collection.type = "base";
  collection.system = false;
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.collectionName = '_superusers'";
  collection.updateRule = "@request.auth.collectionName = '_superusers'";
  collection.deleteRule = "@request.auth.collectionName = '_superusers'";

  ensureField(collection, { name: "name", type: "text", required: true, min: 2, max: 200 });
  ensureField(collection, { name: "name_ar", type: "text", required: false, max: 200 });
  ensureField(collection, { name: "email", type: "text", required: true, max: 250 });
  ensureField(collection, { name: "password_hash", type: "text", required: false, max: 255 });
  ensureField(collection, { name: "employee_id", type: "text", required: false, max: 50 });
  ensureField(collection, {
    name: "assigned_subjects",
    type: "relation",
    required: true,
    collectionId: subjectsCollection.id,
    minSelect: 1,
    maxSelect: 999
  });
  ensureField(collection, {
    name: "assigned_groups",
    type: "relation",
    required: false,
    collectionId: groupsCollection.id,
    minSelect: 0,
    maxSelect: 999
  });
  ensureField(collection, { name: "department", type: "text", required: false, max: 100 });
  ensureField(collection, { name: "phone", type: "text", required: false, max: 50 });
  ensureField(collection, { name: "avatar_url", type: "text", required: false, max: 500 });
  ensureField(collection, {
    name: "status",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["active", "inactive"],
    default: "active"
  });

  ensureIndex(collection, "CREATE UNIQUE INDEX idx_teaching_assistants_email ON teaching_assistants (email)");
  ensureIndex(collection, "CREATE UNIQUE INDEX idx_teaching_assistants_employee_id ON teaching_assistants (employee_id) WHERE employee_id != ''");

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("teaching_assistants");
    return app.delete(collection);
  } catch (e) {
    return null;
  }
})
