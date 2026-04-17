/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection;
  try {
    collection = app.findCollectionByNameOrId("18m3wm9z8hj5riw");
  } catch (e) {
    collection = new Collection({
      id: "18m3wm9z8hj5riw",
      name: "groups",
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

  collection.name = "groups";
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
    { cascadeDelete: false, collectionId: "a6412v4e4kiesot", hidden: false, id: "grpsubjrel001", maxSelect: 1, minSelect: 0, name: "subject_id", presentable: false, required: true, system: false, type: "relation" },
    { hidden: false, id: "grpnamefld001", max: 50, min: 1, name: "group_name", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "grpsection001", max: 100, min: 1, name: "section_number", noDecimal: true, onlyInt: true, presentable: false, required: true, system: false, type: "number" },
    { cascadeDelete: false, collectionId: "n4ui4ywuipqs7rn", hidden: false, id: "grpstudsrel01", maxSelect: 999, minSelect: 0, name: "students", presentable: false, required: false, system: false, type: "relation" },
    { hidden: false, id: "grpcapacity01", max: 500, min: 1, name: "max_capacity", noDecimal: true, onlyInt: true, presentable: false, required: false, system: false, type: "number" }
  ];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("18m3wm9z8hj5riw");
  return app.save(collection);
})
