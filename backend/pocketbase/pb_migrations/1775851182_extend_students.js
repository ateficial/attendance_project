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
  const collection = app.findCollectionByNameOrId("students");
  const subjectsCollection = app.findCollectionByNameOrId("subjects");
  const groupsCollection = app.findCollectionByNameOrId("groups");

  ensureField(collection, { name: "name_ar", type: "text", required: false, max: 200 });
  ensureField(collection, { name: "student_id_number", type: "text", required: false, max: 50 });
  ensureField(collection, {
    name: "level",
    type: "select",
    required: true,
    maxSelect: 1,
    values: ["1", "2", "3", "4"]
  });
  ensureField(collection, { name: "department", type: "text", required: false, max: 100, default: "Computer Science" });
  ensureField(collection, { name: "faculty", type: "text", required: false, max: 100, default: "Computer Science" });
  ensureField(collection, {
    name: "enrolled_subjects",
    type: "relation",
    required: false,
    collectionId: subjectsCollection.id,
    minSelect: 0,
    maxSelect: 999
  });
  ensureField(collection, {
    name: "group_id",
    type: "relation",
    required: false,
    collectionId: groupsCollection.id,
    maxSelect: 1
  });
  ensureField(collection, { name: "rfid_card_id", type: "text", required: false, max: 100 });
  ensureField(collection, {
    name: "rfid_status",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["active", "inactive", "lost"],
    default: "active"
  });
  ensureField(collection, { name: "phone", type: "text", required: false, max: 50 });
  ensureField(collection, { name: "avatar_url", type: "text", required: false, max: 500 });
  ensureField(collection, { name: "national_id", type: "text", required: false, max: 20 });
  ensureField(collection, { name: "academic_year", type: "text", required: false, max: 20 });
  ensureField(collection, {
    name: "status",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["active", "suspended", "graduated"],
    default: "active"
  });
  ensureField(collection, { name: "warning_count", type: "number", required: false, min: 0, noDecimal: true, default: 0 });
  ensureField(collection, { name: "absence_percentage", type: "number", required: false, min: 0, max: 100, default: 0 });

  ensureIndex(collection, "CREATE UNIQUE INDEX idx_students_student_id_number ON students (student_id_number) WHERE student_id_number != ''");
  ensureIndex(collection, "CREATE UNIQUE INDEX idx_students_rfid_card_id ON students (rfid_card_id) WHERE rfid_card_id != ''");

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("students");
  return app.save(collection);
})
