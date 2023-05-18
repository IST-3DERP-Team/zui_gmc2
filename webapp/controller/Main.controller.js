sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    'sap/ui/model/Sorter',
    "sap/ui/Device",
    "sap/ui/table/library",
    'sap/ui/core/Fragment',
    "sap/ui/core/routing/HashChanger",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, Fragment, HashChanger) {
        "use strict";

        // shortcut for sap.ui.table.SortOrder
        var SortOrder = library.SortOrder;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

        return Controller.extend("zuigmc2.controller.Main", {

            onInit: function () {
                this.getAppAction();

                var oModel = this.getOwnerComponent().getModel();               
                var _this = this; 
                this.validationErrors = [];
                this.showLoadingDialog('Loading...');
                this._sActiveTable = "gmcTab";

                this.getView().setModel(new JSONModel({
                    activeGmc: '',
                    activeMattyp: '',
                    sbu: '',
                    dataMode: 'INIT',
                    updTable: ''
                }), "ui");

                oModel.read('/SBURscSet', { 
                    success: function (data, response) {
                        if (data.results.length === 1) {
                            _this.getView().getModel("ui").setProperty("/sbu", data.results[0].SBU);
                            // _this.getColumns();
                            _this.getGMC();
                        }
                        else {
                            _this.closeLoadingDialog();

                            var oCBoxSBU = _this.byId('cboxSBU');
                            if (!_this._oPopover) {
                                Fragment.load({
                                    name: "zuigmc2.view.Popover",
                                    controller: this
                                }).then(function(oPopover){
                                    _this._oPopover = oPopover;
                                    _this.getView().addDependent(_this._oPopover);                                    
                                    _this._oPopover.openBy(oCBoxSBU);
                                    _this._oPopover.setTitle("Select SBU");
                                }.bind(_this));
                            } else {
                                this._oPopover.openBy(oCBoxSBU);
                            }

                            _this.byId("btnColPropAttr").setEnabled(false); 
                            _this.byId("btnAddGMC").setEnabled(false);
                            _this.byId("btnEditGMC").setEnabled(false);
                            _this.byId("btnDeleteGMC").setEnabled(false);
                            _this.byId("btnRefreshGMC").setEnabled(false);
                            _this.byId("btnSortGMC").setEnabled(false);
                            _this.byId("btnFilterGMC").setEnabled(false);
                            _this.byId("btnFullScreenHdr").setEnabled(false);
                            _this.byId("btnColPropGMC").setEnabled(false);
                            _this.byId("searchFieldGMC").setEnabled(false);
                            _this.byId("btnTabLayoutGMC").setEnabled(false);
                            _this.byId("btnEditAttr").setEnabled(false);
                            _this.byId("btnRefreshAttr").setEnabled(false);
                            _this.byId("btnSortAttr").setEnabled(false);
                            _this.byId("btnFilterAttr").setEnabled(false);
                            _this.byId("btnFullScreenAttr").setEnabled(false);
                            _this.byId("btnColPropAttr").setEnabled(false);
                            _this.byId("searchFieldAttr").setEnabled(false);
                            _this.byId("btnTabLayoutAttr").setEnabled(false);   
                            _this.byId("refreshMaterialsButton").setEnabled(false);
                            _this.byId("sortMaterialsButton").setEnabled(false);
                            _this.byId("filterMaterialsButton").setEnabled(false);
                            _this.byId("btnFullScreenMatl").setEnabled(false);
                            _this.byId("btnColPropMatl").setEnabled(false);
                            _this.byId("searchFieldMatl").setEnabled(false);
                            _this.byId("btnTabLayoutMatl").setEnabled(false);
                        }
                    },
                    error: function (err) { }
                })
                
                oModel.read('/MatTypeSHSet', { 
                    success: function (data, response) {
                        // console.log(data)
                    },
                    error: function (err) { }
                })

                this._oGlobalGMCFilter = null;
                this._oSortDialog = null;
                this._oFilterDialog = null;
                this._oViewSettingsDialog = {};
                this._DiscardChangesDialog = null;

                this._aEntitySet = {
                    gmc: "GMCSet", attributes: "GMCAttribSet", materials: "GMCMaterialSet"
                };

                this._aColumns = {};
                this._aSortableColumns = {};
                this._aFilterableColumns = {};
                this.getColumns();
                // this._aGMCColumns = [];
                // this._aAttributesColumns = [];
                // this._aMaterialsColumns = [];
                
                this._oDataBeforeChange = {};

                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    },

                    onclick: function(oEvent) {
                        _this.onTableClick(oEvent);
                    }
                };

                this.byId("gmcTab").addEventDelegate(oTableEventDelegate);
                this.byId("attributesTab").addEventDelegate(oTableEventDelegate);
                this.byId("materialsTab").addEventDelegate(oTableEventDelegate);

                this._isGMCEdited = false;
                this._isAttrEdited = false;

                this._cancelGMCCreate = false;
                this._cancelGMC = false;
                this._cancelAttr = false;
                this._tableRendered = "";
                this._goHome = false;

                this._aFiltersBeforeChange = [];
                this._aMultiFiltersBeforeChange = [];

                this._counts = {
                    gmc: 0,
                    attributes: 0,
                    materials: 0
                }

                this.getView().setModel(new JSONModel(this._counts), "counts");

                // this.setKeyboardShortcuts();

                // this.byId("gmcTab").attachBrowserEvent('click', function (e) {
                //     e.preventDefault();
                //     console.log("table click");
                // });
                var oDDTextParam = [];
                var oDDTextResult = {};
                var oModelCaps = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                oDDTextParam.push({CODE: "ADD"});
                oDDTextParam.push({CODE: "EDIT"});  
                oDDTextParam.push({CODE: "SAVE"});
                oDDTextParam.push({CODE: "CANCEL"});
                oDDTextParam.push({CODE: "DELETE"});
                oDDTextParam.push({CODE: "REFRESH"});
                oDDTextParam.push({CODE: "SORT"});
                oDDTextParam.push({CODE: "FILTER"});
                oDDTextParam.push({CODE: "FULLSCREEN"});
                oDDTextParam.push({CODE: "EXITFULLSCREEN"});
                oDDTextParam.push({CODE: "COLUMNS"});
                oDDTextParam.push({CODE: "SAVELAYOUT"});
                oDDTextParam.push({CODE: "INFO_GMC_NO_EDIT"});
                oDDTextParam.push({CODE: "INFO_GMC_WITH_MATL"});
                oDDTextParam.push({CODE: "INFO_SEL_RECORD_DELETED"});
                oDDTextParam.push({CODE: "INFO_SEL_RECORD_ALREADY_DELETED"});
                oDDTextParam.push({CODE: "INFO_GMC_DESC_REQD"}); 
                oDDTextParam.push({CODE: "INFO_NO_SEL_RECORD_TO_PROC"}); 
                oDDTextParam.push({CODE: "INFO_INPUT_REQD_FIELDS"}); 
                oDDTextParam.push({CODE: "INFO_NO_DATA_MODIFIED"}); 
                oDDTextParam.push({CODE: "INFO_CHECK_INVALID_ENTRIES"}); 
                oDDTextParam.push({CODE: "INFO_SEL_ONE_COL"}); 
                oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"}); 

                oModelCaps.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {        
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        _this.getView().setModel(new JSONModel(oDDTextResult), "ddtext");
                        // console.log(_this.getView().getModel("ddtext").getData())
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });
            },

            getAppAction: async function() {
                if (sap.ushell.Container !== undefined) {
                    const fullHash = new HashChanger().getHash(); 
                    const urlParsing = await sap.ushell.Container.getServiceAsync("URLParsing");
                    const shellHash = urlParsing.parseShellHash(fullHash); 
                    const sAction = shellHash.action;

                    this._appAction = sAction;

                    if (sAction === "display") {
                        this.byId("btnAddGMC").setVisible(false);
                        this.byId("btnEditGMC").setVisible(false);
                        this.byId("btnDeleteGMC").setVisible(false);
                        this.byId("btnEditAttr").setVisible(false);
                    }
                    else {
                        this.byId("btnAddGMC").setVisible(true);
                        this.byId("btnEditGMC").setVisible(true);
                        this.byId("btnDeleteGMC").setVisible(true);
                        this.byId("btnEditAttr").setVisible(true);
                    }
                }
            },

            // onExit: function() {
            //     console.log('app exit');
            //     console.log(sap.ushell.Container.getDirtyFlag());
            // },

            onSBUChange: function(oEvent) {
                // console.log(this.byId('cboxSBU').getSelectedKey());
                var vSBU = this.byId('cboxSBU').getSelectedKey();
                this.getView().getModel("ui").setProperty("/sbu", vSBU);
                this.showLoadingDialog('Loading...');
                // this.getColumns();
                this.getGMC();

                this.byId("btnColPropAttr").setEnabled(true);
                this.byId("btnAddGMC").setEnabled(true);
                this.byId("btnEditGMC").setEnabled(true);
                this.byId("btnDeleteGMC").setEnabled(true);
                this.byId("btnRefreshGMC").setEnabled(true);
                this.byId("btnSortGMC").setEnabled(true);
                this.byId("btnFilterGMC").setEnabled(true);
                this.byId("btnFullScreenHdr").setEnabled(true);
                this.byId("btnColPropGMC").setEnabled(true);
                this.byId("searchFieldGMC").setEnabled(true);
                this.byId("btnTabLayoutGMC").setEnabled(true);
                this.byId("btnEditAttr").setEnabled(true);
                this.byId("btnRefreshAttr").setEnabled(true);
                this.byId("btnSortAttr").setEnabled(true);
                this.byId("btnFilterAttr").setEnabled(true);
                this.byId("btnFullScreenAttr").setEnabled(true);
                this.byId("btnColPropAttr").setEnabled(true);
                this.byId("searchFieldAttr").setEnabled(true);
                this.byId("btnTabLayoutAttr").setEnabled(true);   
                this.byId("refreshMaterialsButton").setEnabled(true);
                this.byId("sortMaterialsButton").setEnabled(true);
                this.byId("filterMaterialsButton").setEnabled(true);
                this.byId("btnFullScreenMatl").setEnabled(true);
                this.byId("btnColPropMatl").setEnabled(true);
                this.byId("searchFieldMatl").setEnabled(true);
                this.byId("btnTabLayoutMatl").setEnabled(true);
                this.getView().getModel("ui").setProperty("/dataMode", "READ");
            },

            getGMC() {
                var oModel = this.getOwnerComponent().getModel();
                var _this = this;

                var oTable = this.byId('attributesTab');
                var oColumns = oTable.getColumns();

                for (var i = 0, l = oColumns.length; i < l; i++) {
                    if (oColumns[i].getFiltered()) {
                        oColumns[i].filter("");
                    }

                    if (oColumns[i].getSorted()) {
                        oColumns[i].setSorted(false);
                    }
                }

                oTable = this.byId('materialsTab');
                oColumns = oTable.getColumns();

                for (var i = 0, l = oColumns.length; i < l; i++) {
                    if (oColumns[i].getFiltered()) {
                        oColumns[i].filter("");
                    }

                    if (oColumns[i].getSorted()) {
                        oColumns[i].setSorted(false);
                    }
                }

                var vSBU = this.getView().getModel("ui").getData().sbu;

                oModel.read('/GMCSet', { 
                    urlParameters: {
                        "$filter": "SBU eq '" + vSBU + "'"
                    },                    
                    success: function (data, response) {
                        var oJSONModel = new sap.ui.model.json.JSONModel();

                        if (data.results.length > 0) {
                            data.results.sort((a,b) => (a.GMC > b.GMC ? 1 : -1));

                            data.results.forEach((item, index) => {
                                item.DELETED = item.DELETED === "X" ? true : false;
    
                                if (item.CREATEDDT !== null)
                                    item.CREATEDDT = dateFormat.format(item.CREATEDDT);
    
                                if (item.UPDATEDDT !== null)
                                    item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);
    
                                if (index === 0) item.ACTIVE = "X";
                                else item.ACTIVE = "";
                            });
                                
                            
                            oJSONModel.setData(data);
                            _this._tableRendered = "gmcTab";

                            _this.getView().getModel("ui").setProperty("/activeGmc", data.results[0].GMC);
                            _this.getView().getModel("ui").setProperty("/activeMattyp", data.results[0].MATTYP);    
                            _this.getView().getModel("counts").setProperty("/gmc", data.results.length);
                            _this.getMaterials(false);
                            _this.getAttributes(false);
                        }
                        else {
                            oJSONModel.setData(data);
                            _this.getView().getModel("ui").setProperty("/activeGmc", '');
                            _this.getView().getModel("ui").setProperty("/activeMattyp", '');
                            _this.getView().getModel("counts").setProperty("/gmc", 0);
                            _this.getView().getModel("counts").setProperty("/materials", 0);
                            _this.getView().getModel("counts").setProperty("/attributes", 0);

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "materials");

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "attributes");
                        }

                        // _this.getView().setModel(new JSONModel({
                        //     activeGmc: data.results[0].Gmc,
                        //     activeMattyp: data.results[0].Mattyp,
                        //     sbu: ''
                        // }), "ui");

                        _this.getView().setModel(oJSONModel, "gmc");
                        // console.log(_this.byId('gmcTab').getModel())
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { }
                })
            },

            getMaterials(arg) {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oEntitySet = "/GMCMaterialSet";
                var _this = this;
                var sGmc = this.getView().getModel("ui").getData().activeGmc;
                // console.log(sGmc)
                oModel.read(oEntitySet, {
                    urlParameters: {
                        "$filter": "GMC eq '" + sGmc + "'"
                    },
                    success: function (data, response) {
                        data.results.sort((a,b) => (a.MATNO > b.MATNO ? 1 : -1));

                        data.results.forEach((item, index) => {
                            if (item.CREATEDDT !== null)
                                item.CREATEDDT = dateFormat.format(item.CREATEDDT);

                            if (item.UPDATEDDT !== null)
                                item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);

                            if (index === 0) item.ACTIVE = "X";
                            else item.ACTIVE = "";
                        })

                        var aFilters = [];

                        if (arg && _this.getView().byId("materialsTab").getBinding("rows")) {
                            aFilters = _this.getView().byId("materialsTab").getBinding("rows").aFilters;
                        }

                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "materials");
                        _this.getView().getModel("counts").setProperty("/materials", data.results.length);
                        _this._tableRendered = "materialsTab";

                        if (_this.byId("searchFieldMatl").getProperty("value") !== "" ) {
                            _this.exeGlobalSearch(_this.byId("searchFieldMatl").getProperty("value"), "materials")
                        }

                        if (arg && aFilters) {
                            _this.onRefreshFilter("materials", aFilters);
                        }

                        _this.setActiveRowHighlight("materials");
                    },
                    error: function (err) { }
                })
            },

            getAttributes(arg) {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oEntitySet = "/GMCAttribSet";
                var _this = this;
                var sGmc = this.getView().getModel("ui").getData().activeGmc;

                oModel.read(oEntitySet, {
                    urlParameters: {
                        "$filter": "GMC eq '" + sGmc + "'"
                    },
                    success: function (data, response) {
                        data.results.sort((a,b) => (a.SEQ > b.SEQ ? 1 : -1));

                        data.results.forEach((item, index) => {
                            if (item.CREATEDDT !== null)
                                item.CREATEDDT = dateFormat.format(item.CREATEDDT);

                            if (item.UPDATEDDT !== null)
                                item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);

                            if (index === 0) item.ACTIVE = "X";
                            else item.ACTIVE = "";
                        })
                        // console.log(response)
                        var aFilters = [];

                        if (arg && _this.getView().byId("attributesTab").getBinding("rows")) {
                            aFilters = _this.getView().byId("attributesTab").getBinding("rows").aFilters;
                        }

                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "attributes");
                        _this.getView().getModel("counts").setProperty("/attributes", data.results.length);
                        _this._tableRendered = "attributesTab";

                        if (_this.byId("searchFieldAttr").getProperty("value") !== "" ) {
                            _this.exeGlobalSearch(_this.byId("searchFieldAttr").getProperty("value"), "attributes")
                        }

                        if (arg && aFilters) {
                            _this.onRefreshFilter("attributes", aFilters);
                        }

                        _this.setActiveRowHighlight("attributes");
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
                    this.getDynamicColumns(oColumns, "GMCHDR", "ZERP_MATGMC");
                    
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "GMCATTRIB", "ZERP_GMCATTRIB");
                    }, 100);

                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "GMCMAT", "ZERP_MATERIAL");

                    }, 100);

                    // var oService = oModel.getServiceMetadata().dataServices.schema.filter(item => item.namespace === "ZGW_3DERP_GMC_SRV");
                    
                    // var oMetadata = oService[0].entityType.filter(item => item.name === "GMC");
                    // if (oMetadata.length > 0) { 
                    //     var aColumns = this.initColumns(oColumns["gmc"], oMetadata[0]);
                    //     this._aColumns["gmc"] = aColumns["columns"];
                    //     this._aSortableColumns["gmc"] = aColumns["sortableColumns"];
                    //     this._aFilterableColumns["gmc"] = aColumns["filterableColumns"];
                    //     this.onAddColumns(this.byId("gmcTab"), aColumns["columns"], "gmc");
                    //     // console.log(this._aColumns["gmc"])
                    // }

                    // oMetadata = oService[0].entityType.filter(item => item.name === "GMCAttrib");
                    // if (oMetadata.length > 0) { 
                    //     var aColumns = this.initColumns(oColumns["attributes"], oMetadata[0]);
                    //     this._aColumns["attributes"] = aColumns["columns"];
                    //     this._aSortableColumns["attributes"] = aColumns["sortableColumns"];
                    //     this._aFilterableColumns["attributes"] = aColumns["filterableColumns"];
                    //     this.onAddColumns(this.byId("attributesTab"), aColumns["columns"], "attributes");
                    // }

                    // oMetadata = oService[0].entityType.filter(item => item.name === "GMCMaterial");
                    // if (oMetadata.length > 0) { 
                    //     var aColumns = this.initColumns(oColumns["materials"], oMetadata[0]);
                    //     this._aColumns["materials"] = aColumns["columns"];;
                    //     this._aSortableColumns["materials"] = aColumns["sortableColumns"];
                    //     this._aFilterableColumns["materials"] = aColumns["filterableColumns"];
                    //     this.onAddColumns(this.byId("materialsTab"), aColumns["columns"], "materials");
                    // }

                    // this.getValueHelpItems();
                    // console.log(this._aColumns)
                })
            },

            getDynamicColumns(arg1, arg2, arg3) {
                var me = this;               
                var oColumns = arg1;
                var modCode = arg2;
                var tabName = arg3;
                // console.log(arg1, arg2, arg3)
                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new JSONModel();
                // this.oJSONModel = new JSONModel();
                var vSBU = this.getView().getModel("ui").getData().sbu;

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                // console.log(oModel)
                oModel.setHeaders({
                    sbu: vSBU === "" ? "VER" : vSBU,
                    type: modCode,
                    tabname: tabName
                });
                
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        // console.log(oData);
                        oJSONColumnsModel.setData(oData);
                        // me.getView().setModel(oJSONColumnsModel, "columns"); //set the view model

                        if (oData.results.length > 0) {
                            // console.log(modCode)
                            if (modCode === 'GMCHDR') {
                                // console.log(oData.results)
                                var aColumns = me.setTableColumns(oColumns["gmc"], oData.results);                               
                                // console.log(aColumns);
                                me._aColumns["gmc"] = aColumns["columns"];
                                me._aSortableColumns["gmc"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["gmc"] = aColumns["filterableColumns"]; 
                                me.addColumns(me.byId("gmcTab"), aColumns["columns"], "gmc");
                            }
                            else if (modCode === 'GMCATTRIB') {
                                var aColumns = me.setTableColumns(oColumns["attributes"], oData.results);
                                // console.log(aColumns);
                                me._aColumns["attributes"] = aColumns["columns"];
                                me._aSortableColumns["attributes"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["attributes"] = aColumns["filterableColumns"];
                                me.addColumns(me.byId("attributesTab"), aColumns["columns"], "attributes");
                            }
                            else if (modCode === 'GMCMAT') {
                                var aColumns = me.setTableColumns(oColumns["materials"], oData.results);
                                // console.log(aColumns);
                                me._aColumns["materials"] = aColumns["columns"];;
                                me._aSortableColumns["materials"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["materials"] = aColumns["filterableColumns"];
                                me.addColumns(me.byId("materialsTab"), aColumns["columns"], "materials");
                            }
                        }
                    },
                    error: function (err) {
                        me.closeLoadingDialog(me);
                    }
                });
            },

            setTableColumns: function(arg1, arg2) {
                var oColumn = arg1;
                var oMetadata = arg2;
                
                var aSortableColumns = [];
                var aFilterableColumns = [];
                var aColumns = [];
                
                oMetadata.sort((a,b) => (+a.Order > +b.Order ? 1 : -1));
                
                oMetadata.forEach((item, index) => {
                    item.Order = index;
                });
                
                oMetadata.forEach((prop, idx) => {
                    var vCreatable = prop.Editable;
                    var vUpdatable = prop.Editable;
                    var vSortable = true;
                    var vSorted = prop.Sorted;
                    var vSortOrder = prop.SortOrder;
                    var vFilterable = true;
                    var vName = prop.ColumnLabel;
                    var oColumnLocalProp = oColumn.filter(col => col.name.toUpperCase() === prop.ColumnName);
                    var vShowable = true;
                    var vOrder = prop.Order;

                    // console.log(prop)
                    if (vShowable) {
                        //sortable
                        if (vSortable) {
                            aSortableColumns.push({
                                name: prop.ColumnName, 
                                label: vName, 
                                position: +vOrder, 
                                sorted: vSorted,
                                sortOrder: vSortOrder
                            });
                        }

                        //filterable
                        if (vFilterable) {
                            aFilterableColumns.push({
                                name: prop.ColumnName, 
                                label: vName, 
                                position: +vOrder,
                                value: "",
                                connector: "Contains"
                            });
                        }
                    }

                    //columns
                    aColumns.push({
                        name: prop.ColumnName, 
                        label: vName, 
                        position: +vOrder,
                        type: prop.DataType,
                        creatable: vCreatable,
                        updatable: vUpdatable,
                        sortable: vSortable,
                        filterable: vFilterable,
                        visible: prop.Visible,
                        required: prop.Mandatory,
                        width: prop.ColumnWidth + 'rem',
                        sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                        hideOnChange: false,
                        valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                        showable: vShowable,
                        key: prop.Key === '' ? false : true,
                        maxLength: prop.Length,
                        precision: prop.Decimal,
                        scale: prop.Scale !== undefined ? prop.Scale : null
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

            addColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)
                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));

                aColumns.forEach(col => {
                    // console.log(col)
                    if (col.type === "STRING" || col.type === "DATETIME") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            // id: col.name,
                            width: col.width,
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({
                                text: "{" + model + ">" + col.name + "}",
                                wrapping: false, 
                                tooltip: "{" + model + ">" + col.name + "}"
                            }),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "NUMBER") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({
                                text: "{" + model + ">" + col.name + "}",
                                wrapping: false, 
                                tooltip: "{" + model + ">" + col.name + "}"
                            }),
                            visible: col.visible
                            // multiLabels: [
                            //     new sap.m.Text({text: col.label}),
                            //     new sap.m.Text({ 
                            //         text : "1000"
                            //     })
                            // ]
                        }));
                    }
                    else if (col.type === "BOOLEAN" ) {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false}),
                            visible: col.visible
                        }));
                    }
                })

                table.addColumn(new sap.ui.table.Column({
                    id: model + "ColACTIVE",
                    width: "100px",
                    sortProperty: "ACTIVE",
                    filterProperty: "ACTIVE",
                    label: new sap.m.Text({text: "Active"}),
                    template: new sap.m.Text({
                        text: "{" + model + ">ACTIVE}",
                        wrapping: false, 
                        tooltip: "{" + model + ">ACTIVE}"
                    }),
                    visible: false
                }));
            },

            onAddColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)
                // console.log(aColumns)
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
                        // this.byId("fixFlexGMC").setProperty("fixContentSize", "99%");
                        this.byId("itbDetail").setVisible(false);
                        this.byId("btnFullScreenHdr").setVisible(false);
                        this.byId("btnExitFullScreenHdr").setVisible(true);
                    }
                    else {
                        // this.byId("fixFlexGMC").setProperty("fixContentSize", "50%");
                        this.byId("itbDetail").setVisible(true);
                        this.byId("btnFullScreenHdr").setVisible(true);
                        this.byId("btnExitFullScreenHdr").setVisible(false);
                    }

                    this._tableRendered = "gmcTab";
                }
                else {
                    if (arg2 === "Max") {
                        // this.byId("fixFlexGMC").setProperty("fixContentSize", "0%");
                        this.byId("gmcTab").setVisible(false);
                        this.byId("btnFullScreenAttr").setVisible(false);
                        this.byId("btnExitFullScreenAttr").setVisible(true);
                        this.byId("btnFullScreenMatl").setVisible(false);
                        this.byId("btnExitFullScreenMatl").setVisible(true);
                    }
                    else {
                        // this.byId("fixFlexGMC").setProperty("fixContentSize", "50%");
                        this.byId("gmcTab").setVisible(true);
                        this.byId("btnFullScreenAttr").setVisible(true);
                        this.byId("btnExitFullScreenAttr").setVisible(false);
                        this.byId("btnFullScreenMatl").setVisible(true);
                        this.byId("btnExitFullScreenMatl").setVisible(false);
                    }   
                    
                    if (arg1 === "Attr") this._tableRendered = "attributesTab";
                    else if (arg1 === "Matl") this._tableRendered = "materialsTab";
                }
            },

            onNew() {
                if (this.getView().getModel("ui").getData().dataMode === "READ" && this._appAction !== "display") {
                    if (this._sActiveTable === "gmcTab") this.onCreateGMC();
                }
            },

            onEdit() {
                if (this.getView().getModel("ui").getData().dataMode === "READ" && this._appAction !== "display") {
                    if (this._sActiveTable === "gmcTab") this.onEditGMC();
                    else if (this._sActiveTable === "attributesTab") this.onEditAttr();
                }
            },
            
            onDelete() {
                if (this.getView().getModel("ui").getData().dataMode === "READ" && this._appAction !== "display") {
                    if (this._sActiveTable === "gmcTab") this.onDeleteGMC();
                }
            },
            
            onSave() {
                if (this.getView().getModel("ui").getData().dataMode === "NEW" || this.getView().getModel("ui").getData().dataMode === "EDIT") {
                    if (this._sActiveTable === "gmcTab") this.onSaveChanges("gmc");
                    else if (this._sActiveTable === "attributesTab") this.onSaveChanges("attributes");
                }
            },
            
            onCancel() {
                console.log(this.getView().getModel("ui").getData().dataMode, this._sActiveTable)
                if (this.getView().getModel("ui").getData().dataMode === "NEW" || this.getView().getModel("ui").getData().dataMode === "EDIT") {
                    if (this._sActiveTable === "gmcTab") this.onCancelGMC();
                    else if (this._sActiveTable === "attributesTab") this.onCancelAttr();
                }
            },           

            onRefresh() {
                if (this.getView().getModel("ui").getData().dataMode === "READ") {
                    if (this._sActiveTable === "gmcTab") this.onRefreshGMC();
                    else if (this._sActiveTable === "attributesTab") this.onRefreshAttr();
                    else if (this._sActiveTable === "materialsTab") this.onRefreshMatl();
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
                this.byId("btnTabLayoutGMC").setVisible(false);
                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("gmc").getData());
                this.byId("cboxSBU").setEnabled(false);

                var aNewRow = [];
                var oNewRow = {};
                var oTable = this.byId("gmcTab");
                var iCellIndexToFocus = -1;

                if (oTable.getBinding("rows").aApplicationFilters.length > 0) {
                    this._aMultiFiltersBeforeChange = this._aFilterableColumns["gmc"].filter(fItem => fItem.value !== "");                   
                    oTable.getBinding("rows").filter("", "Application");
                }
                
                if (oTable.getBinding().aFilters.length > 0) {
                    this._aFiltersBeforeChange = jQuery.extend(true, [], oTable.getBinding().aFilters);
                    oTable.getBinding().aFilters = [];
                }
                
                var oColumns = oTable.getColumns();

                for (var i = 0, l = oColumns.length; i < l; i++) {
                    var isFiltered = oColumns[i].getFiltered();
                    // console.log(oColumns[i].getFiltered())
                    if (isFiltered) {
                        oColumns[i].filter("");
                    }
                }
                
                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns["gmc"].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            // console.log(ci)
                            if (!ci.hideOnChange && ci.creatable) {
                                if (ci.type === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{gmc>" + ci.name + "}", editable: true}));
                                }
                                else if (ci.valueHelp["show"]) {
                                    var oInput = new sap.m.Input({
                                        // id: "ipt" + ci.name,
                                        type: "Text",
                                        value: "{gmc>" + ci.name + "}",
                                        maxLength: +ci.maxLength,
                                        showValueHelp: true,
                                        valueHelpRequest: this.handleValueHelp.bind(this),
                                        showSuggestion: true,
                                        maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                        suggestionItems: {
                                            path: ci.valueHelp["suggestionItems"].path,
                                            length: 10000,
                                            template: new sap.ui.core.ListItem({
                                                key: ci.valueHelp["suggestionItems"].text,
                                                text: ci.valueHelp["suggestionItems"].text,
                                                additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                            }),
                                            templateShareable: false
                                        },
                                        change: this.onValueHelpLiveInputChange.bind(this)
                                    })

                                    // if (iCellIndexToFocus === -1) {
                                    //     oInput.addEventDelegate({
                                    //         onAfterRendering: function(){
                                    //             // console.log(oInput)
                                    //             // oInput.focus();
                                    //             jQuery.sap.delayedCall(500, this, function () { oInput.focus(); });
                                    //         }
                                    //     });

                                    //     iCellIndexToFocus = idx;
                                    // }

                                    col.setTemplate(oInput);
                                }
                                else if (ci.type === "NUMBER") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        value: "{path:'gmc>" + ci.name + "}', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + ci.scale + ", maxFractionDigits:" + ci.scale + " }, constraints:{ precision:" + ci.precision + ", scale:" + ci.scale + " }}",
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

                            if (ci.type === "STRING") oNewRow[ci.name] = "";
                            else if (ci.type === "NUMBER") oNewRow[ci.name] = 0;
                            else if (ci.type === "BOOLEAN") oNewRow[ci.name] = false;
                        })
                })
                // console.log(oNewRow)
                oNewRow["New"] = true;
                aNewRow.push(oNewRow);
                this.getView().getModel("gmc").setProperty("/results", aNewRow);
                this.getView().getModel("ui").setProperty("/dataMode", "NEW");
                this.getView().getModel("ui").setProperty("/updTable", "gmc");

                oTable.focus();
                sap.ushell.Container.setDirtyFlag(true);
            },

            setInputFocus: function(oEvent) {
                console.log(oEvent)
            },

            onEditGMC() {
                var oModel = this.getOwnerComponent().getModel();
                var oEntitySet = "/GMCMaterialSet";
                var me = this;

                var oTable = this.byId("gmcTab");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = this.getView().getModel("gmc").getData().results;
                var aDataToEdit = [];
                var bDeleted = false, bWithMaterial = false;
                var iCounter = 0;
                // console.log(this.getView().getModel("materials").getData().results.length)
                // console.log(aSelIndices)
                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    aSelIndices = oTmpSelectedIndices;

                    aSelIndices.forEach((item, index) => {
                        if (aData.at(item).DELETED === true) {
                            iCounter++;
                            bDeleted = true;

                            if (aSelIndices.length === iCounter) {
                                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_GMC_NO_EDIT"]);
                            }
                        }
                        else {
                            oModel.read(oEntitySet, {
                                urlParameters: {
                                    "$filter": "GMC eq '" + aData.at(item).GMC + "'"
                                },
                                success: function (data, response) {
                                    iCounter++;
                                    // console.log(data.results)
                                    if (data.results.length > 0) bWithMaterial = true;
                                    else aDataToEdit.push(aData.at(item));

                                    if (aSelIndices.length === iCounter) {
                                        if (aDataToEdit.length === 0) {
                                            MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_GMC_NO_EDIT"]);
                                        }
                                        else {
                                            me.byId("btnAddGMC").setVisible(false);
                                            me.byId("btnEditGMC").setVisible(false);
                                            me.byId("btnSaveGMC").setVisible(true);
                                            me.byId("btnCancelGMC").setVisible(true);
                                            me.byId("btnDeleteGMC").setVisible(false);
                                            me.byId("btnRefreshGMC").setVisible(false);
                                            me.byId("btnSortGMC").setVisible(false);
                                            me.byId("btnFilterGMC").setVisible(false);
                                            me.byId("btnExitFullScreenHdr").setVisible(false);
                                            me.byId("btnColPropGMC").setVisible(false);
                                            me.byId("searchFieldGMC").setVisible(false);
                                            me.onTableResize("Hdr","Max");
                                            me.byId("btnExitFullScreenHdr").setVisible(false);
                                            me.byId("btnTabLayoutGMC").setVisible(false);
                                            me.byId("cboxSBU").setEnabled(false);

                                            me._oDataBeforeChange = jQuery.extend(true, {}, me.getView().getModel("gmc").getData());
                        
                                            me.getView().getModel("gmc").setProperty("/results", aDataToEdit);
                                            me.setRowEditMode("gmc");
                            
                                            me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                            me.getView().getModel("ui").setProperty("/updTable", "gmc");
                                            me._isGMCEdited = false;
                                            sap.ushell.Container.setDirtyFlag(false);
                                        }
                                    }                                    
                                },
                                error: function (err) {
                                    iCounter++;
                                }
                            })
                        }
                    })
                }
                else {
                    // aDataToEdit = aData;
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                }
                // aDataToEdit = aDataToEdit.filter(item => item.Deleted === false);
            },

            onEditAttr: async function(oEvent) {
                var bExist = await this.checkMaterials(this);
                if (bExist) {
                    sap.m.MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_GMC_WITH_MATL"]);    
                    return;
                }
                
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oTable = this.byId("attributesTab")
                var _this = this;
                var _data = {};
                var sGmc = this.getView().getModel("ui").getData().activeGmc;
                var sMattyp = '';
                var iIndex = -1;
                
                this.getView().getModel("gmc").getData().results.filter(fItem => fItem.GMC === sGmc)
                    .forEach(item => sMattyp = item.MATTYP)

                this.getView().getModel("ui").setProperty("/activeMattyp", sMattyp);

                // oTable.getColumns().forEach((item, idx) => {
                //     if (item.getFilterProperty() === 'ATTRIBCD') iIndex = idx;
                // })
                // console.log(oTable.getRows()[0].getCells())
                oTable.getRows()[0].getCells().forEach((item, idx) => {
                    if (item.getBindingInfo("text").parts[0].path === "ATTRIBCD") iIndex = idx;
                })

                this.getView().getModel("attributes").getData().results.forEach((item, index) => {                  
                    oModel.read('/MatTypeAttribSet', {
                        urlParameters: {
                            "$filter": "Mattyp eq '" + sMattyp + "' and Mattypcls eq '" + item.MATTYPCLS + "'"
                        },
                        success: function (data, response) {
                            data.results.sort((a,b) => (a.Attribcd > b.Attribcd ? 1 : -1));
                            _data[item.MATTYPCLS] = data.results;                            
                            // console.log(data)
                            // console.log(iIndex)
                            oTable.getRows()[index].getCells()[iIndex].bindAggregation("suggestionItems", {
                                path: "attribute>/" + item.MATTYPCLS,
                                length: 10000,
                                template: new sap.ui.core.ListItem({
                                    text: "{attribute>Attribcd}",
                                    key: "{attribute>Attribcd}",
                                    additionalText: "{attribute>Shorttext}"
                                })
                            });

                            if (_this.getView().getModel("attributes").getData().results.length === (index + 1)) {
                                oJSONModel.setData(_data);
                                _this.getView().setModel(oJSONModel, "attribute");
                                // console.log(_this.getView().getModel("attribute"))
                            }
                        },
                        error: function (err) { }
                    })
                })

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
                this.byId("btnTabLayoutAttr").setVisible(false);

                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("attributes").getData());
                this.setRowEditMode("attributes");

                var oIconTabBar = this.byId("itbDetail");
                oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                    .forEach(item => item.setProperty("enabled", false));

                this.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                this.getView().getModel("ui").setProperty("/updTable", "attributes");
                this._isAttrEdited = false;
                sap.ushell.Container.setDirtyFlag(false);
            },

            setRowEditMode(arg) {
                this.getView().getModel(arg).getData().results.forEach(item => item.Edited = false);

                var oTable = this.byId(arg + "Tab");
                
                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            // console.log(ci)
                            if (!ci.hideOnChange && ci.updatable) {
                                if (ci.type === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: true}));
                                }
                                else if (ci.valueHelp["show"]) {
                                    // console.log(ci.name)
                                    // console.log(ci.valueHelp["suggestionItems"].text)
                                    col.setTemplate(new sap.m.Input({
                                        // id: "ipt" + ci.name,
                                        type: "Text",
                                        value: "{" + arg + ">" + ci.name + "}",
                                        maxLength: +ci.maxLength,
                                        showValueHelp: true,
                                        valueHelpRequest: this.handleValueHelp.bind(this),
                                        showSuggestion: true,
                                        maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                        suggestionItems: {
                                            path: ci.valueHelp["items"].path, //ci.valueHelp.model + ">/items", //ci.valueHelp["suggestionItems"].path,
                                            length: 10000,
                                            template: new sap.ui.core.ListItem({
                                                key: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}",
                                                text: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}", //ci.valueHelp["suggestionItems"].text
                                                additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                            }),
                                            templateShareable: false
                                        },
                                        change: this.onValueHelpLiveInputChange.bind(this)
                                    }));
                                }
                                else if (ci.type === "NUMBER") {
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
                // this._isGMCEdited = true;
                var oSource = oEvent.getSource();
                // console.log(oSource)
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
                this._isGMCEdited = true;
                sap.ushell.Container.setDirtyFlag(true);
            },

            onInputLiveChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                
                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
                
                if (sModel === 'gmc') this._isGMCEdited = true;
                else this._isAttrEdited = true;

                sap.ushell.Container.setDirtyFlag(true);
            },

            onCancelGMC() {
                if (this.getView().getModel("ui").getData().dataMode === 'NEW' || this._isGMCEdited) {
                    this._cancelGMC = true;

                    if (!this._DiscardChangesDialog) {
                        this._DiscardChangesDialog = sap.ui.xmlfragment("zuigmc2.view.DiscardChangesDialog", this);
                        this.getView().addDependent(this._DiscardChangesDialog);
                    }
                    
                    this._DiscardChangesDialog.open();
                }
                else {
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
                    // this.byId("searchFieldGMC").setVisible(true);
                    this.onTableResize("Hdr","Min");
                    this.setRowReadMode("gmc");
                    this.getView().getModel("gmc").setProperty("/", this._oDataBeforeChange);
                    this.byId("btnTabLayoutGMC").setVisible(true);
                    this.byId("cboxSBU").setEnabled(true);

                    if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    this.setActiveRowHighlight("gmc");                   
                }
            },

            onCancelAttr() {
                if (this._isAttrEdited) {
                    this._cancelAttr = true;

                    if (!this._DiscardChangesDialog) {
                        this._DiscardChangesDialog = sap.ui.xmlfragment("zuigmc2.view.DiscardChangesDialog", this);
                        this.getView().addDependent(this._DiscardChangesDialog);
                    }
                    
                    this._DiscardChangesDialog.open();
                }
                else {
                    this.byId("btnEditAttr").setVisible(true);
                    this.byId("btnSaveAttr").setVisible(false);
                    this.byId("btnCancelAttr").setVisible(false);
                    this.byId("btnRefreshAttr").setVisible(true);
                    this.byId("btnSortAttr").setVisible(true);
                    this.byId("btnFilterAttr").setVisible(true);
                    this.byId("btnFullScreenHdr").setVisible(true);
                    this.byId("btnColPropAttr").setVisible(true);
                    // this.byId("searchFieldAttr").setVisible(true);
                    this.onTableResize("Attr","Min");
                    this.byId("btnTabLayoutAttr").setVisible(true);
    
                    this.setRowReadMode("attributes");
                    this.getView().getModel("attributes").setProperty("/", this._oDataBeforeChange);
    
                    var oIconTabBar = this.byId("itbDetail");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                }
            },

            onSaveChanges(arg) {
                var aNewRows = this.getView().getModel(arg).getData().results.filter(item => item.New === true);
                var aEditedRows = this.getView().getModel(arg).getData().results.filter(item => item.Edited === true);
                
                if (this.validationErrors.length === 0)
                {
                    if (aNewRows.length > 0) {
                        if (aNewRows[0].MATTYP === '' || aNewRows[0].MATGRPCD === '' || aNewRows[0].BASEUOM === '') {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
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
                        this.showLoadingDialog('Processing...');
                        
                        var oModel = this.getOwnerComponent().getModel();
                        var iEdited = 0;
                        var _this = this;
                        // var paramBatch = [];
                        // console.log(oModel);
                        // console.log(this.byId(arg + "Tab").getRows()[0])

                        oModel.setUseBatch(true);
                        oModel.setDeferredGroups(["update"]);
                        var mParameters = {  
                            "groupId": "update"
                            // "changeSetId": "foo"  
                        };
                        oTable.getRows()
                        aEditedRows.forEach(item => {                           
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
                            
                            if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
    
                            entitySet += ")";
                            // console.log(param);
                            // paramBatch.push(oModel.createBatchOperation(entitySet, "PUT", param));
                            // console.log(param);

                            oModel.update(entitySet, param, mParameters);

                            // setTimeout(() => {
                            //     oModel.update(entitySet, param, {
                            //         method: "PUT",
                            //         success: function(data, oResponse) {
                            //             iEdited++;
    
                            //             if (iEdited === aEditedRows.length) {
                            //                 _this.closeLoadingDialog();
                            //                 _this.setButton(arg, "save");
                            //                 sap.ushell.Container.setDirtyFlag(false);
    
                            //                 var oIconTabBar = _this.byId("itbDetail");
                            //                 oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
    
                            //                 _this.getView().getModel(arg).getData().results.forEach((row,index) => {
                            //                     _this.getView().getModel(arg).setProperty('/results/' + index + '/Edited', false);
                            //                 })
                                            
                            //                 _this.getView().getModel("ui").setProperty("/dataMode", 'READ');

                            //                 var oTable = _this.byId(arg + "Tab");

                            //                 setTimeout(() => {
                            //                     var iActiveRowIndex = oTable.getModel(arg).getData().results.findIndex(item => item.ACTIVE === "X");
                            
                            //                     oTable.getRows().forEach(row => {
                            //                         if (row.getBindingContext(arg) && +row.getBindingContext(arg).sPath.replace("/results/", "") === iActiveRowIndex) {
                            //                             row.addStyleClass("activeRow");
                            //                         }
                            //                         else row.removeStyleClass("activeRow");
                            //                     })                    
                            //                 }, 1);                                            
                            //             }
                            //         },
                            //         error: function() {
                            //             iEdited++;
                            //             // alert("Error");
                            //         }
                            //     });
                            // }, 500)
                        });
                        // console.log(paramBatch);
                        // oModel.addBatchChangeOperations(paramBatch);
                        // oModel.submitBatch(
                        //     function(data){
                        //         console.log('success');
                        //         _this.closeLoadingDialog();
                        //         _this.setButton(arg, "save");
                        //         sap.ushell.Container.setDirtyFlag(false);

                        //         var oIconTabBar = _this.byId("itbDetail");
                        //         oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                        //         _this.getView().getModel(arg).getData().results.forEach((row,index) => {
                        //             _this.getView().getModel(arg).setProperty('/results/' + index + '/Edited', false);
                        //         })
                                
                        //         _this.getView().getModel("ui").setProperty("/dataMode", 'READ');

                        //         var oTable = _this.byId(arg + "Tab");

                        //         setTimeout(() => {
                        //             var iActiveRowIndex = oTable.getModel(arg).getData().results.findIndex(item => item.ACTIVE === "X");
                
                        //             oTable.getRows().forEach(row => {
                        //                 if (row.getBindingContext(arg) && +row.getBindingContext(arg).sPath.replace("/results/", "") === iActiveRowIndex) {
                        //                     row.addStyleClass("activeRow");
                        //                 }
                        //                 else row.removeStyleClass("activeRow");
                        //             })                    
                        //         }, 1);                                
                        //     },
                        //     function(err){
                        //         console.log('failed');
                        //     }
                        // );
                        
                        oModel.submitChanges({
                            groupId: "update",
                            success: function(odata, resp){ 
                                // console.log(odata, resp); 
                                _this.closeLoadingDialog();
                                _this.setButton(arg, "save");

                                sap.ushell.Container.setDirtyFlag(false);

                                var oIconTabBar = _this.byId("itbDetail");
                                oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                                _this.getView().getModel(arg).getData().results.forEach((row,index) => {
                                    _this.getView().getModel(arg).setProperty('/results/' + index + '/Edited', false);
                                })
                                
                                _this.getView().getModel("ui").setProperty("/dataMode", 'READ');

                                var oTable = _this.byId(arg + "Tab");

                                setTimeout(() => {
                                    var iActiveRowIndex = oTable.getModel(arg).getData().results.findIndex(item => item.ACTIVE === "X");
                
                                    oTable.getRows().forEach(row => {
                                        if (row.getBindingContext(arg) && +row.getBindingContext(arg).sPath.replace("/results/", "") === iActiveRowIndex) {
                                            row.addStyleClass("activeRow");
                                        }
                                        else row.removeStyleClass("activeRow");
                                    })                    
                                }, 1);                                 
                            },
                            error: function(odata, resp) { console.log(resp); }
                        });
                    }
                    else {
                        var bCompact = true;
    
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"],
                            {
                                styleClass: bCompact ? "sapUiSizeCompact" : ""
                            }
                        );
                    }
                }
                else {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                }
            },

            onSaveGMC(arg) {
                var aNewRows = this.getView().getModel(arg).getData().results.filter(item => item.New === true);
                var aEditedRows = this.getView().getModel(arg).getData().results.filter(item => item.Edited === true);
                
                if (this.validationErrors.length === 0)
                {
                    if (aNewRows.length > 0) {
                        if (aNewRows[0].MATTYP === '' || aNewRows[0].MATGRPCD === '' || aNewRows[0].BASEUOM === '') {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
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
                        this.showLoadingDialog('Processing...');
                        
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
                            // console.log(entitySet)
                            // console.log(param)
                            setTimeout(() => {
                                oModel.update(entitySet, param, {
                                    method: "PUT",
                                    success: function(data, oResponse) {
                                        iEdited++;
    
                                        if (iEdited === aEditedRows.length) {
                                            _this.closeLoadingDialog();
                                            _this.setButton(arg, "save");
    
                                            var oIconTabBar = _this.byId("itbDetail");
                                            oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
    
                                            _this.getView().getModel(arg).getData().results.forEach((row,index) => {
                                                _this.getView().getModel(arg).setProperty('/results/' + index + '/Edited', false);
                                            })
                                            
                                            _this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                                        }
                                    },
                                    error: function() {
                                        iEdited++;
                                        // alert("Error");
                                    }
                                });
                            }, 500)
                        });
                    }
                    else {
                        var bCompact = true;
    
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"],
                            {
                                styleClass: bCompact ? "sapUiSizeCompact" : ""
                            }
                        );
                    }
                }
                else {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
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
                        // this.byId("searchFieldGMC").setVisible(true);
                        this.onTableResize("Hdr","Min");
                        this.byId("btnTabLayoutGMC").setVisible(true);
                        this.byId("cboxSBU").setEnabled(true);
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
                        // this.byId("searchFieldAttr").setVisible(true);
                        this.onTableResize("Attr","Min");
                        this.byId("btnTabLayoutAttr").setVisible(true);
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

            // onSaveGMC() {
            //     var aNewRows = this.getView().getModel("gmc").getData().results.filter(item => item.New === true);
            //     var aEditedRows = this.getView().getModel("gmc").getData().results.filter(item => item.Edited === true);

            //     if (aNewRows.length > 0) {
            //         aNewRows.forEach(item => {
            //             //call insert service
            //             if (aNewRows[0].MATTYP === '' || aNewRows[0].MATGRPCD === '' || aNewRows[0].BASEUOM === '') {
            //                 MessageBox.information("Please input required fields.");
            //             }
            //             else {
            //                 this.onCreateDialog();
            //             }

            //             // this.setRowReadMode("gmc");
            //             // this.onTableResize("Hdr","Min");
            //             // this.setReqColHdrColor("gmc");
    
            //             // //insert new row to last 
            //             // var aData = this._oDataBeforeChange.results;
            //             // aData.push(item);
            //             // this.getView().getModel("gmc").setProperty("/results", aData);
            //         })
            //     }
            //     else if (aEditedRows.length > 0) {
            //         var oModel = this.getOwnerComponent().getModel();
            //         var iEdited = 0;
            //         var _this = this;
                    
            //         aEditedRows.forEach((item,idx) => {
            //             var entitySet = "/GMCSet('" + item.GMC + "')";
            //             // var param = {
            //             //     "Baseuom": item.Baseuom,
            //             //     "Orderuom": item.Orderuom,
            //             //     "Grswt": item.Grswt,
            //             //     "Netwt": item.Netwt,
            //             //     "Wtuom": item.Wtuom,
            //             //     "Volume": item.Volume,
            //             //     "Voluom": item.Voluom,
            //             //     "Cusmatcd": item.Cusmatcd,
            //             //     "Processcd": item.Processcd
            //             // };

            //             var param = {};

            //             _this._aColumns["gmc"].forEach(col => {
            //                 if (col.updatable) param[col.name] = item[col.name]  
            //             })

            //             setTimeout(() => {
            //                 oModel.update(entitySet, param, {
            //                     method: "PUT",
            //                     success: function(data, oResponse) {
            //                         iEdited++;

            //                         if (iEdited === aEditedRows.length) {
            //                             _this.byId("btnAddGMC").setVisible(true);
            //                             _this.byId("btnEditGMC").setVisible(true);
            //                             _this.byId("btnSaveGMC").setVisible(false);
            //                             _this.byId("btnCancelGMC").setVisible(false);
            //                             _this.byId("btnDeleteGMC").setVisible(true);
            //                             _this.byId("btnRefreshGMC").setVisible(true);
            //                             _this.byId("btnSortGMC").setVisible(true);
            //                             _this.byId("btnFilterGMC").setVisible(true);
            //                             _this.byId("btnFullScreenHdr").setVisible(true);
            //                             _this.byId("btnColPropGMC").setVisible(true);
            //                             _this.byId("searchFieldGMC").setVisible(true);
            //                             _this.onTableResize("Hdr","Min");

            //                             _this.setRowReadMode("gmc");
            //                             _this.setReqColHdrColor("gmc");
            //                             _this.resetVisibleCols("gmc");

            //                             // this.getView().byId("headerTable").getColumns()
            //                             //     .forEach(col => {
            //                             //         pColumns.filter(item => item.label === col.getHeader().getText())
            //                             //             .forEach(e => { 
            //                             //                 if (e.visible) {
            //                             //                     col.setProperty("visible", true)
            //                             //                 }
            //                             //                 else {
            //                             //                     col.setProperty("visible", false)
            //                             //                 }
            //                             //             })
            //                             // })
            //                         }
            //                     },
            //                     error: function() {
            //                         // alert("Error");
            //                     }
            //                 });
            //             }, 500)
            //         });
            //     }
            //     else {
            //         var bCompact = true;

            //         MessageBox.information("No data have been modified.",
            //             {
            //                 styleClass: bCompact ? "sapUiSizeCompact" : ""
            //             }
            //         );
            //     }
            // },

            onSaveAttr() {
                var aEditedRows = this.getView().getModel("attributes").getData().results.filter(item => item.Edited === true);
                // console.log(aEditedRows)

                if (aEditedRows.length > 0) {
                    var oModel = this.getOwnerComponent().getModel();
                    var iEdited = 0;
                    var _this = this;
                    
                    aEditedRows.forEach((item,idx) => {
                        var entitySet = "/GMCAttribSet(Gmc='" + item.GMC + "',Mattypcls='" + item.MATTYPCLS + "')";
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
                                        // _this.byId("searchFieldAttr").setVisible(true);
                                        _this.onTableResize("Attr","Min");
                                        _this.byId("btnTabLayoutAttr").setVisible(true);

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

                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"],
                        {
                            styleClass: bCompact ? "sapUiSizeCompact" : ""
                        }
                    );
                }
            },

            onDeleteGMC() {
                var oModel = this.getOwnerComponent().getModel();
                var oTable = this.byId("gmcTab");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = this.getView().getModel("gmc").getData().results;
                var aDataToDelete = [];
                var me = this;
                var iDeleted = 0, iCounter = 0;
                var bDeleted = false, wMaterial = false;

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    aSelIndices = oTmpSelectedIndices;

                    aSelIndices.forEach(async (item, index) => {
                        var bExist = await this.checkMaterials(this, aData.at(item).GMC);
                        iCounter++;

                        if (!bExist) {
                            if (aData.at(item).DELETED === false) {
                                aDataToDelete.push(aData.at(item));
                                aDataToDelete[index].RowIndex = item;
                            }
                            else bDeleted = true;
                        }
                        else {
                            wMaterial = true;

                            if (aData.at(item).DELETED === true) bDeleted = true;
                        }

                        if (iCounter === aSelIndices.length) {
                            if (aDataToDelete.length > 0) {
                                MessageBox.confirm("Proceed to delete " + aDataToDelete.length + " record(s)?", {
                                    actions: ["Yes", "No"],
                                    onClose: function (sAction) {
                                        if (sAction === "Yes") {
                                            me.showLoadingDialog('Processing...');
        
                                            aDataToDelete.forEach(rec => {
                                                // var oContext = oTable.getContextByIndex(rec.RowIndex);
                                                // var oModelGMC = oContext.getModel();
                                                // var sPath = oContext.getPath();
                                                var vGmc = rec.GMC;
                                                var vMattyp = rec.MATTYP;
                                                var oEntitySet = "/GMCSet(GMC='" + vGmc + "',MATTYP='" + vMattyp + "')";
                                                var oParam = {
                                                    "DELETED": "X"
                                                };
        
                                                setTimeout(() => {
                                                    oModel.update(oEntitySet, oParam, {
                                                        method: "PUT",
                                                        success: function(data, oResponse) {
                                                            oTable.getModel("gmc").setProperty("/results/" + rec.RowIndex + "/DELETED", true);
                                                            iDeleted++;
            
                                                            if (iDeleted === aDataToDelete.length) {
                                                                me.closeLoadingDialog();
                                                                MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_DELETED"]);
                                                            }
                                                        },
                                                        error: function() {
                                                            iDeleted++;
                                                            // alert("Error");
                                                        }
                                                    });
                                                }, 500)
                                            });
                                        }
                                    }
                                });
                            }
                            else {
                                if (bDeleted && wMaterial) MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_GMC_NO_EDIT"]);
                                else if (bDeleted) MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_ALREADY_DELETED"]);
                                else if (wMaterial) MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_GMC_WITH_MATL"]);
                            }
                        }
                    })
                }
                else MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
            },

            onRefreshGMC() {
                this.showLoadingDialog('Loading...');

                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
                var _this = this;
                var vSBU = this.getView().getModel("ui").getData().sbu;

                oModel.read('/GMCSet', {
                    urlParameters: {
                        "$filter": "SBU eq '" + vSBU + "'"
                    },                     
                    success: function (data, response) {
                        data.results.sort((a,b) => (a.GMC > b.GMC ? 1 : -1));

                        data.results.forEach((item, index) => {
                            item.DELETED = item.DELETED === "X" ? true : false;
                            item.CREATEDDT = dateFormat.format(item.CREATEDDT);

                            if (item.UPDATEDDT !== null)
                                item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);
                                
                            if (index === 0) item.ACTIVE = "X";
                            else item.ACTIVE = "";
                        })
                        
                        var aFilters = [];

                        if (_this.getView().byId("gmcTab").getBinding("rows")) {
                            aFilters = _this.getView().byId("gmcTab").getBinding("rows").aFilters;
                        }

                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "gmc"); 
                        _this.getView().getModel("counts").setProperty("/gmc", data.results.length);
                        _this._tableRendered = "gmcTab";

                        _this.getAttributes(true);
                        _this.getMaterials(true);
                        
                        if (_this.byId("searchFieldGMC").getProperty("value") !== "" ) {
                            _this.exeGlobalSearch(_this.byId("searchFieldGMC").getProperty("value"), "gmc")
                        }

                        if (aFilters) {
                            _this.onRefreshFilter("gmc", aFilters);
                        }

                        _this.closeLoadingDialog();
                        _this.setActiveRowHighlight("gmc");
                    },
                    error: function (err) {
                    }
                })
            },

            onRefreshFilter(pModel, pFilters) {
                // if (pFilters.length > 0) {
                //     pFilters.forEach(item => {
                //         var iColIdx = this._aColumns[pModel].findIndex(x => x.name == item.sPath);
                //         this.getView().byId(pModel + "Tab").filter(this.getView().byId(pModel + "Tab").getColumns()[iColIdx], 
                //             item.oValue1);
                //     });
                // }

                var oTable = this.byId(pModel + "Tab");
                var oColumns = oTable.getColumns();

                pFilters.forEach(item => {
                    oColumns.filter(fItem => fItem.getFilterProperty() === item.sPath)
                        .forEach(col => col.filter(item.oValue1))
                }) 
            },

            onRefreshAttr() {
                this.getAttributes(true);
            },

            onRefreshMatl() {
                this.getMaterials(true);
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
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_SEL_ONE_COL"]);
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

                    this.setActiveRowHighlight(sTable)
                }
            },

            onColumnPropCancel: function(oEvent) {
                this._oViewSettingsDialog["zuigmc2.view.ColumnDialog"].close();
            },

            onSort: function(oEvent) {
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

                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("gmcTab") >= 0) {
                    sModel = "gmc";
                }
                else if (oTable.getId().indexOf("attributesTab") >= 0) {
                    sModel = "attributes";
                }
                else if (oTable.getId().indexOf("materialsTab") >= 0) {
                    sModel = "materials";
                }

                this.setActiveRowHighlight(sModel);               
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

            // onColFilterConfirm: function(oEvent) {
            //     var oDialog = this._oViewSettingsDialog["zuigmc2.view.GenericFilterDialog"];
            //     oDialog.close();

            //     var bFilter = false;
            //     var aFilter = [];
            //     var oFilter = null;
            //     var sTable = oDialog.getModel().getData().table;
            //     var oDialogData = oDialog.getModel().getData().items;

            //     oDialogData.forEach(item => {
            //         if (item.value !== "") {
            //             bFilter = true;
            //             aFilter.push(new Filter(item.name, this.getConnector(item.connector), item.value))
            //         }
            //     })
                
            //     if (bFilter) {
            //         oFilter = new Filter(aFilter, true);

            //         if (sTable == "gmc"){
            //             this.getView().byId("btnFilterGMC").addStyleClass("activeFiltering");
            //         }
            //         else if (sTable == "attributes"){
            //             this.getView().byId("btnFilterAttr").addStyleClass("activeFiltering");
            //         }
            //         else if (sTable == "materials"){
            //             this.getView().byId("filterMaterialsButton").addStyleClass("activeFiltering");
            //         }
            //     }
            //     else {
            //         oFilter = "";

            //         if (sTable == "gmc"){
            //             this.getView().byId("btnFilterGMC").removeStyleClass("activeFiltering");
            //         }
            //         else if (sTable == "attributes"){
            //             this.getView().byId("btnFilterAttr").removeStyleClass("activeFiltering");
            //         }
            //         else if (sTable == "materials"){
            //             this.getView().byId("filterMaterialsButton").removeStyleClass("activeFiltering");
            //         }
            //     }

            //     this.byId(sTable + "Tab").getBinding("rows").filter(oFilter, "Application");

            //     this._aFilterableColumns[sTable] = oDialogData;
            //     this.setActiveRowHighlight(sTable);
            // },

            onColFilter: function(oEvent) {
                var sDialogFragmentName = "zuigmc2.view.GenericFilterDialog";
                var oViewSettingsDialog = this._oViewSettingsDialog[sDialogFragmentName];

                if (!oViewSettingsDialog) {
                    oViewSettingsDialog = sap.ui.xmlfragment(sDialogFragmentName, this);
                    
                    if (Device.system.desktop) {
                        oViewSettingsDialog.addStyleClass("sapUiSizeCompact");
                    }

                    oViewSettingsDialog.setModel(new JSONModel());

                    this._oViewSettingsDialog[sDialogFragmentName] = oViewSettingsDialog;
                    this.getView().addDependent(oViewSettingsDialog);
                }

                var oTable = oEvent.getSource().oParent.oParent;
                // var aFilterableColumns = jQuery.extend(true, [], this._aFilterableColumns[oTable.getBindingInfo("rows").model]);
                var aFilterableColumns = jQuery.extend(true, [], this._aColumns[oTable.getBindingInfo("rows").model]);
                console.log(aFilterableColumns)
                var oDialog = this._oViewSettingsDialog[sDialogFragmentName];
                var aColumnItems = oDialog.getModel().getProperty("/items");
                var oFilterValues = oDialog.getModel().getProperty("/values");
                var oFilterCustom = oDialog.getModel().getProperty("/custom");
                var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");
                var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
                var oSearchValues = {}; //oDialog.getModel().getProperty("/search");
                var aData = jQuery.extend(true, [], oTable.getModel("gmc").getData().results);
                var oColumnValues = {};
                var bFiltered = false;
                var vFilterType = "VLF";
                // if (oSearchValues === undefined) { 
                //     oSearchValues = {};
                //     initSearchValues = true;
                // }

                if (oFilterCustom === undefined) { 
                    oFilterCustom = {};
                }        

                if (aColumnItems !== undefined) {
                    if (aColumnItems.filter(fItem => fItem.isFiltered === true).length > 0) { bFiltered = true; }
                }

                aFilterableColumns = aFilterableColumns.filter(col => col.name !== "SBU");
                aFilterableColumns.forEach((col, idx) => {
                    oColumnValues[col.name] = [];

                    aData.forEach(val => {
                        if (val[col.name] === "" || val[col.name] === null) { val[col.name] = "(blank)" }
                        else if (val[col.name] === true) { val[col.name] = "Yes" }
                        else if (val[col.name] === false) { val[col.name] = "No" }

                        if (oColumnValues[col.name].findIndex(item => item.Value === val[col.name]) < 0) {
                            if (bFiltered && oFilterValues && oFilterValues[col.name].findIndex(item => item.Value === val[col.name]) >= 0) {
                                oFilterValues[col.name].forEach(item => {
                                    if (item.Value === val[col.name]) {
                                        oColumnValues[col.name].push({
                                            Value: item.Value,
                                            Selected: item.Selected
                                        })
                                    }
                                })
                            }
                            else {
                                oColumnValues[col.name].push({
                                    Value: val[col.name],
                                    Selected: true
                                })
                            }
                        }
                    }); 

                    oColumnValues[col.name].sort((a,b) => (a.Value > b.Value ? 1 : -1));

                    col.selected = false;                    

                    if (!bFiltered) { 
                        if (idx === 0) {
                            vSelectedColumn = col.name;
                            vSelectedItem = col.label;
                            col.selected = true;
                        }

                        oFilterCustom[col.name] = {
                            Operator: col.type === "STRING" ? "Contains" : "EQ",
                            ValFr: "",
                            ValTo: ""
                        };

                        col.filterType = "VLF";
                        col.isFiltered = false;
                    }
                    else if (bFiltered) {
                        aColumnItems.filter(fItem => fItem.name === col.name).forEach(item => {
                            col.filterType = item.filterType;
                            col.isFiltered = item.isFiltered;
                        })

                        if (vSelectedItem === col.label) { 
                            // vSelectedColumn = col.name; 
                            vFilterType = col.filterType;
                        }
                    }

                    // if (initSearchValues) { 
                        oSearchValues[col.name] = ""
                    // }                  
                })

                oDialog.getModel().setProperty("/sourceTabId", oEvent.getSource().data("TableId"));
                oDialog.getModel().setProperty("/items", aFilterableColumns);
                oDialog.getModel().setProperty("/values", oColumnValues);
                oDialog.getModel().setProperty("/currValues", jQuery.extend(true, [], oColumnValues[vSelectedColumn]));
                oDialog.getModel().setProperty("/rowCount", oColumnValues[vSelectedColumn].length);
                oDialog.getModel().setProperty("/selectedItem", vSelectedItem);
                oDialog.getModel().setProperty("/selectedColumn", vSelectedColumn);
                oDialog.getModel().setProperty("/search", oSearchValues);
                oDialog.getModel().setProperty("/reset", false);
                oDialog.getModel().setProperty("/custom", oFilterCustom);
                oDialog.getModel().setProperty("/customColFilterOperator", oFilterCustom[vSelectedColumn].Operator);
                oDialog.getModel().setProperty("/customColFilterFrVal", oFilterCustom[vSelectedColumn].ValFr);
                oDialog.getModel().setProperty("/customColFilterToVal", oFilterCustom[vSelectedColumn].ValTo);
                oDialog.open();
                oDialog.setInitialFocus(sap.ui.getCore().byId("searchFilterValue"));

                // if (!initSearchValues) {
                    // var vSearchText = oSearchValues[vSelectedColumn];
                    // sap.ui.getCore().byId("searchFilterValue").setValue(vSearchText);
                    // this.onSearchFilterValue(vSearchText);
                // }

                sap.ui.getCore().byId("searchFilterValue").setValue("");
                // this.onSearchFilterValue(""); 

                var bAddSelection = false;
                var iStartSelection = -1, iEndSelection = -1;
                var oTableValues = sap.ui.getCore().byId("filterValuesTab"); // oDialog.getContent()[0].getDetailPage("detail").getContent()[0].getItems()[0].getContent()[0];

                oTableValues.clearSelection();
                oColumnValues[vSelectedColumn].forEach((row, idx) => {
                    if (row.Selected) { 
                        if (iStartSelection === -1) iStartSelection = idx;
                        iEndSelection = idx;
                    }
                    
                    if (!row.Selected || idx === (oColumnValues[vSelectedColumn].length - 1)) {
                        if (iStartSelection !== -1) { 
                            if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                            else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                            
                            bAddSelection = true;
                            oDialog.getModel().setProperty("/reset", false);
                        } 

                        iStartSelection = -1;
                        iEndSelection = -1;
                    }
                })

                oDialog.getModel().setProperty("/reset", true);

                if (bFiltered) { sap.ui.getCore().byId("btnColFilterClear").setEnabled(true); }
                else { 
                    sap.ui.getCore().byId("btnColFilterClear").setEnabled(false); 
                    sap.ui.getCore().byId("colFilterList").getItems().forEach(item => item.setIcon("sap-icon://text-align-justified"));
                }

                // var cIconTabBar = sap.ui.getCore().byId("itbColFilter");
                // cIconTabBar.setSelectedKey("values");

                if (vFilterType === "UDF") {
                    sap.ui.getCore().byId("rbtnUDF").setSelected(true);
                    sap.ui.getCore().byId("panelUDF").setVisible(true);
                    sap.ui.getCore().byId("panelVLF").setVisible(false);
                }
                else {
                    sap.ui.getCore().byId("rbtnVLF").setSelected(true);
                    sap.ui.getCore().byId("panelUDF").setVisible(false);
                    sap.ui.getCore().byId("panelVLF").setVisible(true);
                }

                var vDataType = aFilterableColumns.filter(fItem => fItem.name === vSelectedColumn)[0].type;
                
                if (vDataType === "BOOLEAN") {
                    sap.ui.getCore().byId("rbtnUDF").setVisible(false);
                    sap.ui.getCore().byId("lblUDF").setVisible(false);
                }
                else {
                    sap.ui.getCore().byId("rbtnUDF").setVisible(true);
                    sap.ui.getCore().byId("lblUDF").setVisible(true);
                }

                if (vDataType === "NUMBER") {
                    sap.ui.getCore().byId("customColFilterFrVal").setType("Number");
                    sap.ui.getCore().byId("customColFilterToVal").setType("Number");
                }
                else {
                    sap.ui.getCore().byId("customColFilterFrVal").setType("Text");
                    sap.ui.getCore().byId("customColFilterToVal").setType("Text");
                }

                if (vDataType === "DATETIME") {
                    sap.ui.getCore().byId("customColFilterFrVal").setVisible(false);
                    sap.ui.getCore().byId("customColFilterToVal").setVisible(false);
                    sap.ui.getCore().byId("customColFilterFrDate").setVisible(true);
                    sap.ui.getCore().byId("customColFilterToDate").setVisible(true);
                }
                else{
                    sap.ui.getCore().byId("customColFilterFrVal").setVisible(true);
                    sap.ui.getCore().byId("customColFilterToVal").setVisible(true);
                    sap.ui.getCore().byId("customColFilterFrDate").setVisible(false);
                    sap.ui.getCore().byId("customColFilterToDate").setVisible(false);
                }

                if (vDataType !== "STRING") {
                    if (sap.ui.getCore().byId("customColFilterOperator").getItems().filter(item => item.getKey() === "Contains").length > 0) {
                        sap.ui.getCore().byId("customColFilterOperator").removeItem(3);
                        sap.ui.getCore().byId("customColFilterOperator").removeItem(2);
                    }
                }
                else {
                    if (sap.ui.getCore().byId("customColFilterOperator").getItems().filter(item => item.getKey() === "Contains").length === 0) {
                        sap.ui.getCore().byId("customColFilterOperator").insertItem(
                            new sap.ui.core.Item({
                                key: "Contains", 
                                text: "Contains"
                            }), 2
                        );
    
                        sap.ui.getCore().byId("customColFilterOperator").insertItem(
                            new sap.ui.core.Item({
                                key: "NotContains", 
                                text: "Not Contains"
                            }), 3
                        );
                    }
                }

                var oDelegateClick = {
                    onclick: function (oEvent) {
                        if (oEvent.srcControl.sId === "lblUDF") {
                            sap.ui.getCore().byId("panelUDF").setVisible(true);
                            sap.ui.getCore().byId("panelVLF").setVisible(false);
                        }
                        else {
                            sap.ui.getCore().byId("panelUDF").setVisible(false);
                            sap.ui.getCore().byId("panelVLF").setVisible(true);
                        }
                    }
                };

                sap.ui.getCore().byId("lblVLF").addEventDelegate(oDelegateClick);
                sap.ui.getCore().byId("lblUDF").addEventDelegate(oDelegateClick);
            },

            onColFilterClear: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.GenericFilterDialog"];
                var oColumnItems = oDialog.getModel().getProperty("/items");
                var oColumnValues = oDialog.getModel().getProperty("/values");
                var sSourceTabId = oDialog.getModel().getData().sourceTabId;
                oDialog.close();

                var oFilter = "";

                oColumnItems.forEach(item => {
                    oColumnValues[item.name].forEach(val => val.Selected = true )

                    // oFilterCustom[item.name].forEach(val => {
                    //     val.ValFr = "";
                    //     val.ValTo = "";
                    //     val.Operator = "Contains";
                    // })

                    item.isFiltered = false;
                    // item.filterType = "VLF";
                })

                this.byId(sSourceTabId).getBinding("rows").filter(oFilter, "Application");
                this.setActiveRowHighlight(sSourceTabId.replace("Tab",""));
                
                sap.ui.getCore().byId("colFilterList").getItems().forEach(item => item.setIcon("sap-icon://text-align-justified"));

                var vGmc = this.byId(sSourceTabId).getModel("gmc").getData().results.filter((item,index) => index === 0)[0].GMC;

                if (this.getView().getModel("ui").getProperty("/activeGmc") !== vGmc) {
                    this.byId(sSourceTabId).getModel("gmc").getData().results.forEach(item => {
                        if (item.GMC === vGmc) { item.ACTIVE = "X"; }
                        else { item.ACTIVE = ""; }
                    });

                    this.setActiveRowHighlight(sSourceTabId.replace("Tab",""));
                    this.getView().getModel("ui").setProperty("/activeGmc", vGmc);
                    this.getAttributes(false);
                    this.getMaterials(false);
                }

                this.getView().getModel("counts").setProperty("/gmc", this.byId(sSourceTabId).getModel("gmc").getData().results.length);
                this.byId(sSourceTabId).getColumns().forEach(col => {                   
                    col.setProperty("filtered", false);
                })
            },

            onColFilterCancel: function(oEvent) {
                this._oViewSettingsDialog["zuigmc2.view.GenericFilterDialog"].close();
            },

            onColFilterConfirm: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.GenericFilterDialog"];
                var aColumnItems = oDialog.getModel().getProperty("/items");
                var oColumnValues = oDialog.getModel().getProperty("/values");
                var oFilterCustom = oDialog.getModel().getProperty("/custom");
                var sSourceTabId = oDialog.getModel().getData().sourceTabId;
                oDialog.close();

                var aFilter = [];
                var oFilter = null;
                var oSourceTableColumns = this.byId(sSourceTabId).getColumns();
               
                aColumnItems.forEach(item => {
                    var oColumn = oSourceTableColumns.filter(fItem => fItem.getAggregation("label").getProperty("text") === item.label)[0];
                    var vDataType = item.type;
                    var aColFilter = [];
                    var oColFilter = null;

                    if (item.filterType === "VLF" && oColumnValues[item.name].filter(fItem => fItem.Selected === false).length > 0) {
                        oColumnValues[item.name].forEach(val => {
                            if (val.Selected) {
                                if (val.Value === "(blank)") {
                                    aColFilter.push(new Filter(item.name, this.getConnector("EQ"), ""));
                                    aColFilter.push(new Filter(item.name, this.getConnector("EQ"), null));
                                }
                                else if (item.type === "BOOLEAN") {
                                    if (val.Value === "Yes") {
                                        aColFilter.push(new Filter(item.name, this.getConnector("EQ"), true))
                                    }
                                    else {
                                        aColFilter.push(new Filter(item.name, this.getConnector("EQ"), false))
                                    }
                                }
                                else {
                                    aColFilter.push(new Filter(item.name, this.getConnector("EQ"), val.Value))
                                }
                            }
                        })

                        oColFilter = new Filter(aColFilter, false);
                        aFilter.push(new Filter(oColFilter));

                        oColumn.setProperty("filtered", true);
                        item.isFiltered = true;
                    }
                    else if (item.filterType === "UDF" && oFilterCustom[item.name].ValFr !== "") {
                        if (oFilterCustom[item.name].ValTo !== "") {
                            aFilter.push(new Filter(item.name, this.getConnector("BT"), oFilterCustom[item.name].ValFr, oFilterCustom[item.name].ValTo));
                        }
                        else {
                            aFilter.push(new Filter(item.name, this.getConnector(oFilterCustom[item.name].Operator), oFilterCustom[item.name].ValFr));
                        }

                        oColumn.setProperty("filtered", true);
                        item.isFiltered = true;
                    }
                    else {
                        oColumn.setProperty("filtered", false);
                        item.isFiltered = false;
                    }
                })
                
                if (aFilter.length > 0) {
                    oFilter = new Filter(aFilter, true);
                }
                else {
                    oFilter = "";
                }

                console.log(oFilter)
                this.byId(sSourceTabId).getBinding("rows").filter(oFilter, "Application");
                
                if (oFilter !== "") {
                    if (sSourceTabId === "gmcTab") {
                        if (this.byId(sSourceTabId).getBinding("rows").aIndices.length === 0) {
                            this.getView().getModel("ui").setProperty("/activeGmc", '');
                            this.getView().getModel("ui").setProperty("/activeMattyp", '');
                            this.getView().getModel("counts").setProperty("/gmc", 0);
                            this.getView().getModel("counts").setProperty("/materials", 0);
                            this.getView().getModel("counts").setProperty("/attributes", 0);
    
                            this.getView().setModel(new JSONModel({
                                results: []
                            }), "materials");
    
                            this.getView().setModel(new JSONModel({
                                results: []
                            }), "attributes");
                        }
                        else {
                            var vGmc = this.byId(sSourceTabId).getModel("gmc").getData().results.filter((item,index) => index === this.byId(sSourceTabId).getBinding("rows").aIndices[0])[0].GMC;

                            if (this.getView().getModel("ui").getProperty("/activeGmc") !== vGmc) {
                                this.byId(sSourceTabId).getModel("gmc").getData().results.forEach(item => {
                                    if (item.GMC === vGmc) { item.ACTIVE = "X"; }
                                    else { item.ACTIVE = ""; }
                                });

                                this.setActiveRowHighlight(sSourceTabId.replace("Tab",""));
                                this.getView().getModel("ui").setProperty("/activeGmc", vGmc);
                                this.getAttributes(false);
                                this.getMaterials(false);
                            }

                            this.getView().getModel("counts").setProperty("/gmc", this.byId(sSourceTabId).getBinding("rows").aIndices.length);
                        }
                    }
                }
                else {
                    this.getView().getModel("counts").setProperty("/gmc", this.byId(sSourceTabId).getModel("gmc").getData().results.length);
                }
            },

            onFilterItemPress: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.GenericFilterDialog"];
                var aColumnItems = oDialog.getModel().getProperty("/items");
                var oColumnValues = oDialog.getModel().getProperty("/values");
                var oFilterCustom = oDialog.getModel().getProperty("/custom");
                var oSearchValues = oDialog.getModel().getProperty("/search");
                var vSelectedItem = oEvent.getSource().getSelectedItem().getProperty("title");
                var vSelectedColumn = "";              

                oDialog.getModel().getProperty("/items").forEach(item => {
                    if (item.label === vSelectedItem) { 
                        vSelectedColumn = item.name 
                    }
                })

                oDialog.getModel().setProperty("/currValues", jQuery.extend(true, [], oColumnValues[vSelectedColumn]));
                oDialog.getModel().setProperty("/rowCount", oColumnValues[vSelectedColumn].length);
                oDialog.getModel().setProperty("/selectedItem", vSelectedItem);
                oDialog.getModel().setProperty("/selectedColumn", vSelectedColumn);
                oDialog.getModel().setProperty("/reset", false);
                oDialog.getModel().setProperty("/customColFilterOperator", oFilterCustom[vSelectedColumn].Operator);
                oDialog.getModel().setProperty("/customColFilterFrVal", oFilterCustom[vSelectedColumn].ValFr);
                oDialog.getModel().setProperty("/customColFilterToVal", oFilterCustom[vSelectedColumn].ValTo);

                var vSearchText = oSearchValues[vSelectedColumn];
                // sap.ui.getCore().byId("searchFilterValue").setValue(vSearchText);
                // this.onSearchFilterValue(vSearchText); 
                sap.ui.getCore().byId("searchFilterValue").setValue("");

                var bAddSelection = false;
                var iStartSelection = -1, iEndSelection = -1;
                var oTableValues = sap.ui.getCore().byId("filterValuesTab");
                oTableValues.clearSelection();
                oColumnValues[vSelectedColumn].forEach((row, idx) => {
                    if (row.Selected) { 
                        if (iStartSelection === -1) iStartSelection = idx;
                        iEndSelection = idx;
                    }
                    
                    if (!row.Selected || idx === (oColumnValues[vSelectedColumn].length - 1)) {
                        if (iStartSelection !== -1) { 
                            if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                            else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                            
                            bAddSelection = true;
                            oDialog.getModel().setProperty("/reset", false);
                        } 

                        iStartSelection = -1;
                        iEndSelection = -1;
                    }
                })

                var vFilterType = aColumnItems.filter(fItem => fItem.name === vSelectedColumn)[0].filterType;
                var vDataType = aColumnItems.filter(fItem => fItem.name === vSelectedColumn)[0].type;

                if (vFilterType === "UDF") {
                    sap.ui.getCore().byId("rbtnUDF").setSelected(true);
                    sap.ui.getCore().byId("panelUDF").setVisible(true);
                    sap.ui.getCore().byId("panelVLF").setVisible(false);
                }
                else {
                    sap.ui.getCore().byId("rbtnVLF").setSelected(true);
                    sap.ui.getCore().byId("panelUDF").setVisible(false);
                    sap.ui.getCore().byId("panelVLF").setVisible(true);
                }

                if (sap.ui.getCore().byId("customColFilterOperator").getSelectedKey() === "BT") {
                    sap.ui.getCore().byId("panelUDFTo").setVisible(true);
                }
                else {
                    sap.ui.getCore().byId("panelUDFTo").setVisible(false);
                }

                if (vDataType === "BOOLEAN") {
                    sap.ui.getCore().byId("rbtnUDF").setVisible(false);
                    sap.ui.getCore().byId("lblUDF").setVisible(false);
                }
                else {
                    sap.ui.getCore().byId("rbtnUDF").setVisible(true);
                    sap.ui.getCore().byId("lblUDF").setVisible(true);
                }

                if (vDataType === "NUMBER") {
                    sap.ui.getCore().byId("customColFilterFrVal").setType("Number");
                    sap.ui.getCore().byId("customColFilterToVal").setType("Number");
                }
                else {
                    sap.ui.getCore().byId("customColFilterFrVal").setType("Text");
                    sap.ui.getCore().byId("customColFilterToVal").setType("Text");
                }

                if (vDataType === "DATETIME") {
                    sap.ui.getCore().byId("customColFilterFrVal").setVisible(false);
                    sap.ui.getCore().byId("customColFilterToVal").setVisible(false);
                    sap.ui.getCore().byId("customColFilterFrDate").setVisible(true);
                    sap.ui.getCore().byId("customColFilterToDate").setVisible(true);
                }
                else {
                    sap.ui.getCore().byId("customColFilterFrVal").setVisible(true);
                    sap.ui.getCore().byId("customColFilterToVal").setVisible(true);
                    sap.ui.getCore().byId("customColFilterFrDate").setVisible(false);
                    sap.ui.getCore().byId("customColFilterToDate").setVisible(false);
                }

                if (vDataType !== "STRING") {
                    if (sap.ui.getCore().byId("customColFilterOperator").getItems().filter(item => item.getKey() === "Contains").length > 0) {
                        sap.ui.getCore().byId("customColFilterOperator").removeItem(3);
                        sap.ui.getCore().byId("customColFilterOperator").removeItem(2);
                    }
                }
                else {
                    if (sap.ui.getCore().byId("customColFilterOperator").getItems().filter(item => item.getKey() === "Contains").length === 0) {
                        sap.ui.getCore().byId("customColFilterOperator").insertItem(
                            new sap.ui.core.Item({
                                key: "Contains", 
                                text: "Contains"
                            }), 2
                        );
    
                        sap.ui.getCore().byId("customColFilterOperator").insertItem(
                            new sap.ui.core.Item({
                                key: "NotContains", 
                                text: "Not Contains"
                            }), 3
                        );
                    }
                }

                oDialog.getModel().setProperty("/reset", true);
            },

            onFilterValuesSelectionChange: function(oEvent) { 
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.GenericFilterDialog"];
                
                if (oDialog.getModel().getProperty("/reset")) {
                    var aColumnItems = oDialog.getModel().getProperty("/items");
                    var oColumnValues = oDialog.getModel().getProperty("/values");
                    var oCurrColumnValues = oDialog.getModel().getProperty("/currValues");
                    var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
                    var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");
                    var oTableValues = sap.ui.getCore().byId("filterValuesTab");
                    var bFiltered = false;
                    
                    oCurrColumnValues.forEach((item, idx) => {
                        if (oTableValues.isIndexSelected(idx)) { 
                            item.Selected = true;
                            oColumnValues[vSelectedColumn].filter(fItem => fItem.Value === item.Value).forEach(val => val.Selected = true);
                        }
                        else { 
                            bFiltered = true;
                            item.Selected = false;
                            oColumnValues[vSelectedColumn].filter(fItem => fItem.Value === item.Value).forEach(val => val.Selected = false);
                        }
                    })
                    console.log(oCurrColumnValues)
                    if (bFiltered) { 
                        sap.ui.getCore().byId("rbtnVLF").setSelected(true); 
                        sap.ui.getCore().byId("panelUDF").setVisible(false);
                        sap.ui.getCore().byId("panelVLF").setVisible(true);
                        aColumnItems.forEach(item => {
                            if (item.name === vSelectedColumn) {
                                item.filterType = "VLF";
                            }
                        })
                    }

                    // if (oColumnValues[vSelectedColumn].filter(fItem => fItem.Selected === true).length === 0) {
                    //     MessageBox.information("Please select at least one (1) value.");
                    // }
                    // else {
                        var vFilterType = aColumnItems.filter(fItem => fItem.name === vSelectedColumn)[0].filterType;
                        var oItem = sap.ui.getCore().byId("colFilterList").getItems().filter(fItem => fItem.getTitle() === vSelectedItem)[0];

                        if (vFilterType === "VLF") {
                            if (bFiltered) {
                                oItem.setIcon("sap-icon://filter");
                            }
                            else {
                                oItem.setIcon("sap-icon://text-align-justified");
                            }
                        }
                    // }
                }
            },

            onSearchFilterValue: function(oEvent) {
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.GenericFilterDialog"];   
                var oColumnValues = oDialog.getModel().getProperty("/values");
                var oCurrColumnValues = []; //oDialog.getModel().getProperty("/currValues");
                var oSearchValues = oDialog.getModel().getProperty("/search");
                var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
                var oTableValues = sap.ui.getCore().byId("filterValuesTab");
                var sQuery = "";
                var bAddSelection = false;
                var iStartSelection = -1, iEndSelection = -1;

                if (typeof(oEvent) === "string") {
                    sQuery = oEvent;
                }
                else {
                    sQuery = oEvent.getParameter("query");
                }

                if (sQuery) {
                    oColumnValues[vSelectedColumn].forEach(val => {
                        if (val.Value.toLocaleLowerCase().indexOf(sQuery.toLocaleLowerCase()) >= 0) {
                            oCurrColumnValues.push(val);
                        }
                    })
                }
                else {
                    oCurrColumnValues = oColumnValues[vSelectedColumn];
                }

                oSearchValues[vSelectedColumn] = sQuery;
                oDialog.getModel().setProperty("/search", oSearchValues);
                oDialog.getModel().setProperty("/currValues", oCurrColumnValues);
                oDialog.getModel().setProperty("/rowCount", oCurrColumnValues.length);
                oDialog.getModel().setProperty("/reset", false);

                var oCopyCurrColumnValues = jQuery.extend(true, [], oCurrColumnValues)
                oTableValues.clearSelection();

                oCopyCurrColumnValues.forEach((row, idx) => {
                    if (row.Selected) { 
                        if (iStartSelection === -1) iStartSelection = idx;
                        iEndSelection = idx;
                    }
                    
                    if (!row.Selected || idx === (oCopyCurrColumnValues.length - 1)) {
                        if (iStartSelection !== -1) { 
                            if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                            else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                            
                            bAddSelection = true;
                            oDialog.getModel().setProperty("/reset", false);
                        } 

                        iStartSelection = -1;
                        iEndSelection = -1;
                    }
                })

                oDialog.getModel().setProperty("/reset", true);
            },

            onCustomColFilterChange: function(oEvent) {
                if (oEvent.getSource().getId() === "customColFilterOperator") {
                    if (sap.ui.getCore().byId("customColFilterOperator").getSelectedKey() === "BT") {
                        sap.ui.getCore().byId("panelUDFTo").setVisible(true);
                    }
                    else {
                        sap.ui.getCore().byId("panelUDFTo").setVisible(false);
                    }
                }

                var oDialog = this._oViewSettingsDialog["zuigmc2.view.GenericFilterDialog"];
                var aColumnItems = oDialog.getModel().getProperty("/items");
                var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
                var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");
                var oFilterCustom = oDialog.getModel().getProperty("/custom");
                var sOperator = sap.ui.getCore().byId("customColFilterOperator").getSelectedKey();
                var vDataType = aColumnItems.filter(fItem => fItem.name === vSelectedColumn)[0].type;
                var sValueFr = sap.ui.getCore().byId("customColFilterFrVal").getValue();
                var sValueTo = sap.ui.getCore().byId("customColFilterToVal").getValue();

                if (vDataType === "DATETIME") {
                    sValueFr = sap.ui.getCore().byId("customColFilterFrDate").getValue();
                    sValueTo = sap.ui.getCore().byId("customColFilterToDate").getValue();
                }

                oFilterCustom[vSelectedColumn].Operator = sOperator;
                oFilterCustom[vSelectedColumn].ValFr = sValueFr;
                oFilterCustom[vSelectedColumn].ValTo = sValueTo;
                oDialog.getModel().setProperty("/custom", oFilterCustom);

                if (sValueFr !== "") { 
                    sap.ui.getCore().byId("rbtnUDF").setSelected(true); 
                    sap.ui.getCore().byId("panelUDF").setVisible(true);
                    sap.ui.getCore().byId("panelVLF").setVisible(false);
                    aColumnItems.forEach(item => {
                        if (item.name === vSelectedColumn) {
                            item.filterType = "UDF";
                        }
                    })                    
                }

                var vFilterType = aColumnItems.filter(fItem => fItem.name === vSelectedColumn)[0].filterType;
                var oItem = sap.ui.getCore().byId("colFilterList").getItems().filter(fItem => fItem.getTitle() === vSelectedItem)[0];

                if (vFilterType === "UDF") {
                    if (sValueFr !== "") {
                        oItem.setIcon("sap-icon://filter");
                    }
                    else {
                        oItem.setIcon("sap-icon://text-align-justified");
                    }
                }                
            },

            onSetUseColFilter: function(oEvent) {                
                var oDialog = this._oViewSettingsDialog["zuigmc2.view.GenericFilterDialog"];
                var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
                var aColumnItems = oDialog.getModel().getProperty("/items");

                aColumnItems.forEach(item => {
                    if (item.name === vSelectedColumn && oEvent.getParameter("selected")) {
                        item.filterType = oEvent.getParameter("id").replace("rbtn", "");
                    }
                })

                if (oEvent.getParameter("id") === "rbtnUDF") {
                    sap.ui.getCore().byId("panelUDF").setVisible(true);
                    sap.ui.getCore().byId("panelVLF").setVisible(false);
                }
                else {
                    sap.ui.getCore().byId("panelUDF").setVisible(false);
                    sap.ui.getCore().byId("panelVLF").setVisible(true);
                }
            },

            onCellClickGMC: function(oEvent) {
                var vGmc = oEvent.getParameters().rowBindingContext.getObject().GMC;
                
                this.getView().getModel("ui").setProperty("/activeGmc", vGmc);
                this.getMaterials(false);
                this.getAttributes(false);
                this.byId("searchFieldAttr").setProperty("value", "");
                this.byId("searchFieldMatl").setProperty("value", "");

                var oTable = this.byId('attributesTab');
                var oColumns = oTable.getColumns();

                for (var i = 0, l = oColumns.length; i < l; i++) {
                    if (oColumns[i].getFiltered()) {
                        oColumns[i].filter("");
                    }

                    if (oColumns[i].getSorted()) {
                        oColumns[i].setSorted(false);
                    }
                }

                oTable = this.byId('materialsTab');
                oColumns = oTable.getColumns();

                for (var i = 0, l = oColumns.length; i < l; i++) {
                    if (oColumns[i].getFiltered()) {
                        oColumns[i].filter("");
                    }

                    if (oColumns[i].getSorted()) {
                        oColumns[i].setSorted(false);
                    }
                }

                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;

                    oTable.getModel("gmc").getData().results.forEach(row => row.ACTIVE = "");
                    oTable.getModel("gmc").setProperty(sRowPath + "/ACTIVE", "X"); 
                    
                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext("gmc") && row.getBindingContext("gmc").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow")
                    })
                }
            },

            filterGlobally: function(oEvent) {
                var oTable = oEvent.getSource().oParent.oParent;
                var sTable = oTable.getBindingInfo("rows").model;
                var sQuery = oEvent.getParameter("query");

                if (sTable === "gmc") {
                    this.byId("searchFieldAttr").setProperty("value", "");
                    this.byId("searchFieldMatl").setProperty("value", "");
                }

                this.exeGlobalSearch(sQuery, sTable);
            },

            exeGlobalSearch(arg1, arg2) {
                var oFilter = null;
                var aFilter = [];
                
                if (arg1) {
                    this._aFilterableColumns[arg2].forEach(item => {
                        var sDataType = this._aColumns[arg2].filter(col => col.name === item.name)[0].type;

                        if (sDataType === "BOOLEAN") aFilter.push(new Filter(item.name, FilterOperator.EQ, arg1));
                        else aFilter.push(new Filter(item.name, FilterOperator.Contains, arg1));
                    })

                    oFilter = new Filter(aFilter, false);
                }
    
                this.byId(arg2 + "Tab").getBinding("rows").filter(oFilter, "Application");

                if (arg1 && arg2 === "gmc") {
                    var vGmc = this.getView().getModel(arg2).getData().results.filter((item,index) => index === this.byId(arg2 + "Tab").getBinding("rows").aIndices[0])[0].GMC;
                    this.getView().getModel("ui").setProperty("/activeGmc", vGmc);
                    this.getAttributes(false);
                    this.getMaterials(false);
                }
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
                    case "NE":
                        oConnector = sap.ui.model.FilterOperator.NE
                        break;
                    case "GT":
                        oConnector = sap.ui.model.FilterOperator.GT
                        break;
                    case "GE":
                        oConnector = sap.ui.model.FilterOperator.GE
                        break; 
                    case "LT":
                        oConnector = sap.ui.model.FilterOperator.LT
                        break;
                    case "LE":
                        oConnector = sap.ui.model.FilterOperator.LE
                        break;
                    case "BT":
                        oConnector = sap.ui.model.FilterOperator.BT
                        break;
                    case "Contains":
                        oConnector = sap.ui.model.FilterOperator.Contains
                        break;
                    case "NotContains":
                        oConnector = sap.ui.model.FilterOperator.NotContains
                        break;
                    case "StartsWith":
                        oConnector = sap.ui.model.FilterOperator.StartsWith
                        break;
                    case "NotStartsWith":
                        oConnector = sap.ui.model.FilterOperator.NotStartsWith
                        break;
                    case "EndsWith":
                        oConnector = sap.ui.model.FilterOperator.EndsWith
                        break;
                    case "NotEndsWith":
                        oConnector = sap.ui.model.FilterOperator.NotEndsWith
                        break;
                    default:
                        oConnector = sap.ui.model.FilterOperator.Contains
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
                    var _mattypcls = this._inputSourceCtx.getModel().getProperty(this._inputSourceCtx.getPath() + '/MATTYPCLS');

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
                else if (sModel === 'attributes') {
                    this._inputSourceCtx = oEvent.getSource().getBindingContext("attributes");
                    var sMattyp = this.getView().getModel("ui").getData().activeMattyp;
                    var _mattypcls = this._inputSourceCtx.getModel().getProperty(this._inputSourceCtx.getPath() + '/MATTYPCLS');

                    oModel.read('/MatTypeAttribSet', {
                        urlParameters: {
                            "$filter": "Mattyp eq '" + sMattyp + "' and Mattypcls eq '" + _mattypcls + "'"
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
                                        title: "Attribute",
                                        table: sModel
                                    })
                                )
                                _this.getView().addDependent(_this._valueHelpDialog);
                            }
                            else {
                                _this._valueHelpDialog.setModel(
                                    new JSONModel({
                                        items: data.results,
                                        title: "Attribute",
                                        table: sModel
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
                    // console.log()
                    if (oSelectedItem) {
                        this._inputSource.setValue(oSelectedItem.getTitle());

                        if (this._inputId.indexOf("iptAttribcd") >= 0) {
                            this._valueHelpDialog.getModel().getData().items.filter(item => item.VHTitle === oSelectedItem.getTitle())
                                .forEach(item => {
                                    var oModel = this._inputSourceCtx.getModel();
                                    oModel.setProperty(this._inputSourceCtx.getPath() + '/DESCEN', item.VHDesc);
                                    oModel.setProperty(this._inputSourceCtx.getPath() + '/DESCZH', item.VHDesc2);
                                })
                        }
                        else {
                            var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;

                            if (this._inputValue !== oSelectedItem.getTitle()) {                                
                                this.getView().getModel(sTable).setProperty(sRowPath + '/Edited', true);

                                if (sTable === 'gmc') this._isGMCEdited = true;
                                if (sTable === 'attributes') this._isAttrEdited= true;

                                sap.ushell.Container.setDirtyFlag(true);
                            }

                            if (this._inputSource.getBindingInfo("value").parts[0].path === 'MATTYP') {
                                this._valueHelpDialog.getModel().getData().items.filter(item => item.VHTitle === oSelectedItem.getTitle())
                                    .forEach(item => {
                                        this.getView().getModel(sTable).setProperty(sRowPath + '/PROCESSCD', item.Processcd);
                                    })
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

                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;

                // if (!oSource.getSelectedKey()) {
                    oSource.getSuggestionItems().forEach(item => {
                        // console.log(item.getProperty("key"), oSource.getValue().trim())
                        if (item.getProperty("key") === oSource.getValue().trim()) {
                            isInvalid = false;
                            oSource.setValueState(isInvalid ? "Error" : "None");                            
                            
                            if (oSource.getBindingInfo("value").parts[0].path === 'MATTYP') {
                                var et = item.getBindingContext().sPath;
                                this.getView().getModel(sModel).setProperty(sRowPath + '/PROCESSCD', item.getBindingContext().getModel().oData[et.slice(1, et.length)].Processcd);
                            }
                        }
                    })
                // }

                if (isInvalid) this.validationErrors.push(oEvent.getSource().getId());
                else {
                    this.validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this.validationErrors.splice(index, 1)
                        }
                    })
                }

                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);

                if (sModel === 'gmc') this._isGMCEdited = true;
                else if (sModel === 'attributes') this._isAttrEdited = true;
                
                sap.ushell.Container.setDirtyFlag(true);
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");

                oTable.getColumns().forEach((col, idx) => {                    
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.type === "STRING" || ci.type === "NUMBER") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + arg + ">" + ci.name + "}",
                                    wrapping: false,
                                    tooltip: "{" + arg + ">" + ci.name + "}"
                                }));
                            }
                            else if (ci.type === "BOOLEAN") {
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
                // var oSource = oEvent.getSource();
                // console.log(oSource)
                // console.log(oEvent.getSource().getItems())
                // console.log(oEvent.getSource().getSelectedKey())
                this._tableRendered = oEvent.getSource().getSelectedKey() + "Tab";
                this.setActiveRowHighlight(oEvent.getSource().getSelectedKey());
            },

            onAfterTableRendering: function(oEvent) {
                // console.log(this._tableRendered)
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlight(this._tableRendered.replace("Tab", ""));
                    // this._tableRendered = "";

                    if (this._tableRendered === "gmcTab") {
                        this.setActiveRowHighlight("attributes");
                        this.setActiveRowHighlight("materials");
                    }
                    else if (this._tableRendered === "attributesTab") {
                        this.setActiveRowHighlight("gmc");
                        this.setActiveRowHighlight("materials");
                    }
                    else if (this._tableRendered === "materialsTab") {
                        this.setActiveRowHighlight("gmc");
                        this.setActiveRowHighlight("attributes");
                    }
                }
            },

            createDialog: null,

            onCreateDialog(args) {
                this.showLoadingDialog('Loading...');
                
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var _this = this;
                this.newMattyp = args.MATTYP;
                
                oModel.read('/MatTypeClassSet', {
                    urlParameters: {
                        "$filter": "MATTYP eq '" + this.newMattyp + "'"
                    },
                    success: function (data, response) {
                        _this.closeLoadingDialog();
                        
                        data.results.forEach(item => {
                            item.ATTRIBCD = '';
                            item.DESCEN = '';
                            item.DESCZH = '';
                        })
                        console.log(data)
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
                this._cancelGMCCreate = true;

                if (!this._DiscardChangesDialog) {
                    this._DiscardChangesDialog = sap.ui.xmlfragment("zuigmc2.view.DiscardChangesDialog", this);
                    this.getView().addDependent(this._DiscardChangesDialog);
                }
                
                this._DiscardChangesDialog.open();

                // if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

                // this._oViewSettingsDialog["zuigmc2.view.CreateGMCDialog"].close();
            },

            onCreateGMCSave: function(oEvent) {
                var _aDescen = [], _aDesczh = [];
                var _this = this;

                this.getView().getModel("class").getData().results.forEach(item => {
                    if (item.DESCZH === '') item.DESCZH = item.DESCEN;
                    
                    if (item.INCLINDESC === 'X') {
                        if (item.DESCEN !== '') _aDescen.push(item.DESCEN);
                        if (item.DESCZH !== '') _aDesczh.push(item.DESCZH);
                    }
                })
                
                if (_aDescen.join('') === '') {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_GMC_DESC_REQD"]);
                }
                else {
                    this.showLoadingDialog('Processing...');

                    var _descen = _aDescen.join(', ');
                    var _desczh = _aDesczh.join(', ');
                    var _param = {};
                    var vSBU = this.getView().getModel("ui").getData().sbu;

                    var aNewRows = this.getView().getModel("gmc").getData().results.filter(item => item.New === true);
                    var _paramAttrib = [];

                    this.getView().getModel("class").getData().results.forEach((item, index) => {
                        _paramAttrib.push({
                            "Seq": "1",
                            "Seqno": (index + 1) + "",
                            "Mattypcls": item.MATTYPCLS,
                            "Attribcd": item.ATTRIBCD,
                            "Descen": item.DESCEN,
                            "Desczh": item.DESCZH
                        })
                    });

                    _param = {  
                        "Seq": "1",
                        "Mattyp": aNewRows[0].MATTYP,
                        "Sbu": vSBU,
                        "Descen": _descen,
                        "Desczh": _desczh,
                        "Matgrpcd": aNewRows[0].MATGRPCD,
                        "Baseuom": aNewRows[0].BASEUOM,
                        "Orderuom": aNewRows[0].ORDERUOM,
                        "Issuom": aNewRows[0].ISSUOM,
                        "Grswt": aNewRows[0].GRSWT + '',
                        "Netwt": aNewRows[0].NETWT + '',
                        "Wtuom": aNewRows[0].WTUOM,
                        "Volume": aNewRows[0].VOLUME + '',
                        "Voluom": aNewRows[0].VOLUOM,
                        "Cusmatcd": aNewRows[0].CUSMATCD,
                        "Processcd": aNewRows[0].PROCESSCD,
                        "GMCAttribParamSet": _paramAttrib,
                        "RetMsgSet": [{ "Seq": "1" }]
                    }

                    console.log(_param);
                    // return;

                    var oModel = this.getOwnerComponent().getModel();

                    oModel.create("/GMCParamSet", _param, {
                        method: "POST",
                        success: function(res, oResponse) {
                            _this.closeLoadingDialog();

                            if (res.RetMsgSet.results[0].Type === "S") {
                                _this._oViewSettingsDialog["zuigmc2.view.CreateGMCDialog"].close();
                                _this.setButton("gmc", "save");
                                _this.onRefreshGMC();
                                _this.setFilterAfterCreate();
                                _this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                            }

                            MessageBox.information(res.RetMsgSet.results[0].Message);
                            sap.ushell.Container.setDirtyFlag(false);
                            _this.setActiveRowHighlight("gmc");
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
                    if (item.ATTRIB === 'X') {
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
                            console.log(data)
                            // oSource.getContent()[0].getRows()[index].getCells()[1].getBindingInfo("suggestionItems").path = "attribute>/" + _mattypcls;
                            // console.log(oSource.getContent()[0].getRows()[index].getCells()[1])
                            // console.log(data)
                            oSource.getContent()[0].getRows()[index].getCells()[1].bindAggregation("suggestionItems", {
                                path: "attribute>/" + _mattypcls,
                                length: 10000,
                                template: new sap.ui.core.ListItem({
                                    text: "{attribute>Attribcd}",
                                    key: "{attribute>Attribcd}",
                                    additionalText: "{attribute>Shorttext}"
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

                // if (this._inputSourceCtx === undefined) 
                this._inputSourceCtx = oEvent.getSource().getBindingContext("class");

                var oModel = this._inputSourceCtx.getModel();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");

                if (oSource.getValue().trim() === "") {
                    oModel.setProperty(this._inputSourceCtx.getPath() + '/DESCEN', "");
                    oModel.setProperty(this._inputSourceCtx.getPath() + '/DESCZH', "");
                }
                else {
                // if (!oSource.getSelectedKey()) { 
                    oSource.getSuggestionItems().forEach(item => {
                        // console.log(item.getProperty("key"))
                        if (item.getProperty("key") === oSource.getValue().trim()) {
                            isInvalid = false;
                            oSource.setValueState(isInvalid ? "Error" : "None");

                            oSource.getBindingInfo("suggestionItems").binding.oList.forEach(atrb => {
                                if (atrb.Attribcd === oSource.getValue().trim()) {
                                    oModel.setProperty(this._inputSourceCtx.getPath() + '/DESCEN', atrb.Shorttext);
                                    oModel.setProperty(this._inputSourceCtx.getPath() + '/DESCZH', atrb.Shorttext2);
                                }
                            })
                        }
                    })
                // }
                }

                if (isInvalid) {
                    oModel.setProperty(this._inputSourceCtx.getPath() + '/DESCEN', "");
                    oModel.setProperty(this._inputSourceCtx.getPath() + '/DESCZH', "");
                }

                this._inputSourceCtx = undefined;
            },

            onKeyUp(oEvent) {
                var _dataMode = this.getView().getModel("ui").getData().dataMode;
                _dataMode = _dataMode === undefined ? "READ": _dataMode;

                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    if (oTable.getId().indexOf("gmcTab") >= 0) {
                        if (_dataMode === "READ") {
                            var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["gmc"].sPath;
                            var oRow = this.getView().getModel("gmc").getProperty(sRowPath);

                            this.getView().getModel("ui").setProperty("/activeGmc", oRow.GMC);
                            this.getMaterials(false);
                            this.getAttributes(false);
                        }

                        if (this.byId(oEvent.srcControl.sId).getBindingContext("gmc")) {
                            var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext("gmc").sPath;
                            
                            oTable.getModel("gmc").getData().results.forEach(row => row.ACTIVE = "");
                            oTable.getModel("gmc").setProperty(sRowPath + "/ACTIVE", "X"); 
                            
                            oTable.getRows().forEach(row => {
                                if (row.getBindingContext("gmc") && row.getBindingContext("gmc").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                    row.addStyleClass("activeRow");
                                }
                                else row.removeStyleClass("activeRow")
                            })
                        }                        
                    }
                    else if (oTable.getId().indexOf("attributesTab") >= 0) {
                        if (this.byId(oEvent.srcControl.sId).getBindingContext("attributes")) {
                            var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext("attributes").sPath;

                            oTable.getModel("attributes").getData().results.forEach(row => row.ACTIVE = "");
                            oTable.getModel("attributes").setProperty(sRowPath + "/ACTIVE", "X"); 
                            
                            oTable.getRows().forEach(row => {
                                if (row.getBindingContext("attributes") && row.getBindingContext("attributes").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                    row.addStyleClass("activeRow");
                                }
                                else row.removeStyleClass("activeRow")
                            })
                        }
                    }
                    else if (oTable.getId().indexOf("materialsTab") >= 0) {
                        if (this.byId(oEvent.srcControl.sId).getBindingContext("materials")) {
                            var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext("materials").sPath;

                            oTable.getModel("materials").getData().results.forEach(row => row.ACTIVE = "");
                            oTable.getModel("materials").setProperty(sRowPath + "/ACTIVE", "X"); 
                            
                            oTable.getRows().forEach(row => {
                                if (row.getBindingContext("materials") && row.getBindingContext("materials").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                    row.addStyleClass("activeRow");
                                }
                                else row.removeStyleClass("activeRow")
                            })
                        }
                    }                   
                }
            },

            onTableClick(oEvent) {
                var oControl = oEvent.srcControl;
                var sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];

                while (sTabId.substr(sTabId.length - 3) !== "Tab") {                    
                    oControl = oControl.oParent;
                    sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];
                }
                
                this._sActiveTable = sTabId;
                // console.log(this._sActiveTable);
            },

            showLoadingDialog(arg) {
                if (!this._LoadingDialog) {
                    this._LoadingDialog = sap.ui.xmlfragment("zuigmc2.view.LoadingDialog", this);
                    this.getView().addDependent(this._LoadingDialog);
                } 
                // jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                
                this._LoadingDialog.setTitle(arg);
                this._LoadingDialog.open();
            },

            closeLoadingDialog() {
                this._LoadingDialog.close();
            },

            onCloseDiscardChangesDialog() {
                if (this._goHome) {
                    var oHistory, sPreviousHash;
            
                    if (sap.ui.core.routing.History !== undefined) {
                        oHistory = sap.ui.core.routing.History.getInstance();
                        sPreviousHash = oHistory.getPreviousHash();
                    }
        
                    if (sPreviousHash !== undefined) {
                        window.history.go(-1);
                    }
                }
                else if (this._cancelGMCCreate) {
                    this._cancelGMCCreate = false;
                    this._oViewSettingsDialog["zuigmc2.view.CreateGMCDialog"].close();
                }
                else if (this._cancelGMC) {
                    if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

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
                    // this.byId("searchFieldGMC").setVisible(true);
                    this.byId("btnTabLayoutGMC").setVisible(true);
                    this.byId("cboxSBU").setEnabled(true);
                    this.onTableResize("Hdr","Min");
                    this.setRowReadMode("gmc");
                    this.getView().getModel("gmc").setProperty("/", this._oDataBeforeChange);
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    this._isGMCEdited = false;
                    this.setActiveRowHighlight("gmc");
                    this._cancelGMC = false;
                    sap.ushell.Container.setDirtyFlag(false);
                }
                else if (this._cancelAttr) {
                    this.byId("btnEditAttr").setVisible(true);
                    this.byId("btnSaveAttr").setVisible(false);
                    this.byId("btnCancelAttr").setVisible(false);
                    this.byId("btnRefreshAttr").setVisible(true);
                    this.byId("btnSortAttr").setVisible(true);
                    this.byId("btnFilterAttr").setVisible(true);
                    this.byId("btnFullScreenHdr").setVisible(true);
                    this.byId("btnColPropAttr").setVisible(true);
                    // this.byId("searchFieldAttr").setVisible(true);
                    this.onTableResize("Attr","Min");
                    this.byId("btnTabLayoutAttr").setVisible(true);

                    this.setRowReadMode("attributes");
                    this.getView().getModel("attributes").setProperty("/", this._oDataBeforeChange);
    
                    var oIconTabBar = this.byId("itbDetail");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    this._isAttrEdited = false;
                    this._cancelAttr = false;
                    sap.ushell.Container.setDirtyFlag(false);
                }                

                this._DiscardChangesDialog.close();
            },

            onCancelDiscardChangesDialog() {
                // console.log(this._DiscardChangesgDialog)
                this._DiscardChangesDialog.close();
            },

            setFilterAfterCreate: function(oEvent) {
                var oTable = this.byId("gmcTab");

                if (this._aMultiFiltersBeforeChange.length > 0) {
                    var bFilter = false;
                    var aFilter = [];
                    var oFilter = null;   

                    this._aMultiFiltersBeforeChange.forEach(item => {
                        if (item.value !== "") {
                            bFilter = true;
                            aFilter.push(new Filter(item.name, this.getConnector(item.connector), item.value))
                        }
                    })

                    if (bFilter) {
                        oFilter = new Filter(aFilter, true);
                        oTable.getBinding("rows").filter(oFilter, "Application");
                    }
    
                    this._aMultiFiltersBeforeChange = [];
                }

                if (this._aFiltersBeforeChange.length > 0) {
                    var aFilter = [];
                    var oFilter = null;
                    var oColumns = oTable.getColumns();
                    // console.log(oColumns)
                    this._aFiltersBeforeChange.forEach(item => {
                        aFilter.push(new Filter(item.sPath, this.getConnector(item.sOperator), item.oValue1));
                        oColumns.filter(fItem => fItem.getFilterProperty() === item.sPath)
                            .forEach(col => col.filter(item.oValue1))
                    })

                    this._aFiltersBeforeChange = [];
                }                
            },

            onFilter: function(oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("gmcTab") >= 0) {
                    sModel = "gmc";                   
                }
                else if (oTable.getId().indexOf("attributesTab") >= 0) {
                    sModel = "attributes";
                }
                else if (oTable.getId().indexOf("materialsTab") >= 0) {
                    sModel = "materials";
                }

                this.setActiveRowHighlight(sModel);

                setTimeout(() => {
                    this.getView().getModel("counts").setProperty("/" + sModel, oTable.getBinding("rows").aIndices.length);
                }, 100);
            },

            onSaveTableLayout: function (oEvent) {
                //saving of the layout of table
                var me = this;
                var ctr = 1;
                var oTable = oEvent.getSource().oParent.oParent;
                // var oTable = this.getView().byId("mainTab");
                var oColumns = oTable.getColumns();
                var vSBU = this.getView().getModel("ui").getData().sbu;
                console.log(oColumns)

                // return;
                var oParam = {
                    "SBU": vSBU,
                    "TYPE": "",
                    "TABNAME": "",
                    "TableLayoutToItems": []
                };

                if (oTable.getBindingInfo("rows").model === "gmc") {
                    oParam['TYPE'] = "GMCHDR";
                    oParam['TABNAME'] = "ZERP_MATGMC";
                }
                else if (oTable.getBindingInfo("rows").model === "attributes") {
                    oParam['TYPE'] = "GMCATTRIB";
                    oParam['TABNAME'] = "ZERP_GMCATTRIB";
                }
                else if (oTable.getBindingInfo("rows").model === "materials") {
                    oParam['TYPE'] = "GMCMAT";
                    oParam['TABNAME'] = "ZERP_MATERIAL";
                }
                console.log(oParam)
                //get information of columns, add to payload
                oColumns.forEach((column) => {
                    oParam.TableLayoutToItems.push({
                        // COLUMNNAME: column.sId,
                        COLUMNNAME: column.mProperties.sortProperty,
                        ORDER: ctr.toString(),
                        SORTED: column.mProperties.sorted,
                        SORTORDER: column.mProperties.sortOrder,
                        SORTSEQ: "1",
                        VISIBLE: column.mProperties.visible,
                        WIDTH: column.mProperties.width.replace('rem','')
                    });

                    ctr++;
                });

                //call the layout save
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                oModel.create("/TableLayoutSet", oParam, {
                    method: "POST",
                    success: function(data, oResponse) {
                        sap.m.MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_LAYOUT_SAVE"]);
                        //Common.showMessage(me._i18n.getText('t6'));
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });                
            },

            onFirstVisibleRowChanged: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("gmcTab") >= 0) {
                    sModel = "gmc";
                }
                else if (oTable.getId().indexOf("attributesTab") >= 0) {
                    sModel = "attributes";
                }
                else if (oTable.getId().indexOf("materialsTab") >= 0) {
                    sModel = "materials";
                }

                setTimeout(() => {
                    var oData = oTable.getModel(sModel).getData().results;
                    var iStartIndex = oTable.getBinding("rows").iLastStartIndex;
                    var iLength = oTable.getBinding("rows").iLastLength + iStartIndex;

                    if (oTable.getBinding("rows").aIndices.length > 0) {
                        for (var i = iStartIndex; i < iLength; i++) {
                            var iDataIndex = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === i);
    
                            if (oData[iDataIndex].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                    else {
                        for (var i = iStartIndex; i < iLength; i++) {
                            if (oData[i].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                }, 1);
            },

            onColumnUpdated: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("gmcTab") >= 0) {
                    sModel = "gmc";
                }
                else if (oTable.getId().indexOf("attributesTab") >= 0) {
                    sModel = "attributes";
                }
                else if (oTable.getId().indexOf("materialsTab") >= 0) {
                    sModel = "materials";
                }

                this.setActiveRowHighlight(sModel);
            },

            setActiveRowHighlight(arg) {
                var oTable = this.byId(arg + "Tab");
                
                setTimeout(() => {
                    if (oTable.getModel(arg) !== undefined) {
                        var iActiveRowIndex = oTable.getModel(arg).getData().results.findIndex(item => item.ACTIVE === "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext(arg) && +row.getBindingContext(arg).sPath.replace("/results/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    }
                }, 1);
            },

            onCellClick: function(oEvent) {
                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                    var sModel;

                    if (oTable.getId().indexOf("gmcTab") >= 0) {
                        sModel = "gmc";
                    }
                    else if (oTable.getId().indexOf("attributesTab") >= 0) {
                        sModel = "attributes";
                    }
                    else if (oTable.getId().indexOf("materialsTab") >= 0) {
                        sModel = "materials";
                    }
    
                    oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                    oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X"); 
                    
                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }
            },

            checkMaterials: async (me, gmc) => {
                var oModel = me.getOwnerComponent().getModel();
                var sGmc = me.getView().getModel("ui").getData().activeGmc;

                if (gmc !== undefined && gmc !== "") sGmc = gmc;

                var promise = new Promise((resolve, reject) => {
                    oModel.read("/GMCMaterialSet", {
                        urlParameters: {
                            "$filter": "GMC eq '" + sGmc + "'"
                        },
                        success: function(oResult) {
                            if (oResult.results.length > 0) {
                                resolve(true);
                            }
                            else resolve(false);
                        },
                        error: function (err) {
                            // sap.m.MessageBox.information("Something went wrong, please try again.");
                            resolve(true);
                        }
                    });
                })

                return await promise;
            },

            onNavBack: function(oEvent) {
                var oModel = this.getOwnerComponent().getModel();

                oModel.read('/SBURscSet', { 
                    success: function (data, response) {
                        console.log(data)
                    },
                    error: function (err) { }
                })


            },

            setKeyboardShortcuts: function() {
                $(document).keydown(function(oEvent){
                    // console.log(oEvent)
                    if (oEvent.keyCode === 78 && (oEvent.ctrlKey)) {
                        // console.log("CTRL+N")
                        oEvent.preventDefault();                        
                        // alert('CTRL+N');
                    }
                });
            },

            onRowSelectionChange: function(oEvent) {
                // console.log("onRowSelectionChange");
                // var oTable = this.byId("gmcTab");
                // var aSelIndices = oTable.getSelectedIndices();
                // var oTmpSelectedIndices = [];

                // if (aSelIndices.length > 0) {
                //     aSelIndices.forEach(item => {
                //         oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                //     })

                //     aSelIndices = oTmpSelectedIndices;

                //     // console.log(aSelIndices)
                //     oTable.getModel("gmc").getData().results.forEach(row => row.ACTIVE = "");
                //     oTable.getModel("gmc").setProperty("/results/" + aSelIndices[aSelIndices.length - 1] + "/ACTIVE", "X"); 
                    
                //     oTable.getRows().forEach(row => {                        
                //         if (row.getBindingContext("gmc") && +row.getBindingContext("gmc").sPath.replace("/results/", "") === aSelIndices[aSelIndices.length - 1]) {
                //             row.addStyleClass("activeRow");
                //         }
                //         else row.removeStyleClass("activeRow")
                //     })
                // }
            },

        });
    });
