/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection;
  try {
    collection = app.findCollectionByNameOrId("o75aurkfe4tklxy");
  } catch (e) {
    collection = new Collection({
      id: "o75aurkfe4tklxy",
      name: "sessions",
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

  collection.name = "sessions";
  collection.type = "base";
  collection.system = false;
  collection.listRule = "@request.auth.collectionName = '_superusers' || @request.auth.collectionName = 'professors'";
  collection.viewRule = "@request.auth.collectionName = '_superusers' || @request.auth.collectionName = 'professors'";
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
    { cascadeDelete: false, collectionId: "mv0kreeye3g8h7o", hidden: false, id: "sesssched001", maxSelect: 1, minSelect: 0, name: "schedule_id", presentable: false, required: true, system: false, type: "relation" },
    { cascadeDelete: false, collectionId: "9c2c0gcxslsxxmu", hidden: false, id: "sessprof001x", maxSelect: 1, minSelect: 0, name: "professor_id", presentable: false, required: true, system: false, type: "relation" },
    { hidden: false, id: "sessstart001x", name: "start_time", presentable: false, required: true, system: false, type: "date" },
    { hidden: false, id: "sessend001xxx", name: "end_time", presentable: false, required: false, system: false, type: "date" },
    { hidden: false, id: "sessstatus001", maxSelect: 1, name: "status", presentable: false, required: true, system: false, type: "select", values: ["Active", "Closed", "Cancelled"] },
    { hidden: false, id: "sesstotal001x", max: null, min: 0, name: "total_students", noDecimal: true, onlyInt: true, presentable: false, required: false, system: false, type: "number" },
    { hidden: false, id: "sesspres001xx", max: null, min: 0, name: "present_count", noDecimal: true, onlyInt: true, presentable: false, required: false, system: false, type: "number" },
    { hidden: false, id: "sessabs001xxx", max: null, min: 0, name: "absent_count", noDecimal: true, onlyInt: true, presentable: false, required: false, system: false, type: "number" }
  ];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("o75aurkfe4tklxy");
  return app.save(collection);
})
