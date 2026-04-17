/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection;
  try {
    collection = app.findCollectionByNameOrId("wnmb27lz8cyxhr6");
  } catch (e) {
    collection = new Collection({
      id: "wnmb27lz8cyxhr6",
      name: "rooms",
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

  collection.name = "rooms";
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
    { hidden: false, id: "roomcodefld001", max: 20, min: 2, name: "room_code", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "roombuildfld01", max: 100, min: 1, name: "building", pattern: "", presentable: false, primaryKey: false, required: true, system: false, type: "text" },
    { hidden: false, id: "roomcapfld0001", max: 1000, min: 1, name: "capacity", noDecimal: true, onlyInt: true, presentable: false, required: true, system: false, type: "number" },
    { hidden: false, id: "roomtypefld001", maxSelect: 1, name: "room_type", presentable: false, required: false, system: false, type: "select", values: ["Classroom", "Lab", "Lecture Hall"] },
    { hidden: false, id: "roomequipfld01", maxSize: 2000000, name: "equipment", presentable: false, required: false, system: false, type: "json" }
  ];
  collection.indexes = [
    "CREATE UNIQUE INDEX idx_rooms_room_code ON rooms (room_code)"
  ];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("wnmb27lz8cyxhr6");
  return app.save(collection);
})
