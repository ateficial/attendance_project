/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection;
  try {
    collection = app.findCollectionByNameOrId("a6412v4e4kiesot");
  } catch (e) {
    collection = new Collection({
      id: "a6412v4e4kiesot",
      name: "subjects",
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

  collection.name = "subjects";
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
    {
      hidden: false,
      id: "subjcodefield01",
      max: 20,
      min: 2,
      name: "code",
      pattern: "",
      presentable: false,
      primaryKey: false,
      required: true,
      system: false,
      type: "text"
    },
    {
      hidden: false,
      id: "subjnameenfld1",
      max: 200,
      min: 2,
      name: "name_en",
      pattern: "",
      presentable: false,
      primaryKey: false,
      required: true,
      system: false,
      type: "text"
    },
    {
      hidden: false,
      id: "subjnamearfld1",
      max: 200,
      min: 2,
      name: "name_ar",
      pattern: "",
      presentable: false,
      primaryKey: false,
      required: true,
      system: false,
      type: "text"
    },
    {
      hidden: false,
      id: "subjdeptfield1",
      max: 100,
      min: 2,
      name: "department",
      pattern: "",
      presentable: false,
      primaryKey: false,
      required: true,
      system: false,
      type: "text"
    },
    {
      hidden: false,
      id: "subjlevelfld01",
      max: 4,
      min: 1,
      name: "level",
      noDecimal: true,
      onlyInt: true,
      presentable: false,
      required: false,
      system: false,
      type: "number"
    },
    {
      hidden: false,
      id: "subjcredithrs1",
      max: 4,
      min: 1,
      name: "credit_hours",
      noDecimal: true,
      onlyInt: true,
      presentable: false,
      required: false,
      system: false,
      type: "number"
    },
    {
      cascadeDelete: false,
      collectionId: "9c2c0gcxslsxxmu",
      hidden: false,
      id: "subjprofrel001",
      maxSelect: 1,
      minSelect: 0,
      name: "professor_id",
      presentable: false,
      required: false,
      system: false,
      type: "relation"
    }
  ];
  collection.indexes = [
    "CREATE UNIQUE INDEX idx_subjects_code ON subjects (code)"
  ];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("a6412v4e4kiesot");
  return app.save(collection);
})
