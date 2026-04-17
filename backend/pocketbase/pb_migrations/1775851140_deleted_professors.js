/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection;
  try {
    collection = app.findCollectionByNameOrId("9c2c0gcxslsxxmu");
  } catch (e) {
    collection = new Collection({
      id: "9c2c0gcxslsxxmu",
      name: "professors",
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

  collection.name = "professors";
  collection.type = "base";
  collection.system = false;
  collection.listRule = "@request.auth.collectionName = '_superusers' || (@request.auth.collectionName = 'professors' && id = @request.auth.id)";
  collection.viewRule = "@request.auth.collectionName = '_superusers' || (@request.auth.collectionName = 'professors' && id = @request.auth.id)";
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
    { hidden: false, id: "profnatidfld01", max: 20, min: 10, name: "national_id", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "profnameen001", max: 200, min: 2, name: "name_en", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "profnamear001", max: 200, min: 2, name: "name_ar", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "profrfiduid001", max: 50, min: 0, name: "rfid_uid", pattern: "", presentable: false, primaryKey: false, required: false, system: false, type: "text" },
    { hidden: false, id: "profpinfld0001", max: 6, min: 4, name: "session_pin", pattern: "^[0-9]{4,6}$", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "profdeptfld001", max: 100, min: 2, name: "department", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "profrankfld001", maxSelect: 1, name: "academic_rank", presentable: false, required: false, system: false, type: "select", values: ["Professor", "Associate Professor", "Assistant Professor", "Lecturer"] },
    { hidden: false, id: "profemailf001", name: "email", onlyEmail: true, presentable: false, required: true, system: false, type: "email" },
    { hidden: false, id: "profoffice001", max: 100, min: 0, name: "office_location", pattern: "", presentable: false, primaryKey: false, required: false, system: false, type: "text" },
    { cascadeDelete: false, collectionId: "a6412v4e4kiesot", hidden: false, id: "profcourses001", maxSelect: 999, minSelect: 0, name: "assigned_courses", presentable: false, required: false, system: false, type: "relation" },
    { hidden: false, id: "profactive001", name: "active_session_status", presentable: false, required: false, system: false, type: "bool" },
    { cascadeDelete: false, collectionId: "mv0kreeye3g8h7o", hidden: false, id: "profschedrel01", maxSelect: 1, minSelect: 0, name: "schedule_id", presentable: false, required: false, system: false, type: "relation" },
    { hidden: false, id: "proflogindate1", name: "last_login", presentable: false, required: false, system: false, type: "date" },
    { hidden: true, id: "profpassword01", max: 200, min: 4, name: "password", pattern: "", presentable: false, primaryKey: false, required: false, system: false, type: "text" },
    { hidden: true, id: "profpashash01", max: 200, min: 64, name: "password_hash", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" }
  ];
  collection.indexes = [
    "CREATE UNIQUE INDEX idx_professors_national_id ON professors (national_id)",
    "CREATE UNIQUE INDEX idx_professors_email ON professors (email)",
    "CREATE UNIQUE INDEX idx_professors_rfid ON professors (rfid_uid) WHERE rfid_uid != ''"
  ];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("9c2c0gcxslsxxmu");
  return app.save(collection);
})
