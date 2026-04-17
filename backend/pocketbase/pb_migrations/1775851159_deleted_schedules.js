/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection;
  try {
    collection = app.findCollectionByNameOrId("mv0kreeye3g8h7o");
  } catch (e) {
    collection = new Collection({
      id: "mv0kreeye3g8h7o",
      name: "schedules",
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

  collection.name = "schedules";
  collection.type = "base";
  collection.system = false;
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.collectionName = '_superusers'";
  collection.updateRule = "@request.auth.collectionName = '_superusers'";
  collection.deleteRule = "@request.auth.collectionName = '_superusers'";
  collection.fields = [
    {
      autogeneratePattern: "[a-z0-9]{15}",
      hidden: false,
      id: "text3208210256",
      max: 15,
      min: 15,
      name: "id",
      pattern: "^[a-z0-9]+$",
      presentable: false,
      primaryKey: true,
      required: true,
      system: true,
      type: "text"
    },
    { cascadeDelete: false, collectionId: "a6412v4e4kiesot", hidden: false, id: "schedsubj001", maxSelect: 1, minSelect: 0, name: "subject_id", presentable: false, required: true, system: false, type: "relation" },
    { cascadeDelete: false, collectionId: "wnmb27lz8cyxhr6", hidden: false, id: "schedroom001", maxSelect: 1, minSelect: 0, name: "room_id", presentable: false, required: true, system: false, type: "relation" },
    { cascadeDelete: false, collectionId: "9c2c0gcxslsxxmu", hidden: false, id: "schedprof001", maxSelect: 1, minSelect: 0, name: "professor_id", presentable: false, required: true, system: false, type: "relation" },
    { cascadeDelete: false, collectionId: "18m3wm9z8hj5riw", hidden: false, id: "schedgroup001", maxSelect: 1, minSelect: 0, name: "group_id", presentable: false, required: true, system: false, type: "relation" },
    { hidden: false, id: "schedday001", maxSelect: 1, name: "day_of_week", presentable: false, required: true, system: false, type: "select", values: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"] },
    { hidden: false, id: "schedstart001", max: 5, min: 5, name: "start_time", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "schedend001xx", max: 5, min: 5, name: "end_time", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "scheddur001xx", max: 300, min: 15, name: "duration_minutes", noDecimal: true, onlyInt: true, presentable: false, required: true, system: false, type: "number" },
    { hidden: false, id: "schedsem001xx", maxSelect: 1, name: "semester", presentable: false, required: true, system: false, type: "select", values: ["Fall", "Spring", "Summer"] },
    { hidden: false, id: "schedayear001", max: 20, min: 4, name: "academic_year", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" }
  ];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("mv0kreeye3g8h7o");
  return app.save(collection);
})
