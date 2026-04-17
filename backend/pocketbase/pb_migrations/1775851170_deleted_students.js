/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection;
  try {
    collection = app.findCollectionByNameOrId("n4ui4ywuipqs7rn");
  } catch (e) {
    collection = new Collection({
      id: "n4ui4ywuipqs7rn",
      name: "students",
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

  collection.name = "students";
  collection.type = "base";
  collection.system = false;
  collection.listRule = "@request.auth.collectionName = '_superusers' || @request.auth.collectionName = 'professors'";
  collection.viewRule = "@request.auth.collectionName = '_superusers' || @request.auth.collectionName = 'professors' || (@request.auth.collectionName = 'students' && id = @request.auth.id)";
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
    { hidden: false, id: "stunatidfld001", max: 20, min: 10, name: "national_id", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "stunameenfld01", max: 200, min: 2, name: "name_en", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "stunamearfld01", max: 200, min: 2, name: "name_ar", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "sturfiduidfld1", max: 50, min: 8, name: "rfid_uid", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "stuemailfld001", name: "email", onlyEmail: true, presentable: false, required: true, system: false, type: "email" },
    { hidden: false, id: "stufacultyf001", max: 100, min: 2, name: "faculty", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "stumajorfld001", max: 100, min: 2, name: "major", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "stuacyearfld01", max: 6, min: 1, name: "academic_year", noDecimal: true, onlyInt: true, presentable: false, required: false, system: false, type: "number" },
    { hidden: false, id: "stulevsemfld01", max: 12, min: 1, name: "level_semester", noDecimal: true, onlyInt: true, presentable: false, required: false, system: false, type: "number" },
    { hidden: false, id: "stuenrollfld01", maxSelect: 1, name: "enrollment_status", presentable: false, required: false, system: false, type: "select", values: ["Active", "Inactive", "Graduated", "Suspended"] },
    { cascadeDelete: false, collectionId: "18m3wm9z8hj5riw", hidden: false, id: "stugrouprel001", maxSelect: 1, minSelect: 0, name: "group_id", presentable: false, required: false, system: false, type: "relation" },
    { cascadeDelete: false, collectionId: "a6412v4e4kiesot", hidden: false, id: "sturegcours001", maxSelect: 999, minSelect: 0, name: "registered_courses", presentable: false, required: false, system: false, type: "relation" },
    { hidden: false, id: "stuattperfld01", max: 100, min: 0, name: "attendance_percentage", noDecimal: false, onlyInt: false, presentable: false, required: false, system: false, type: "number" },
    { hidden: false, id: "stulastseen001", name: "last_seen", presentable: false, required: false, system: false, type: "date" },
    { hidden: false, id: "stustatusfld01", maxSelect: 1, name: "status", presentable: false, required: false, system: false, type: "select", values: ["Present", "Absent", "Excused"] },
    { hidden: true, id: "stupasshash001", max: 200, min: 64, name: "password_hash", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" }
  ];
  collection.indexes = [
    "CREATE UNIQUE INDEX idx_students_national_id ON students (national_id)",
    "CREATE UNIQUE INDEX idx_students_email ON students (email)",
    "CREATE UNIQUE INDEX idx_students_rfid ON students (rfid_uid)"
  ];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("n4ui4ywuipqs7rn");
  return app.save(collection);
})
