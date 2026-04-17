/// <reference path="../pb_data/types.d.ts" />

function ensureField(collection, field) {
  if (!collection.fields || typeof collection.fields.getByName !== "function") {
    collection.fields = new FieldsList();
  }
  const exists = collection.fields.getByName(field.name);
  if (!exists) collection.fields.add(new Field(field));
}

migrate((app) => {
  const collection = app.findCollectionByNameOrId("schedules");
  const subjectsCollection = app.findCollectionByNameOrId("subjects");
  const professorsCollection = app.findCollectionByNameOrId("professors");
  const roomsCollection = app.findCollectionByNameOrId("rooms");
  const groupsCollection = app.findCollectionByNameOrId("groups");
  const taCollection = app.findCollectionByNameOrId("teaching_assistants");

  ensureField(collection, {
    name: "subject_id",
    type: "relation",
    required: true,
    collectionId: subjectsCollection.id,
    maxSelect: 1
  });
  ensureField(collection, {
    name: "professor_id",
    type: "relation",
    required: false,
    collectionId: professorsCollection.id,
    maxSelect: 1
  });
  ensureField(collection, {
    name: "ta_id",
    type: "relation",
    required: false,
    collectionId: taCollection.id,
    maxSelect: 1
  });
  ensureField(collection, {
    name: "room_id",
    type: "relation",
    required: true,
    collectionId: roomsCollection.id,
    maxSelect: 1
  });
  ensureField(collection, {
    name: "group_id",
    type: "relation",
    required: false,
    collectionId: groupsCollection.id,
    maxSelect: 1
  });
  ensureField(collection, {
    name: "day_of_week",
    type: "select",
    required: true,
    maxSelect: 1,
    values: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  });
  ensureField(collection, {
    name: "lecture_slot",
    type: "select",
    required: true,
    maxSelect: 1,
    values: ["1", "2", "3", "4", "5", "6", "7", "8"]
  });
  ensureField(collection, { name: "start_time", type: "text", required: true, min: 5, max: 5, pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" });
  ensureField(collection, { name: "end_time", type: "text", required: true, min: 5, max: 5, pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" });
  ensureField(collection, {
    name: "session_type",
    type: "select",
    required: true,
    maxSelect: 1,
    values: ["lecture", "section"]
  });
  ensureField(collection, {
    name: "level",
    type: "select",
    required: true,
    maxSelect: 1,
    values: ["1", "2", "3", "4"]
  });
  ensureField(collection, { name: "section_number", type: "text", required: false, max: 50 });
  ensureField(collection, {
    name: "semester",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["first", "second"],
    default: "second"
  });
  ensureField(collection, { name: "academic_year", type: "text", required: false, max: 20, default: "2025-2026" });
  ensureField(collection, { name: "is_active", type: "bool", required: false, default: true });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("schedules");
  return app.save(collection);
})
