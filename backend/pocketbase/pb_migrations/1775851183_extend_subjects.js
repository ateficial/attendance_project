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
  const collection = app.findCollectionByNameOrId("subjects");

  ensureField(collection, { name: "subject_code", type: "text", required: true, min: 2, max: 20 });
  ensureField(collection, {
    name: "level",
    type: "select",
    required: true,
    maxSelect: 1,
    values: ["1", "2", "3", "4"]
  });
  ensureField(collection, { name: "department", type: "text", required: false, max: 100, default: "Computer Science" });
  ensureField(collection, { name: "credit_hours", type: "number", required: false, min: 0, max: 10, noDecimal: true, default: 3 });
  ensureField(collection, {
    name: "subject_type",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["lecture", "section", "both"],
    default: "both"
  });
  ensureField(collection, {
    name: "semester",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["first", "second"],
    default: "second"
  });
  ensureField(collection, { name: "academic_year", type: "text", required: false, max: 20, default: "2025-2026" });
  ensureField(collection, { name: "description", type: "text", required: false, max: 2000 });

  ensureIndex(collection, "CREATE UNIQUE INDEX idx_subjects_subject_code ON subjects (subject_code) WHERE subject_code != ''");

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("subjects");
  return app.save(collection);
})
