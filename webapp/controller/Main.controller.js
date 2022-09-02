sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    'sap/ui/model/Sorter',
    "sap/ui/Device",
    "sap/ui/table/library",
    "sap/m/TablePersoController"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController) {
        "use strict";

        // shortcut for sap.ui.table.SortOrder
        var SortOrder = library.SortOrder;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

        return Controller.extend("zuigmc2.controller.Main", {

            onInit: function () {
                var oModel = this.getOwnerComponent().getModel();               
                var _this = this; 
                this.validationErrors = [];

                oModel.read('/GMCSet', {
                    success: function (data, response) {
                        data.results.forEach((item, index) => {
                            item.Deleted = item.Deleted === "X" ? true : false;

                            if (item.Createddt !== null)
                                item.Createddt = dateFormat.format(item.Createddt);

                            if (item.Updateddt !== null)
                                item.Updateddt = dateFormat.format(item.Updateddt);

                            if (index === 0) {
                                item.Active = true;
                            }
                            else {
                                item.Active = false;
                            }
                        });

                        data.results.sort((a,b) => (a.Gmc > b.Gmc ? 1 : -1));
                        
                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData(data);

                        _this.getView().setModel(new JSONModel({
                            activeGmc: data.results[0].Gmc
                        }), "ui");

                        _this.getView().setModel(oJSONModel, "gmc");
                        _this.getMaterials();
                        _this.getAttributes();
                    },
                    error: function (err) { }
                })
                
                this._oGlobalGMCFilter = null;
                this._oSortDialog = null;
                this._oFilterDialog = null;
                this._oViewSettingsDialog = {};

                this._aEntitySet = {
                    gmc: "GMCSet", attributes: "GMCAttribSet", materials: "GMCMaterialSet"
                };

                this._aColumns = {};
                this._aSortableColumns = {};
                this._aFilterableColumns = {};

                // this._aGMCColumns = [];
                // this._aAttributesColumns = [];
                // this._aMaterialsColumns = [];
                this.getColumns();
                
                this._oDataBeforeChange = {};
                this.getView().setModel(new JSONModel({
                    dataMode: 'READ'
                }), "ui");

                var oDelegateKeyUp = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    }
                };

                this.byId("gmcTab").addEventDelegate(oDelegateKeyUp);
            },

            getMaterials() {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oEntitySet = "/GMCMaterialSet";
                var _this = this;
                var sGmc = this.getView().getModel("ui").getData().activeGmc;
                // console.log(sGmc)
                oModel.read(oEntitySet, {
                    urlParameters: {
                        "$filter": "Gmc eq '" + sGmc + "'"
                    },
                    success: function (data, response) {
                        data.results.forEach((item, index) => {
                            if (item.Createddt !== null)
                                item.Createddt = dateFormat.format(item.Createddt);

                            if (item.Updateddt !== null)
                                item.Updateddt = dateFormat.format(item.Updateddt);
                        })

                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "materials");
                    },
                    error: function (err) { }
                })
            },

            getAttributes() {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oEntitySet = "/GMCAttribSet";
                var _this = this;
                var sGmc = this.getView().getModel("ui").getData().activeGmc;

                oModel.read(oEntitySet, {
                    urlParameters: {
                        "$filter": "Gmc eq '" + sGmc + "'"
                    },
                    success: function (data, response) {
                        data.results.forEach((item, index) => {
                            if (item.Createddt !== null)
                                item.Createddt = dateFormat.format(item.Createddt);

                            if (item.Updateddt !== null)
                                item.Updateddt = dateFormat.format(item.Updateddt);
                        })
                        // console.log(response)
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "attributes");
                    },
                    error: function (err) { }
                })
            },

            getColumns: async function() {
                var sPath = jQuery.sap.getModulePath("zuigmc2", "/model/columns.json");
                // var oModelColumns = new JSONModel(sPath);
                // console.log(oModelColumns)

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);
                // await oModelColumns.getData();
                // console.log(oModelColumns)
                // console.log(oModelColumns.oData)

                var oColumns = oModelColumns.getData();
                // console.log(oColumns)
                var oModel = this.getOwnerComponent().getModel();

                oModel.metadataLoaded().then(() => {
                    var oService = oModel.getServiceMetadata().dataServices.schema.filter(item => item.namespace === "ZGW_3DERP_GMC_SRV");
                    // console.log(oService)
                    var oMetadata = oService[0].entityType.filter(item => item.name === "GMC");
                    if (oMetadata.length > 0) { 
                        var aColumns = this.initColumns(oColumns["gmc"], oMetadata[0]);
                        this._aColumns["gmc"] = aColumns["columns"];
                        this._aSortableColumns["gmc"] = aColumns["sortableColumns"];
                        this._aFilterableColumns["gmc"] = aColumns["filterableColumns"];
                        this.onAddColumns(this.byId("gmcTab"), aColumns["columns"], "gmc");
                        // console.log(this._aColumns["gmc"])
                    }

                    oMetadata = oService[0].entityType.filter(item => item.name === "GMCAttrib");
                    if (oMetadata.length > 0) { 
                        var aColumns = this.initColumns(oColumns["attributes"], oMetadata[0]);
                        this._aColumns["attributes"] = aColumns["columns"];
                        this._aSortableColumns["attributes"] = aColumns["sortableColumns"];
                        this._aFilterableColumns["attributes"] = aColumns["filterableColumns"];
                        this.onAddColumns(this.byId("attributesTab"), aColumns["columns"], "attributes");
                    }

                    oMetadata = oService[0].entityType.filter(item => item.name === "GMCMaterial");
                    if (oMetadata.length > 0) { 
                        var aColumns = this.initColumns(oColumns["materials"], oMetadata[0]);
                        this._aColumns["materials"] = aColumns["columns"];;
                        this._aSortableColumns["materials"] = aColumns["sortableColumns"];
                        this._aFilterableColumns["materials"] = aColumns["filterableColumns"];
                        this.onAddColumns(this.byId("materialsTab"), aColumns["columns"], "materials");
                    }

                    // this.getValueHelpItems();
                    // console.log(this._aColumns)
                })
            },

            initColumns: function(arg1, arg2) {
                var oColumn = arg1;
                var oMetadata = arg2;
                
                var aSortableColumns = [];
                var aFilterableColumns = [];
                var aColumns = [];

                oMetadata.property.forEach((prop, idx) => {
                    var vCreatable = prop.extensions.filter(item => item.name === "creatable");
                    var vUpdatable = prop.extensions.filter(item => item.name === "updatable");
                    var vSortable = prop.extensions.filter(item => item.name === "sortable");
                    var vFilterable = prop.extensions.filter(item => item.name === "filterable");
                    var vName = prop.extensions.filter(item => item.name === "label")[0].value;
                    var oColumnLocalProp = oColumn.filter(col => col.name === prop.name);
                    var vShowable = oColumnLocalProp.length === 0 ? true :  oColumnLocalProp[0].showable;
                    // console.log(prop)
                    if (vShowable) {
                        //sortable
                        if (vSortable.length === 0 || vSortable[0].value === "true") {
                            aSortableColumns.push({
                                name: prop.name, 
                                label: vName, 
                                position: oColumnLocalProp.length === 0 ? idx: oColumnLocalProp[0].position, 
                                sorted: oColumnLocalProp.length === 0 ? false : oColumnLocalProp[0].sort === "" ? false : true,
                                sortOrder: oColumnLocalProp.length === 0 ? "" : oColumnLocalProp[0].sort
                            });
                        }

                        //filterable
                        if (vFilterable.length === 0 || vFilterable[0].value === "true") {
                            aFilterableColumns.push({
                                name: prop.name, 
                                label: vName, 
                                position: oColumnLocalProp.length === 0 ? idx : oColumnLocalProp[0].position,
                                value: "",
                                connector: "Contains"
                            });
                        }
                    }

                    //columns
                    aColumns.push({
                        name: prop.name, 
                        label: vName, 
                        position: oColumnLocalProp.length === 0 ? idx : oColumnLocalProp[0].position,
                        type: oColumnLocalProp.length === 0 ? prop.type : oColumnLocalProp[0].type,
                        creatable: vCreatable.length === 0 ? true : vCreatable[0].value === "true" ? true : false,
                        updatable: vUpdatable.length === 0 ? true : vUpdatable[0].value === "true" ? true : false,
                        sortable: vSortable.length === 0 ? true : vSortable[0].value === "true" ? true : false,
                        filterable: vFilterable.length === 0 ? true : vFilterable[0].value === "true" ? true : false,
                        visible: oColumnLocalProp.length === 0 ? true : oColumnLocalProp[0].visible,
                        required: oColumnLocalProp.length === 0 ? false : oColumnLocalProp[0].required,
                        width: oColumnLocalProp.length === 0 ? "150px" : oColumnLocalProp[0].width,
                        sortIndicator: oColumnLocalProp.length === 0 ? "None" : oColumnLocalProp[0].sort,
                        hideOnChange: oColumnLocalProp.length === 0 ? false : oColumnLocalProp[0].hideOnChange,
                        valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                        showable: oColumnLocalProp.length === 0 ? true : oColumnLocalProp[0].showable,
                        key: oMetadata.key.propertyRef.filter(item => item.name === prop.name).length === 0 ? false : true,
                        maxLength: prop.maxLength !== undefined ? prop.maxLength : null,
                        precision: prop.precision !== undefined ? prop.precision : null,
                        scale: prop.scale !== undefined ? prop.scale : null
                    })
                })

                aSortableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                this.createViewSettingsDialog("sort", 
                    new JSONModel({
                        items: aSortableColumns,
                        rowCount: aSortableColumns.length,
                        activeRow: 0,
                        table: ""
                    })
                );

                aFilterableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                this.createViewSettingsDialog("filter", 
                    new JSONModel({
                        items: aFilterableColumns,
                        rowCount: aFilterableColumns.length,
                        table: ""
                    })
                );

                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                var aColumnProp = aColumns.filter(item => item.showable === true);

                this.createViewSettingsDialog("column", 
                    new JSONModel({
                        items: aColumnProp,
                        rowCount: aColumnProp.length,
                        table: ""
                    })
                );

                
                return { columns: aColumns, sortableColumns: aSortableColumns, filterableColumns: aFilterableColumns };
            },

            onAddColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)

                aColumns.forEach(col => {
                    if (col.type === "Edm.String") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"})
                        }));
                    }
                    else if (col.type === "Edm.Decimal") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"})
                        }));
                    }
                    else if (col.type === "Edm.Boolean" ) {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false})
                        }));
                    }
                })
            },

            onTableResize(arg1, arg2) {
                if (arg1 === "Hdr") {
                    if (arg2 === "Max") {
                        this.byId("fixFlexGMC").setProperty("fixContentSize", "99%");
                        this.byId("btnFullScreenHdr").setVisible(false);
                        this.byId("btnExitFullScreenHdr").setVisible(true);
                    }
                    else {
                        this.byId("fixFlexGMC").setProperty("fixContentSize", "50%");
                        this.byId("btnFullScreenHdr").setVisible(true);
                        this.byId("btnExitFullScreenHdr").setVisible(false);
                    }
                }
                else {
                    if (arg2 === "Max") {
                        this.byId("fixFlexGMC").setProperty("fixContentSize", "0%");
                        this.byId("btnFullScreenAttr").setVisible(false);
                        this.byId("btnExitFullScreenAttr").setVisible(true);
                        this.byId("btnFullScreenMatl").setVisible(false);
                        this.byId("btnExitFullScreenMatl").setVisible(true);
                    }
                    else {
                        this.byId("fixFlexGMC").setProperty("fixContentSize", "50%");
                        this.byId("btnFullScreenAttr").setVisible(true);
                        this.byId("btnExitFullScreenAttr").setVisible(false);
                        this.byId("btnFullScreenMatl").setVisible(true);
                        this.byId("btnExitFullScreenMatl").setVisible(false);
                    }                    
                }
            },

            onCreateGMC() {
                this.byId("btnAddGMC").setVisible(false);
                this.byId("btnEditGMC").setVisible(false);
                this.byId("btnSaveGMC").setVisible(true);
                this.byId("btnCancelGMC").setVisible(true);
                this.byId("btnDeleteGMC").setVisible(false);
                this.byId("btnRefreshGMC").setVisible(false);
                this.byId("btnSortGMC").setVisible(false);
                this.byId("btnFilterGMC").setVisible(false);
                this.byId("btnFullScreenHdr").setVisible(false);
                this.byId("btnColPropGMC").setVisible(false);
                this.byId("searchFieldGMC").setVisible(false);
                this.onTableResize("Hdr","Max");
                this.byId("btnExitFullScreenHdr").setVisible(false);
                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("gmc").getData());

                var aNewRow = [];
                var oNewRow = {};
                var oTable = this.byId("gmcTab");                
                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns["gmc"].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (!ci.hideOnChange && ci.creatable) {
                                if (ci.type === "Edm.Boolean") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{gmc>" + ci.name + "}", editable: true}));
                                }
                                else if (ci.valueHelp["show"]) {
                                    col.setTemplate(new sap.m.Input({
                                        // id: "ipt" + ci.name,
                                        type: "Text",
                                        value: "{gmc>" + ci.name + "}",
                                        maxLength: +ci.maxLength,
                                        showValueHelp: true,
                                        valueHelpRequest: this.handleValueHelp.bind(this),
                                        showSuggestion: true,
                                        suggestionItems: {
                                            path: ci.valueHelp["suggestionItems"].path,
                                            length: 1000,
                                            template: new sap.ui.core.Item({
                                                key: ci.valueHelp["suggestionItems"].text,
                                                text: ci.valueHelp["suggestionItems"].text
                                            }),
                                            templateShareable: false
                                        },
                                        liveChange: this.onValueHelpLiveInputChange.bind(this)
                                    }));
                                }
                                else if (ci.type === "Edm.Decimal" || ci.type === "Edm.Double" || ci.type === "Edm.Float" || ci.type === "Edm.Int16" || ci.type === "Edm.Int32" || ci.type === "Edm.Int64" || ci.type === "Edm.SByte" || ci.type === "Edm.Single") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        value: "{path:'{gmc>" + ci.name + "}', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + ci.scale + ", maxFractionDigits:" + ci.scale + " }, constraints:{ precision:" + ci.precision + ", scale:" + ci.scale + " }}",
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                                else {
                                    if (ci.maxLength !== null) {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{gmc>" + ci.name + "}", 
                                            maxLength: +ci.maxLength,
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{gmc>" + ci.name + "}", 
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }
                            } 

                            if (ci.required) {
                                col.getLabel().addStyleClass("requiredField");
                            }

                            if (ci.type === "Edm.String") oNewRow[ci.name] = "";
                            else if (ci.type === "Edm.Decimal") oNewRow[ci.name] = 0;
                            else if (ci.type === "Edm.Boolean") oNewRow[ci.name] = false;
                        })
                }) 
                
                // var oModel = this.getView().getModel("gmc");
                // oModel.oData.results.push(oNewRow);
                // oModel.refresh();
                
                oNewRow["New"] = true;
                aNewRow.push(oNewRow);
                this.getView().getModel("gmc").setProperty("/results", aNewRow);
                this.getView().getModel("ui").setProperty("/dataMode", 'NEW');
            },

            onEditGMC() {
                this.byId("btnAddGMC").setVisible(false);
                this.byId("btnEditGMC").setVisible(false);
                this.byId("btnSaveGMC").setVisible(true);
                this.byId("btnCancelGMC").setVisible(true);
                this.byId("btnDeleteGMC").setVisible(false);
                this.byId("btnRefreshGMC").setVisible(false);
                this.byId("btnSortGMC").setVisible(false);
                this.byId("btnFilterGMC").setVisible(false);
                this.byId("btnExitFullScreenHdr").setVisible(false);
                this.byId("btnColPropGMC").setVisible(false);
                this.byId("searchFieldGMC").setVisible(false);
                this.onTableResize("Hdr","Max");
                this.byId("btnExitFullScreenHdr").setVisible(false);

                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("gmc").getData());

                var oTable = this.byId("gmcTab");
                var aSelIndices = oTable.getSelectedIndices();
                var aData = this.getView().getModel("gmc").getData().results;
                var aDataToEdit = [];

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        aDataToEdit.push(aData.at(item));
                    })
                }
                else aDataToEdit = aData;

                aDataToEdit = aDataToEdit.filter(item => item.Deleted === false);
                
                this.getView().getModel("gmc").setProperty("/results", aDataToEdit);
                this.setRowEditMode("gmc");

                this.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
            },

            onEditAttr: function(oEvent) {
                this.byId("btnEditAttr").setVisible(false);
                this.byId("btnSaveAttr").setVisible(true);
                this.byId("btnCancelAttr").setVisible(true);
                this.byId("btnRefreshAttr").setVisible(false);
                this.byId("btnSortAttr").setVisible(false);
                this.byId("btnFilterAttr").setVisible(false);
                this.byId("btnFullScreenAttr").setVisible(false);
                this.byId("btnColPropAttr").setVisible(false);
                this.byId("searchFieldAttr").setVisible(false);
                this.onTableResize("Attr","Max");
                this.byId("btnExitFullScreenAttr").setVisible(false);

                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("attributes").getData());
                this.setRowEditMode("attributes");

                var oIconTabBar = this.byId("itbDetail");
                oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                    .forEach(item => item.setProperty("enabled", false));

                this.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
            },

            setRowEditMode(arg) {
                this.getView().getModel(arg).getData().results.forEach(item => item.Edited = false);

                var oTable = this.byId(arg + "Tab");

                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (!ci.hideOnChange && ci.updatable) {
                                if (ci.type === "Edm.Boolean") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: true}));
                                }
                                else if (ci.valueHelp["show"]) {
                                    col.setTemplate(new sap.m.Input({
                                        // id: "ipt" + ci.name,
                                        type: "Text",
                                        value: "{" + arg + ">" + ci.name + "}",
                                        maxLength: +ci.maxLength,
                                        showValueHelp: true,
                                        valueHelpRequest: this.handleValueHelp.bind(this),
                                        showSuggestion: true,
                                        suggestionItems: {
                                            path: ci.valueHelp["items"].path, //ci.valueHelp.model + ">/items", //ci.valueHelp["suggestionItems"].path,
                                            length: 1000,
                                            template: new sap.ui.core.Item({
                                                key: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}",
                                                text: "{" + ci.valueHelp["items"].value + "}" //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}", //ci.valueHelp["suggestionItems"].text
                                            }),
                                            templateShareable: false
                                        },
                                        liveChange: this.onValueHelpLiveInputChange.bind(this)
                                    }));
                                }
                                else if (ci.type === "Edm.Decimal" || ci.type === "Edm.Double" || ci.type === "Edm.Float" || ci.type === "Edm.Int16" || ci.type === "Edm.Int32" || ci.type === "Edm.Int64" || ci.type === "Edm.SByte" || ci.type === "Edm.Single") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        value: "{path:'" + arg + ">" + ci.name + "', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + ci.scale + ", maxFractionDigits:" + ci.scale + " }, constraints:{ precision:" + ci.precision + ", scale:" + ci.scale + " }}",
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                                else {
                                    if (ci.maxLength !== null) {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            maxLength: +ci.maxLength,
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }                                
                            }

                            if (ci.required) {
                                col.getLabel().addStyleClass("requiredField");
                            }
                        })
                })
            },

            onNumberLiveChange: function(oEvent) {
                // console.log(oEvent.getParameters())
                // console.log(oEvent.getParameters().value.split("."))
                // console.log(this.validationErrors)
                if (this.validationErrors === undefined) this.validationErrors = [];

                if (oEvent.getParameters().value.split(".").length > 1) {
                    if (oEvent.getParameters().value.split(".")[1].length > 3) {
                        // console.log("invalid");
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number with a maximum of 3 decimal places.");
                        this.validationErrors.push(oEvent.getSource().getId());
                    }
                    else {
                        oEvent.getSource().setValueState("None");
                        this.validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this.validationErrors.splice(index, 1)
                            }
                        })
                    }
                }
                else {
                    oEvent.getSource().setValueState("None");
                    this.validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this.validationErrors.splice(index, 1)
                        }
                    })
                }

                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
            },

            onInputLiveChange: function(oEvent) {                
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                console.log(sRowPath)
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
            },

            onCancelGMC() {
                this.byId("btnAddGMC").setVisible(true);
                this.byId("btnEditGMC").setVisible(true);
                this.byId("btnSaveGMC").setVisible(false);
                this.byId("btnCancelGMC").setVisible(false);
                this.byId("btnDeleteGMC").setVisible(true);
                this.byId("btnRefreshGMC").setVisible(true);
                this.byId("btnSortGMC").setVisible(true);
                this.byId("btnFilterGMC").setVisible(true);
                this.byId("btnFullScreenHdr").setVisible(true);
                this.byId("btnColPropGMC").setVisible(true);
                this.byId("searchFieldGMC").setVisible(true);
                this.onTableResize("Hdr","Min");
                this.setRowReadMode("gmc");
                this.getView().getModel("gmc").setProperty("/", this._oDataBeforeChange);
                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
            },

            onCancelAttr() {
                this.byId("btnEditAttr").setVisible(true);
                this.byId("btnSaveAttr").setVisible(false);
                this.byId("btnCancelAttr").setVisible(false);
                this.byId("btnRefreshAttr").setVisible(true);
                this.byId("btnSortAttr").setVisible(true);
                this.byId("btnFilterAttr").setVisible(true);
                this.byId("btnFullScreenHdr").setVisible(true);
                this.byId("btnColPropAttr").setVisible(true);
                this.byId("searchFieldAttr").setVisible(true);
                this.onTableResize("Attr","Min");

                this.setRowReadMode("attributes");
                this.getView().getModel("attributes").setProperty("/", this._oDataBeforeChange);

                var oIconTabBar = this.byId("itbDetail");
                oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
            },

            onSave(arg) {
                var aNewRows = this.getView().getModel(arg).getData().results.filter(item => item.New === true);
                var aEditedRows = this.getView().getModel(arg).getData().results.filter(item => item.Edited === true);

                if (this.validationErrors.length === 0)
                {
                    if (aNewRows.length > 0) {
                        if (aNewRows[0].Mattyp === '' || aNewRows[0].Matgrpcd === '' || aNewRows[0].Baseuom === '') {
                            MessageBox.information("Please input required fields.");
                        }
                        else {
                            this.onCreateDialog(aNewRows[0]);
                        }
    
                        // aNewRows.forEach(item => {
                        //     //call insert service
    
                        //     this.setRowReadMode("gmc");
                        //     this.onTableResize("Hdr","Min");
                        //     this.setReqColHdrColor("gmc");
        
                        //     //insert new row to last 
                        //     var aData = this._oDataBeforeChange.results;
                        //     aData.push(item);
                        //     this.getView().getModel("gmc").setProperty("/results", aData);
                        // })
                    }
                    else if (aEditedRows.length > 0) {
                        var oModel = this.getOwnerComponent().getModel();
                        var iEdited = 0;
                        var _this = this;
                        
                        aEditedRows.forEach(item => {
                            // var entitySet = "/GMCSet('" + item.Gmc + "')";
                            // var param = {
                            //     "Baseuom": item.Baseuom,
                            //     "Orderuom": item.Orderuom,
                                // "Grswt": item.Grswt,
                                // "Netwt": item.Netwt,
                                // "Wtuom": item.Wtuom,
                                // "Volume": item.Volume,
                                // "Voluom": item.Voluom,
                                // "Cusmatcd": item.Cusmatcd,
                                // "Processcd": item.Processcd
                            // };
                            
                            var entitySet = "/" + this._aEntitySet[arg] + "(";
                            var param = {};
    
                            var iKeyCount = this._aColumns[arg].filter(col => col.key === true).length;
    
                            _this._aColumns[arg].forEach(col => {
                                if (col.updatable) param[col.name] = item[col.name]
    
                                if (iKeyCount === 1) { 
                                    if (col.key) entitySet += "'" + item[col.name] + "'" 
                                }
                                else if (iKeyCount > 1) { 
                                    if (col.key) entitySet += col.name + "='" + item[col.name] + "',"
                                }
                            })
                            
                            if (iKeyCount > 1) entitySet = entitySet.substr(0, entitySet.length - 1);
    
                            entitySet += ")";
     
                            setTimeout(() => {
                                oModel.update(entitySet, param, {
                                    method: "PUT",
                                    success: function(data, oResponse) {
                                        iEdited++;
    
                                        if (iEdited === aEditedRows.length) {
                                            _this.setButton(arg, "save");
    
                                            var oIconTabBar = _this.byId("itbDetail");
                                            oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
    
                                            _this.getView().getModel(arg).getData().forEach((row,index) => {
                                                _this.getView().getModel(arg).setProperty('/results/' + index + '/Edited', false);
                                            })
                                            
                                            _this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                                        }
                                    },
                                    error: function() {
                                        // alert("Error");
                                    }
                                });
                            }, 500)
                        });
                    }
                    else {
                        var bCompact = true;
    
                        MessageBox.information("No data have been modified.",
                            {
                                styleClass: bCompact ? "sapUiSizeCompact" : ""
                            }
                        );
                    }
                }
                else {
                    MessageBox.information("Please check invalid entry on input fields.");
                }
            },

            setButton(arg1, arg2) {
                if (arg2 === "save") {
                    if (arg1 === "gmc") {
                        this.byId("btnAddGMC").setVisible(true);
                        this.byId("btnEditGMC").setVisible(true);
                        this.byId("btnSaveGMC").setVisible(false);
                        this.byId("btnCancelGMC").setVisible(false);
                        this.byId("btnDeleteGMC").setVisible(true);
                        this.byId("btnRefreshGMC").setVisible(true);
                        this.byId("btnSortGMC").setVisible(true);
                        this.byId("btnFilterGMC").setVisible(true);
                        this.byId("btnFullScreenHdr").setVisible(true);
                        this.byId("btnColPropGMC").setVisible(true);
                        this.byId("searchFieldGMC").setVisible(true);
                        this.onTableResize("Hdr","Min");
                    }
                    else if (arg1 === "attributes") {
                        this.byId("btnEditAttr").setVisible(true);
                        this.byId("btnSaveAttr").setVisible(false);
                        this.byId("btnCancelAttr").setVisible(false);
                        this.byId("btnRefreshAttr").setVisible(true);
                        this.byId("btnSortAttr").setVisible(true);
                        this.byId("btnFilterAttr").setVisible(true);
                        this.byId("btnFullScreenAttr").setVisible(true);
                        this.byId("btnColPropAttr").setVisible(true);
                        this.byId("searchFieldAttr").setVisible(true);
                        this.onTableResize("Attr","Min");
                    }

                    this.setRowReadMode(arg1);
                    this.setReqColHdrColor(arg1);                    

                    if (arg1 === "gmc") {
                        this.onRefreshGMC();
                    }
                    else {
                        this.resetVisibleCols(arg1);
                    }
                }
            },

            onSaveGMC() {
                var aNewRows = this.getView().getModel("gmc").getData().results.filter(item => item.New === true);
                var aEditedRows = this.getView().getModel("gmc").getData().results.filter(item => item.Edited === true);

                if (aNewRows.length > 0) {
                    aNewRows.forEach(item => {
                        //call insert service
                        if (aNewRows[0].Mattyp === '' || aNewRows[0].Matgrpcd === '' || aNewRows[0].Baseuom === '') {
                            MessageBox.information("Please input required fields.");
                        }
                        else {
                            this.onCreateDialog();
                        }

                        // this.setRowReadMode("gmc");
                        // this.onTableResize("Hdr","Min");
                        // this.setReqColHdrColor("gmc");
    
                        // //insert new row to last 
                        // var aData = this._oDataBeforeChange.results;
                        // aData.push(item);
                        // this.getView().getModel("gmc").setProperty("/results", aData);
                    })
                }
                else if (aEditedRows.length > 0) {
                    var oModel = this.getOwnerComponent().getModel();
                    var iEdited = 0;
                    var _this = this;
                    
                    aEditedRows.forEach((item,idx) => {
                        var entitySet = "/GMCSet('" + item.Gmc + "')";
                        // var param = {
                        //     "Baseuom": item.Baseuom,
                        //     "Orderuom": item.Orderuom,
                        //     "Grswt": item.Grswt,
                        //     "Netwt": item.Netwt,
                        //     "Wtuom": item.Wtuom,
                        //     "Volume": item.Volume,
                        //     "Voluom": item.Voluom,
                        //     "Cusmatcd": item.Cusmatcd,
                        //     "Processcd": item.Processcd
                        // };

                        var param = {};

                        _this._aColumns["gmc"].forEach(col => {
                            if (col.updatable) param[col.name] = item[col.name]  
                        })

                        setTimeout(() => {
                            oModel.update(entitySet, param, {
                                method: "PUT",
                                success: function(data, oResponse) {
                                    iEdited++;

                                    if (iEdited === aEditedRows.length) {
                                        _this.byId("btnAddGMC").setVisible(true);
                                        _this.byId("btnEditGMC").setVisible(true);
                                        _this.byId("btnSaveGMC").setVisible(false);
                                        _this.byId("btnCancelGMC").setVisible(false);
                                        _this.byId("btnDeleteGMC").setVisible(true);
                                        _this.byId("btnRefreshGMC").setVisible(true);
                                        _this.byId("btnSortGMC").setVisible(true);
                                        _this.byId("btnFilterGMC").setVisible(true);
                                        _this.byId("btnFullScreenHdr").setVisible(true);
                                        _this.byId("btnColPropGMC").setVisible(true);
                                        _this.byId("searchFieldGMC").setVisible(true);
                                        _this.onTableResize("Hdr","Min");

                                        _this.setRowReadMode("gmc");
                                        _this.setReqColHdrColor("gmc");
                                        _this.resetVisibleCols("gmc");

                                        // this.getView().byId("headerTable").getColumns()
                                        //     .forEach(col => {
                                        //         pColumns.filter(item => item.label === col.getHeader().getText())
                                        //             .forEach(e => { 
                                        //                 if (e.visible) {
                                        //                     col.setProperty("visible", true)
                                        //                 }
                                        //                 else {
                                        //                     col.setProperty("visible", false)
                                        //                 }
                                        //             })
                                        // })
                                    }
                                },
                                error: function() {
                                    // alert("Error");
                                }
                            });
                        }, 500)
                    });
                }
                else {
                    var bCompact = true;

                    MessageBox.information("No data have been modified.",
                        {
                            styleClass: bCompact ? "sapUiSizeCompact" : ""
                        }
                    );
                }
            },

            onSaveAttr() {
                var aEditedRows = this.getView().getModel("attributes").getData().results.filter(item => item.Edited === true);
                // console.log(aEditedRows)

                if (aEditedRows.length > 0) {
                    var oModel = this.getOwnerComponent().getModel();
                    var iEdited = 0;
                    var _this = this;
                    
                    aEditedRows.forEach((item,idx) => {
                        var entitySet = "/GMCAttribSet(Gmc='" + item.Gmc + "',Mattypcls='" + item.Mattypcls + "')";
                        // var param = {
                        //     "Seq": item.Seq,
                        //     "Attribcd": item.Attribcd,
                        //     "Descen": item.Descen,
                        //     "Desczh": item.Desczh
                        // };

                        var param = {};

                        _this._aColumns["attributes"].forEach(col => {
                            if (col.updatable) param[col.name] = item[col.name]  
                        })

                        setTimeout(() => {
                            oModel.update(entitySet, param, {
                                method: "PUT",
                                success: function(data, oResponse) {
                                    iEdited++;

                                    if (iEdited === aEditedRows.length) {
                                        _this.byId("btnEditAttr").setVisible(true);
                                        _this.byId("btnSaveAttr").setVisible(false);
                                        _this.byId("btnCancelAttr").setVisible(false);
                                        _this.byId("btnRefreshAttr").setVisible(true);
                                        _this.byId("btnSortAttr").setVisible(true);
                                        _this.byId("btnFilterAttr").setVisible(true);
                                        _this.byId("btnFullScreenAttr").setVisible(true);
                                        _this.byId("btnColPropAttr").setVisible(true);
                                        _this.byId("searchFieldAttr").setVisible(true);
                                        _this.onTableResize("Attr","Min");

                                        _this.setRowReadMode("attributes");
                                        _this.setReqColHdrColor("attributes");
                                        _this.resetVisibleCols("attributes");

                                        // this.getView().byId("headerTable").getColumns()
                                        //     .forEach(col => {
                                        //         pColumns.filter(item => item.label === col.getHeader().getText())
                                        //             .forEach(e => { 
                                        //                 if (e.visible) {
                                        //                     col.setProperty("visible", true)
                                        //                 }
                                        //                 else {
                                        //                     col.setProperty("visible", false)
                                        //                 }
                                        //             })
                                        // })
                                    }
                                },
                                error: function() {
                                    // alert("Error");
                                }
                            });
                        }, 500)
                    });
                }
                else {
                    var bCompact = true;

                    MessageBox.information("No data have been modified.",
                        {
                            styleClass: bCompact ? "sapUiSizeCompact" : ""
                        }
                    );
                }
            },

            onDeleteGMC() {
                var oModel = this.getOwnerComponent().getModel();
                var oTable = this.byId("gmcTab");
                var aSelRows = oTable.getSelectedIndices();
                // var iDelCount = 0;
                // var _this = this;
                
                if (aSelRows.length === 0) {
                    MessageBox.information("No record(s) have been selected for deletion.");
                }
                else {
                    MessageBox.confirm("Proceed to delete " + aSelRows.length + " record(s)?", {
                        actions: ["Yes", "No"],
                        onClose: function (sAction) {
                            if (sAction === "Yes") {
                                aSelRows.forEach(rec => {
                                    var oContext = oTable.getContextByIndex(rec);
                                    var oModelGMC = oContext.getModel();
                                    var sPath = oContext.getPath();
                                    var vGmc = oContext.getObject().Gmc;
                                    var oEntitySet = "/GMCSet('" + vGmc + "')";
                                    var oParam = {
                                        "Deleted": "X"
                                    };
    
                                    setTimeout(() => {
                                        oModel.update(oEntitySet, oParam, {
                                            method: "PUT",
                                            success: function(data, oResponse) {
                                                oModelGMC.setProperty(sPath + '/Deleted', true);

                                                // iDelCount++;
    
                                                // if (iDelCount === aSelRows.length) {
                                                //     _this.refreshData();
                                                // }
                                            },
                                            error: function() {
                                                // alert("Error");
                                            }
                                        });
                                    }, 500)
                                });                            
                            }
                        }
                    });
                }               
            },

            onRefreshGMC() {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
                var _this = this;

                oModel.read('/GMCSet', {
                    success: function (data, response) {
                        data.results.forEach((item, index) => {
                            item.Deleted = item.Deleted === "X" ? true : false;
                            item.Createddt = dateFormat.format(item.Createddt);

                            if (item.Updateddt !== null)
                                item.Updateddt = dateFormat.format(item.Updateddt);
                                
                            if (index === 0) {
                                item.Active = true;
                            }
                            else {
                                item.Active = false;
                            }
                        })

                        data.results.sort((a,b) => (a.Gmc > b.Gmc ? 1 : -1));

                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "gmc");
                        _this.getMaterials();
                        _this.getAttributes();
                    },
                    error: function (err) {
                    }
                })
            },

            onRefreshAttr() {
                this.getAttributes();
            },

            onRefreshMatl() {
                this.getMaterials();
            },

            onColumnProp: function(oEvent) {
                var aColumns = [];
                var oTable = oEvent.getSource().oParent.oParent;
                
                oTable.getColumns().forEach(col => {
                    aColumns.push({
                        name: col.getProperty("sortProperty"), 
                        label: col.getLabel().getText(),
                        position: col.getIndex(), 
                        selected: col.getProperty("visible")
                    });
                })

                var oDialog = this._oViewSettingsDialog["zuigmc2.view.ColumnDialog"];
                oDialog.getModel().setProperty("/table", oTable.getBindingInfo("rows").model);
                oDialog.getModel().setProperty("/items", aColumns);
                oDialog.getModel().setProperty("/rowCount", aColumns.length);
                oDialog.open();
            },

            beforeOpenColProp: function(oEvent) {
                oEvent.getSource().getModel().getData().items.forEach(item => {
                    if (item.selected) {
                        oEvent.getSource().getContent()[0].addSelectionInterval(item.position, item.position);
                    }
                    else {
                        oEvent.getSource().getContent()[0].removeSelectionInterval(item.position, item.position);
                    }
                })
            },            

            onColumnPropConfirm: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.ColumnDialog"];
                var oDialogTable = oDialog.getContent()[0];
                var aSelRows = oDialogTable.getSelectedIndices();

                if (aSelRows.length === 0) {
                    MessageBox.information("Please select at least one visible column.");
                }
                else {
                    oDialog.close();
                    var sTable = oDialog.getModel().getData().table;
                    var oTable = this.byId(sTable + "Tab");
                    var oColumns = oTable.getColumns();

                    oColumns.forEach(col => {
                        if (aSelRows.filter(item => item === col.getIndex()).length === 0) {
                            col.setVisible(false);
                        }
                        else col.setVisible(true);
                    })
                }
            },

            onColumnPropCancel: function(oEvent) {
                this._oViewSettingsDialog["zuigmc2.view.ColumnDialog"].close();
            },

            onSorted: function(oEvent) {
                var sColumnName = oEvent.getParameters().column.getProperty("sortProperty");
                var sSortOrder = oEvent.getParameters().sortOrder;
                var bMultiSort = oEvent.getParameters().columnAdded;
                var oSortData = this._aSortableColumns[oEvent.getSource().getBindingInfo("rows").model];

                if (!bMultiSort) {
                    oSortData.forEach(item => {
                        if (item.name === sColumnName) {
                            item.sorted = true;
                            item.sortOrder = sSortOrder;
                        }
                        else {
                            item.sorted = false;
                        } 
                    })
                }
            },

            onColSort: function(oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;               
                var aSortableColumns = this._aSortableColumns[oTable.getBindingInfo("rows").model];

                var oDialog = this._oViewSettingsDialog["zuigmc2.view.SortDialog"];
                oDialog.getModel().setProperty("/table", oTable.getBindingInfo("rows").model);
                oDialog.getModel().setProperty("/items", aSortableColumns);
                oDialog.getModel().setProperty("/rowCount", aSortableColumns.length);
                oDialog.open();
            },
            
            beforeOpenColSort: function(oEvent) {
                oEvent.getSource().getContent()[0].removeSelectionInterval(0, oEvent.getSource().getModel().getData().items.length - 1);
                oEvent.getSource().getModel().getData().items.forEach(item => {
                    if (item.sorted) {                       
                        oEvent.getSource().getContent()[0].addSelectionInterval(item.position, item.position);
                    }
                })
            },

            onColSortConfirm: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.SortDialog"];
                oDialog.close();

                var sTable = oDialog.getModel().getData().table;
                var oTable = this.byId(sTable + "Tab");
                var oDialogData = oDialog.getModel().getData().items;
                var oDialogTable = oDialog.getContent()[0];
                var aSortSelRows = oDialogTable.getSelectedIndices();

                oDialogData.forEach(item => item.sorted = false);

                if (aSortSelRows.length > 0) {
                    oDialogData.forEach((item, idx) => {
                        if (aSortSelRows.filter(si => si === idx).length > 0) {
                            var oColumn = oTable.getColumns().filter(col => col.getProperty("sortProperty") === item.name)[0];
                            oTable.sort(oColumn, item.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                            item.sorted = true;
                        }
                    })
                }

                this._aSortableColumns[sTable] = oDialogData;
            },

            onColSortCancel: function(oEvent) {
                this._oViewSettingsDialog["zuigmc2.view.SortDialog"].close();
            },

            onColFilter: function(oEvent) {
                var oTable = oEvent.getSource().oParent.oParent               
                var aFilterableColumns = this._aFilterableColumns[oTable.getBindingInfo("rows").model];

                var oDialog = this._oViewSettingsDialog["zuigmc2.view.FilterDialog"];
                oDialog.getModel().setProperty("/table", oTable.getBindingInfo("rows").model);
                oDialog.getModel().setProperty("/items", aFilterableColumns);
                oDialog.getModel().setProperty("/rowCount", aFilterableColumns.length);
                oDialog.open();
            },

            onColFilterConfirm: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.FilterDialog"];
                oDialog.close();

                var bFilter = false;
                var aFilter = [];
                var oFilter = null;
                var sTable = oDialog.getModel().getData().table;
                var oDialogData = oDialog.getModel().getData().items;

                oDialogData.forEach(item => {
                    if (item.value !== "") {
                        bFilter = true;
                        aFilter.push(new Filter(item.name, this.getConnector(item.connector), item.value))
                    }
                })
                
                if (bFilter) {
                    oFilter = new Filter(aFilter, true);
                    this.getView().byId("btnFilterGMC").addStyleClass("activeFiltering");
                }
                else {
                    oFilter = "";
                    this.getView().byId("btnFilterGMC").removeStyleClass("activeFiltering");
                }

                this.byId(sTable + "Tab").getBinding("rows").filter(oFilter, "Application");
                this._aFilterableColumns[sTable] = oDialogData;
            },

            onColFilterCancel: function(oEvent) {
                this._oViewSettingsDialog["zuigmc2.view.FilterDialog"].close();
            },

            onCellClickGMC: function(oEvent) {
                var vGmc = oEvent.getParameters().rowBindingContext.getObject().Gmc;
                this.getView().getModel("ui").setProperty("/activeGmc", vGmc);

                this.getMaterials();
                this.getAttributes();
            },

            filterGlobally: function(oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTable = oTable.getBindingInfo("rows").model;
                var sQuery = oEvent.getParameter("query");
                var oFilter = null;
                var aFilter = [];

                if (sQuery) {
                    this._aFilterableColumns[sTable].forEach(item => {
                        var sDataType = this._aColumns[sTable].filter(col => col.name === item.name)[0].type;

                        if (sDataType === "Edm.Boolean") aFilter.push(new Filter(item.name, FilterOperator.EQ, sQuery));
                        else aFilter.push(new Filter(item.name, FilterOperator.Contains, sQuery));
                    })

                    oFilter = new Filter(aFilter, false);

                    // oFilter = new Filter([
                    //     new Filter("Gmc", FilterOperator.Contains, sQuery),
                    //     new Filter("Mattyp", FilterOperator.Contains, sQuery)
                    // ], false);
                }
    
                this.byId(sTable + "Tab").getBinding("rows").filter(oFilter, "Application");
            },

            createViewSettingsDialog: function (arg1, arg2) {
                var sDialogFragmentName = null;

                if (arg1 === "sort") sDialogFragmentName = "zuigmc2.view.SortDialog";
                else if (arg1 === "filter") sDialogFragmentName = "zuigmc2.view.FilterDialog";
                else if (arg1 === "column") sDialogFragmentName = "zuigmc2.view.ColumnDialog";
                else if (arg1 === "create_gmc") sDialogFragmentName = "zuigmc2.view.CreateGMCDialog";

                var oViewSettingsDialog = this._oViewSettingsDialog[sDialogFragmentName];

                if (!oViewSettingsDialog) {
                    oViewSettingsDialog = sap.ui.xmlfragment(sDialogFragmentName, this);
                    
                    if (Device.system.desktop) {
                        oViewSettingsDialog.addStyleClass("sapUiSizeCompact");
                    }

                    oViewSettingsDialog.setModel(arg2);

                    this._oViewSettingsDialog[sDialogFragmentName] = oViewSettingsDialog;
                    this.getView().addDependent(oViewSettingsDialog);
                }
                else{
                    oViewSettingsDialog.setModel(arg2);
                }
            },
            
            getConnector(args) {
                var oConnector;

                switch (args) {
                    case "EQ":
                        oConnector = sap.ui.model.FilterOperator.EQ
                        break;
                      case "Contains":
                        oConnector = sap.ui.model.FilterOperator.Contains
                        break;
                      default:
                        // code block
                        break;
                }

                return oConnector;
            },

            handleValueHelp: function(oEvent) {
                var oModel = this.getOwnerComponent().getModel();
                var oSource = oEvent.getSource();
                // var sEntity = oSource.getBindingInfo("suggestionItems").path;
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                var _this = this;

                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputSource = oSource;
                this._inputField = oSource.getBindingInfo("value").parts[0].path;
                // console.log(this._inputId, this._inputValue, this._inputSource, this._inputField)
                // this.getView().setModel(oJSONModel, "materials");

                if (sModel === 'class') {
                    this._inputSourceCtx = oEvent.getSource().getBindingContext("class");
                    var _mattypcls = this._inputSourceCtx.getModel().getProperty(this._inputSourceCtx.getPath() + '/Mattypcls');

                    oModel.read('/MatTypeAttribSet', {
                        urlParameters: {
                            "$filter": "Mattyp eq '" + this.newMattyp + "' and Mattypcls eq '" + _mattypcls + "'"
                        },
                        success: function (data, response) {
                            data.results.forEach(item => {
                                item.VHTitle = item.Attribcd;
                                item.VHDesc = item.Shorttext;
                                item.VHDesc2 = item.Shorttext2;
                                item.VHSelected = (item.Attribcd === _this._inputValue);
                            });

                            data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                            // create value help dialog
                            if (!_this._valueHelpDialog) {
                                _this._valueHelpDialog = sap.ui.xmlfragment(
                                    "zuigmc2.view.ValueHelpDialog",
                                    _this
                                ).setProperty("title", "Select Attribute");
                            
                                _this._valueHelpDialog.setModel(
                                    new JSONModel({
                                        items: data.results,
                                        title: "Attribute"
                                    })
                                )
                                _this.getView().addDependent(_this._valueHelpDialog);
                            }
                            else {
                                _this._valueHelpDialog.setModel(
                                    new JSONModel({
                                        items: data.results,
                                        title: "Attribute"
                                    })
                                )
                            }

                            _this._valueHelpDialog.open();                        
                        },
                        error: function (err) { }
                    })
                }
                else {
                    var vCellPath = this._inputField;
                    var vColProp = this._aColumns[sModel].filter(item => item.name === vCellPath);
                    var vItemValue = vColProp[0].valueHelp.items.value;
                    var vItemDesc = vColProp[0].valueHelp.items.text;
                    var sEntity = vColProp[0].valueHelp.items.path;

                    oModel.read(sEntity, {
                        success: function (data, response) {
                            data.results.forEach(item => {
                                item.VHTitle = item[vItemValue];
                                item.VHDesc = item[vItemDesc];
                                item.VHSelected = (item[vItemValue] === _this._inputValue);
                            });
                            
                            var oVHModel = new JSONModel({
                                items: data.results,
                                title: vColProp[0].label,
                                table: sModel
                            });                            

                            // create value help dialog
                            if (!_this._valueHelpDialog) {
                                _this._valueHelpDialog = sap.ui.xmlfragment(
                                    "zuigmc2.view.ValueHelpDialog",
                                    _this
                                );
                                
                                // _this._valueHelpDialog.setModel(
                                //     new JSONModel({
                                //         items: data.results,
                                //         title: vColProp[0].label,
                                //         table: sModel
                                //     })
                                // )

                                _this._valueHelpDialog.setModel(oVHModel);
                                _this.getView().addDependent(_this._valueHelpDialog);
                            }
                            else {
                                _this._valueHelpDialog.setModel(oVHModel);
                                // _this._valueHelpDialog.setModel(
                                //     new JSONModel({
                                //         items: data.results,
                                //         title: vColProp[0].label,
                                //         table: sModel
                                //     })
                                // )
                            }                            

                            _this._valueHelpDialog.open();
                        },
                        error: function (err) { }
                    })
                }
            },

            handleValueHelpSearch : function (oEvent) {
                var sValue = oEvent.getParameter("value");

                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("VHTitle", sap.ui.model.FilterOperator.Contains, sValue),
                        new sap.ui.model.Filter("VHDesc", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                });

                oEvent.getSource().getBinding("items").filter([oFilter]);
            },
    
            handleValueHelpClose : function (oEvent) {
                if (oEvent.sId === "confirm") {
                    var oSelectedItem = oEvent.getParameter("selectedItem");
                    var sTable = this._valueHelpDialog.getModel().getData().table;

                    if (oSelectedItem) {
                        this._inputSource.setValue(oSelectedItem.getTitle());

                        if (this._inputId.indexOf("iptAttribcd") >= 0) {
                            this._valueHelpDialog.getModel().getData().items.filter(item => item.VHTitle === oSelectedItem.getTitle())
                                .forEach(item => {
                                    var oModel = this._inputSourceCtx.getModel();
                                    oModel.setProperty(this._inputSourceCtx.getPath() + '/Descen', item.VHDesc);
                                    oModel.setProperty(this._inputSourceCtx.getPath() + '/Desczh', item.VHDesc2);
                                })
                        }
                        else {
                            if (this._inputValue !== oSelectedItem.getTitle()) {
                                var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;
                                this.getView().getModel(sTable).setProperty(sRowPath + '/Edited', true);
                            }
                        }
                    }

                    this._inputSource.setValueState("None");
                }
                else if (oEvent.sId === "cancel") {
                    // console.log(oEvent.getSource().getBinding("items"));
                    // var source = oEvent.getSource().getBinding("items").oList;
                    // var data = source.filter(item => item.VHSelected === true);
                    // var value = "";

                    // if (data.length > 0) {
                    //     value = data[0].VHTitle;
                    // }

                    // this._inputSource.setValue(value);

                    // if (this._inputValue !== value) {
                    //     var data = this.byId("headerTable").getBinding("items").oList;                           
                    //     data.filter(item => item[this.inputField] === oSelectedItem.getTitle()).forEach(e => e.Edited = true);
                    // }
                }
            },

            onValueHelpLiveInputChange: function(oEvent) {
                if (this.validationErrors === undefined) this.validationErrors = [];

                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");

                if (!oSource.getSelectedKey()) {
                    oSource.getSuggestionItems().forEach(item => {
                        // console.log(item.getProperty("key"), oSource.getValue().trim())
                        if (item.getProperty("key") === oSource.getValue().trim()) {
                            isInvalid = false;
                            oSource.setValueState(isInvalid ? "Error" : "None");
                        }
                    })
                }

                if (isInvalid) this.validationErrors.push(oEvent.getSource().getId());
                else {
                    this.validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this.validationErrors.splice(index, 1)
                        }
                    })
                }

                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");

                oTable.getColumns().forEach((col, idx) => {                    
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.type === "Edm.String" || ci.type === "Edm.Decimal") {
                                col.setTemplate(new sap.m.Text({text: "{" + arg + ">" + ci.name + "}"}));
                            }
                            else if (ci.type === "Edm.Boolean") {
                                col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: false}));
                            }

                            if (ci.required) {
                                col.getLabel().removeStyleClass("requiredField");
                            }
                        })
                })
            },

            setReqColHdrColor(arg) {
                var oTable = this.byId(arg + "Tab");

                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.required) {
                                col.getLabel().removeStyleClass("requiredField");
                            }
                        })
                })
            },

            resetVisibleCols(arg) {
                var aData = this.getView().getModel(arg).getData().results;

                this._oDataBeforeChange.results.forEach((item, idx) => {
                    if (item.Deleted) {
                        aData.splice(idx, 0, item)
                    }
                })

                this.getView().getModel(arg).setProperty("/results", aData);
            },

            onColSortCellClick: function (oEvent) {
                this._oViewSettingsDialog["zuigmc2.view.SortDialog"].getModel().setProperty("/activeRow", (oEvent.getParameters().rowIndex));
            },

            onColSortSelectAll: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.SortDialog"];               
                oDialog.getContent()[0].addSelectionInterval(0, oDialog.getModel().getData().rowCount - 1);
            },

            onColSortDeSelectAll: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.SortDialog"];               
                oDialog.getContent()[0].removeSelectionInterval(0, oDialog.getModel().getData().rowCount - 1);
            },

            onColSortRowFirst: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.SortDialog"];
                var iActiveRow = oDialog.getModel().getData().activeRow;

                var oDialogData = this._oViewSettingsDialog["zuigmc2.view.SortDialog"].getModel().getData().items;
                oDialogData.filter((item, index) => index === iActiveRow)
                    .forEach(item => item.position = 0);
                oDialogData.filter((item, index) => index !== iActiveRow)
                    .forEach((item, index) => item.position = index + 1);
                oDialogData.sort((a,b) => (a.position > b.position ? 1 : -1));

                oDialog.getModel().setProperty("/items", oDialogData);
                oDialog.getModel().setProperty("/activeRow", iActiveRow - 1);
            },

            onColSortRowUp: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.SortDialog"];
                var iActiveRow = oDialog.getModel().getData().activeRow;

                var oDialogData = oDialog.getModel().getData().items;
                oDialogData.filter((item, index) => index === iActiveRow).forEach(item => item.position = iActiveRow - 1);
                oDialogData.filter((item, index) => index === iActiveRow - 1).forEach(item => item.position = item.position + 1);
                oDialogData.sort((a,b) => (a.position > b.position ? 1 : -1));

                oDialog.getModel().setProperty("/items", oDialogData);
                oDialog.getModel().setProperty("/activeRow", iActiveRow - 1);
            },

            onColSortRowDown: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.SortDialog"];
                var iActiveRow = oDialog.getModel().getData().activeRow;

                var oDialogData = oDialog.getModel().getData().items;
                oDialogData.filter((item, index) => index === iActiveRow).forEach(item => item.position = iActiveRow + 1);
                oDialogData.filter((item, index) => index === iActiveRow + 1).forEach(item => item.position = item.position - 1);
                oDialogData.sort((a,b) => (a.position > b.position ? 1 : -1));

                oDialog.getModel().setProperty("/items", oDialogData);
                oDialog.getModel().setProperty("/activeRow", iActiveRow + 1);
            },

            onColSortRowLast: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.SortDialog"];
                var iActiveRow = oDialog.getModel().getData().activeRow;

                var oDialogData = oDialog.getModel().getData().items;
                oDialogData.filter((item, index) => index === iActiveRow)
                    .forEach(item => item.position = oDialogData.length - 1);
                    oDialogData.filter((item, index) => index !== iActiveRow)
                    .forEach((item, index) => item.position = index);
                    oDialogData.sort((a,b) => (a.position > b.position ? 1 : -1));

                oDialog.getModel().setProperty("/items", oDialogData);
                oDialog.getModel().setProperty("/activeRow", iActiveRow - 1);
            },

            onColPropSelectAll: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.ColumnDialog"];               
                oDialog.getContent()[0].addSelectionInterval(0, oDialog.getModel().getData().rowCount - 1);
            },

            onColPropDeSelectAll: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.ColumnDialog"];               
                oDialog.getContent()[0].removeSelectionInterval(0, oDialog.getModel().getData().rowCount - 1);
            },

            onSelectTab: function(oEvent) {
                var oSource = oEvent.getSource();
                // console.log(oEvent.getSource())
                // console.log(oEvent.getSource().getItems())
                // console.log(oEvent.getSource().getSelectedKey())
            },

            onAfterRendering() {
                this.getView().byId("gmcTab").attachBrowserEvent("keydown", function(oEvent) {
                    // console.log("table is click");
                    // console.log(oEvent);

                    // console.log(oEvent.target.querySelectorAll('.sapUiTableTr'));
                    
                });
            },

            createDialog: null,

            onCreateDialog(args) {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var _this = this;
                this.newMattyp = args.Mattyp;

                oModel.read('/MatTypeClassSet', {
                    urlParameters: {
                        "$filter": "Mattyp eq '" + this.newMattyp + "'"
                    },
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.Attribcd = '';
                            item.Descen = '';
                            item.Desczh = '';
                        })
                        
                        oJSONModel.setData(data);
                        // _this.getView().setModel(oJSONModel, "gmcClass");
                        _this.getView().setModel(oJSONModel, "class");

                        // console.log(data)
                        _this.createViewSettingsDialog("create_gmc", 
                            new JSONModel({
                                items: data.results,
                                rowCount: data.results.length
                            })
                        );

                        var oDialog = _this._oViewSettingsDialog["zuigmc2.view.CreateGMCDialog"];
                        // oDialog.getModel().setProperty("/table", oTable.getBindingInfo("rows").model);
                        oDialog.getModel().setProperty("/items", data.results);
                        oDialog.getModel().setProperty("/rowCount", data.results.length);
                        oDialog.open();
                    },
                    error: function (err) { }
                })
            },

            onCreateGMCCancel: function(oEvent) {
                this._oViewSettingsDialog["zuigmc2.view.CreateGMCDialog"].close();
            },

            onCreateGMCSave: function(oEvent) {
                var _aDescen = [], _aDesczh = [];
                var _this = this;

                this.getView().getModel("class").getData().results.forEach(item => {
                    if (item.Desczh === '') item.Desczh = item.Descen;
                    
                    if (item.Inclindesc === 'X') {
                        if (item.Descen !== '') _aDescen.push(item.Descen);
                        if (item.Desczh !== '') _aDesczh.push(item.Desczh);
                    }
                })

                if (_aDescen.join('') === '') {
                    MessageBox.information("At least one description should be specified.");
                }
                else {
                    var _descen = _aDescen.join(', ');
                    var _desczh = _aDesczh.join(', ');
                    var _param = {};

                    var aNewRows = this.getView().getModel("gmc").getData().results.filter(item => item.New === true);
                    var _paramAttrib = [];

                    this.getView().getModel("class").getData().results.forEach((item, index) => {
                        _paramAttrib.push({
                            "Seq": "1",
                            "Seqno": (index + 1) + "",
                            "Mattypcls": item.Mattypcls,
                            "Attribcd": item.Attribcd,
                            "Descen": item.Descen,
                            "Desczh": item.Desczh
                        })
                    });

                    _param = {  
                        "Seq": "1",
                        "Mattyp": aNewRows[0].Mattyp,
                        "Sbu": "VER",
                        "Descen": _descen,
                        "Desczh": _desczh,
                        "Matgrpcd": aNewRows[0].Matgrpcd,
                        "Baseuom": aNewRows[0].Baseuom,
                        "Orderuom": aNewRows[0].Orderuom,
                        "Issuom": aNewRows[0].Issuom,
                        "Grswt": aNewRows[0].Grswt + '',
                        "Netwt": aNewRows[0].Netwt + '',
                        "Wtuom": aNewRows[0].Wtuom,
                        "Volume": aNewRows[0].Volume + '',
                        "Voluom": aNewRows[0].Voluom,
                        "Cusmatcd": aNewRows[0].Cusmatcd,
                        "Processcd": aNewRows[0].Processcd,
                        "GMCAttribParamSet": _paramAttrib,
                        "RetMsgSet": [{ "Seq": "1" }]
                    }

                    // console.log(_param)

                    var oModel = this.getOwnerComponent().getModel();

                    oModel.create("/GMCParamSet", _param, {
                        method: "POST",
                        success: function(res, oResponse) {
                            console.log(res)

                            if (res.RetMsgSet.results[0].Type === "S") {
                                _this._oViewSettingsDialog["zuigmc2.view.CreateGMCDialog"].close();
                                _this.setButton("gmc", "save");
                                _this.onRefreshGMC();
                                _this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                            }

                            MessageBox.information(res.RetMsgSet.results[0].Message);
                        },
                        error: function() {
                            // alert("Error");
                        }
                    });
                }
            },

            afterOpenCreateGMC: function(oEvent) {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var _this = this;
                var _data = {};
                var oSource = oEvent.getSource();

                oSource.getModel().getData().items.forEach((item, index) => {
                    if (item.Attrib === 'X') {
                        oSource.getContent()[0].getRows()[index].getCells()[2].setProperty("enabled", false);
                        oSource.getContent()[0].getRows()[index].getCells()[3].setProperty("enabled", false);
                    }
                    else {
                        oSource.getContent()[0].getRows()[index].getCells()[1].setProperty("enabled", false);
                    }
                    
                    var _mattypcls = oSource.getContent()[0].getRows()[index].getCells()[0].getText();

                    oModel.read('/MatTypeAttribSet', {
                        urlParameters: {
                            "$filter": "Mattyp eq '" + this.newMattyp + "' and Mattypcls eq '" + _mattypcls + "'"
                        },
                        success: function (data, response) {
                            data.results.sort((a,b) => (a.Attribcd > b.Attribcd ? 1 : -1));
                            _data[_mattypcls] = data.results;                            
                            
                            // oSource.getContent()[0].getRows()[index].getCells()[1].getBindingInfo("suggestionItems").path = "attribute>/" + _mattypcls;
                            // console.log(oSource.getContent()[0].getRows()[index].getCells()[1])

                            oSource.getContent()[0].getRows()[index].getCells()[1].bindAggregation("suggestionItems", {
                                path: "attribute>/" + _mattypcls,
                                length: 1000,
                                template: new sap.ui.core.Item({
                                    text: "{attribute>Attribcd}",
                                    key: "{attribute>Attribcd}"
                                })
                            });
                            // console.log(oSource.getContent()[0].getRows()[index].getCells()[1].getBindingInfo("suggestionItems"))

                            if (oSource.getModel().getData().items.length === (index + 1)) {
                                oJSONModel.setData(_data);
                                _this.getView().setModel(oJSONModel, "attribute");
                                // console.log(_this.getView().getModel("attribute"))
                            }
        
                        },
                        error: function (err) { }
                    })

                })                
            },

            onAtrribcdChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var oModel = this._inputSourceCtx.getModel();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");

                if (!oSource.getSelectedKey()) {
                    oSource.getSuggestionItems().forEach(item => {
                        if (item.getProperty("key") === oSource.getValue().trim()) {
                            isInvalid = false;
                            oSource.setValueState(isInvalid ? "Error" : "None");

                            oSource.getBindingInfo("suggestionItems").binding.oList.forEach(atrb => {
                                if (atrb.Attribcd === oSource.getValue().trim()) {
                                    oModel.setProperty(this._inputSourceCtx.getPath() + '/Descen', atrb.Shorttext);
                                    oModel.setProperty(this._inputSourceCtx.getPath() + '/Desczh', atrb.Shorttext2);
                                }
                            })
                        }
                    })
                }

                if (isInvalid) {
                    oModel.setProperty(this._inputSourceCtx.getPath() + '/Descen', "");
                    oModel.setProperty(this._inputSourceCtx.getPath() + '/Desczh', "");
                }
            },

            onKeyUp(oEvent) {
                var _dataMode = this.getView().getModel("ui").getData().dataMode;
                _dataMode = _dataMode === undefined ? "READ": _dataMode;

                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows" && _dataMode === "READ") {
                    var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["gmc"].sPath;
                    var oRow = this.getView().getModel("gmc").getProperty(sRowPath);
                    this.getView().getModel("ui").setProperty("/activeGmc", oRow.Gmc);

                    this.getMaterials();
                    this.getAttributes();
                }
            },
        });
    });
