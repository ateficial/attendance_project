/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection;
  try {
    collection = app.findCollectionByNameOrId("w0g3x7ejcttsshk");
  } catch (e) {
    collection = new Collection({
      id: "w0g3x7ejcttsshk",
      name: "attendance_records",
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

  collection.name = "attendance_records";
  collection.type = "base";
  collection.system = false;
  collection.listRule = "@request.auth.collectionName = '_superusers' || @request.auth.collectionName = 'professors'";
  collection.viewRule = "@request.auth.collectionName = '_superusers' || @request.auth.collectionName = 'professors' || (@request.auth.collectionName = 'students' && student_id = @request.auth.id)";
  collection.createRule = "@request.auth.collectionName = '_superusers' || @request.auth.collectionName = 'professors'";
  collection.updateRule = "@request.auth.collectionName = '_superusers' || @request.auth.collectionName = 'professors'";
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
    { cascadeDelete: false, collectionId: "n4ui4ywuipqs7rn", hidden: false, id: "attsturef001x", maxSelect: 1, minSelect: 0, name: "student_id", presentable: false, required: true, system: false, type: "relation" },
    { cascadeDelete: false, collectionId: "o75aurkfe4tklxy", hidden: false, id: "attsessref001", maxSelect: 1, minSelect: 0, name: "session_id", presentable: false, required: true, system: false, type: "relation" },
    { cascadeDelete: false, collectionId: "a6412v4e4kiesot", hidden: false, id: "attsubjref001x", maxSelect: 1, minSelect: 0, name: "subject_id", presentable: false, required: true, system: false, type: "relation" },
    { hidden: false, id: "attcheckin001x", name: "check_in_time", presentable: false, required: true, system: false, type: "date" },
    { hidden: false, id: "attstatus001xx", maxSelect: 1, name: "status", presentable: false, required: true, system: false, type: "select", values: ["Present", "Absent", "Late", "Excused"] },
    { hidden: false, id: "attverify001xx", name: "verified", presentable: false, required: false, system: false, type: "bool" }
  ];
  collection.indexes = [
    "CREATE UNIQUE INDEX idx_att_student_session ON attendance_records (student_id, session_id)"
  ];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("w0g3x7ejcttsshk");
  return app.save(collection);
})
