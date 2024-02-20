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
    "../js/TableFilter",
    "../js/TableValueHelp",
    "sap/m/Token",
    'sap/m/SearchField',
    'sap/ui/model/type/String',
    "../js/SmartFilterCustomControl",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, Fragment, HashChanger, TableFilter, TableValueHelp, Token, SearchField, typeString, SmartFilterCustomControl) {
        "use strict";

        // shortcut for sap.ui.table.SortOrder
        var SortOrder = library.SortOrder;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "YYYY-MM-dd" });
        var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({ pattern: "KK:mm:ss a" });

        return Controller.extend("zuigmc2.controller.Main", {

            onInit: async function () {
                this.getAppAction();
                this.validationErrors = [];
                // this.showLoadingDialog('Loading...');
                this._sActiveTable = "gmcTab";
                this._tableFilter = TableFilter;
                this._colFilters = {};
                this._aColSorters = {
                    gmc: [],
                    attributes: [],
                    materials: [],
                    cusmat: []
                };
                this._tableValueHelp = TableValueHelp;
                this._sbuChange = false;
                this._smartFilterCustomControl = SmartFilterCustomControl;

                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                var oModel = this.getOwnerComponent().getModel();               
                var _this = this; 

                oModel.setUseBatch(false);

                this.getView().setModel(new JSONModel({
                    activeGmc: '',
                    activeTmpGmc: '',
                    activeMattyp: '',
                    activeTmpMattyp: '',
                    sbu: '',
                    currsbu: '',
                    dataMode: 'INIT',
                    updTable: '',
                    smartfiltergf: 0,
                    splittergf: 0.94,
                    fullscreen: {
                        header: false,
                        detail: false
                    },
                    splitter: {
                        header: "50%",
                        detail: "50%"
                    },
                    dataWrap: {
                        gmcTab: false,
                        attributesTab: false,
                        materialsTab: false,
                        cusmatTab: false
                    }
                }), "ui");

                // this._oMultiInput = this.getView().byId("multiInputMatTyp");
                // this._oMultiInput.addValidator(this._onMultiInputValidate.bind(this));
                this._oGlobalGMCFilter = null;
                this._oSortDialog = null;
                this._oFilterDialog = null;
                this._oViewSettingsDialog = {};
                this._DiscardChangesDialog = null;
                this._GMCDescZHAuth = false;
                this._bResourcesRendered = false;

                this._aEntitySet = {
                    gmc: "GMCHdr2Set", attributes: "GMCAttribSet", materials: "GMCMaterialSet", cusmat: "GMCCustMaterialSet"
                };

                this._aColumns = {};
                this._aSortableColumns = {};
                this._aFilterableColumns = {};
                // this.getColumns();
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
                this.byId("cusmatTab").addEventDelegate(oTableEventDelegate);

                this._isGMCEdited = false;
                this._isAttrEdited = false;
                this._isCusMatEdited = false;

                this._cancelGMCCreate = false;
                this._cancelGMC = false;
                this._cancelAttr = false;
                this._cancelCusMat = false;
                this._tableRendered = "";
                this._goHome = false;

                this._aFiltersBeforeChange = [];
                this._aMultiFiltersBeforeChange = [];

                this._counts = {
                    gmc: 0,
                    attributes: 0,
                    materials: 0,
                    cusmat: 0
                }

                this.getView().setModel(new JSONModel(this._counts), "counts");

                // this.byId("gmcTab").attachBrowserEvent('paste', function (e) {
                //     e.preventDefault();
                //     console.log("table paste");
                //     var text = (e.originalEvent || e).clipboardData.getData('text/plain');
                //     // that.insertRows(text, this, undefined);
                //     console.log(text)
                // });

                SmartFilterCustomControl.setSmartFilterModel(this);
                var oModelSmartFilter = this.getOwnerComponent().getModel("ZVB_3DERP_GMC_FILTERS_CDS");
                
                oModelSmartFilter.read("/ZVB_3DERP_SBU_SH", {
                    success: function (oData, oResponse) {
                        var vSBU = _this.getView().getModel("ui").getProperty("/sbu");

                        if (!(vSBU === undefined || vSBU === "")) {
                            return;
                        }
                        
                        if (oData.results.length === 1) {
                            _this.getView().getModel("ui").setProperty("/sbu", oData.results[0].SBU);
                            // _this.getColumns();
                            _this.getGMC();
                        }
                        else {
                            // _this.byId("btnColPropAttr").setEnabled(false); 
                            _this.byId("btnAddGMC").setEnabled(false);
                            _this.byId("btnEditGMC").setEnabled(false);
                            _this.byId("btnDeleteGMC").setEnabled(false);
                            _this.byId("btnRefreshGMC").setEnabled(false);
                            _this.byId("btnSortGMC").setEnabled(false);
                            // _this.byId("btnFilterGMC").setEnabled(false);
                            _this.byId("btnFullScreenHdr").setEnabled(false);
                            // _this.byId("btnColPropGMC").setEnabled(false);
                            _this.byId("searchFieldGMC").setEnabled(false);
                            _this.byId("btnTabLayoutGMC").setEnabled(false);
                            _this.byId("btnDataWrapGMC").setEnabled(false);
                            _this.byId("btnEditAttr").setEnabled(false);
                            _this.byId("btnRefreshAttr").setEnabled(false);
                            _this.byId("btnSortAttr").setEnabled(false);
                            _this.byId("btnFullScreenAttr").setEnabled(false);
                            _this.byId("searchFieldAttr").setEnabled(false);
                            _this.byId("btnTabLayoutAttr").setEnabled(false);   
                            _this.byId("btnDataWrapAttr").setEnabled(false);
                            _this.byId("refreshMaterialsButton").setEnabled(false);
                            _this.byId("sortMaterialsButton").setEnabled(false);
                            _this.byId("btnFullScreenMatl").setEnabled(false);
                            _this.byId("searchFieldMatl").setEnabled(false);
                            _this.byId("btnTabLayoutMatl").setEnabled(false);
                            _this.byId("btnDataWrapMatl").setEnabled(false);
                            _this.byId("btnAddCusMat").setEnabled(false);
                            _this.byId("btnEditCusMat").setEnabled(false);
                            _this.byId("btnDeleteCusMat").setEnabled(false);
                            _this.byId("btnRefreshCusMat").setEnabled(false);
                            _this.byId("btnFullScreenCusMat").setEnabled(false);
                            _this.byId("btnTabLayoutCusMat").setEnabled(false);
                            _this.byId("btnDataWrapCusMat").setEnabled(false);

                        } 
                    },
                    error: function (err) { }
                });

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
                oDDTextParam.push({CODE: "MATKL"}); 
                oDDTextParam.push({CODE: "WGBEZ"}); 
                oDDTextParam.push({CODE: "MSEHI"}); 
                oDDTextParam.push({CODE: "MSEHL"}); 
                oDDTextParam.push({CODE: "PROCESSCD"}); 
                oDDTextParam.push({CODE: "DESC1"}); 
                oDDTextParam.push({CODE: "ATTRIBCD"}); 
                oDDTextParam.push({CODE: "SHORTTEXT"}); 
                oDDTextParam.push({CODE: "SHORTTEXT2"});
                oDDTextParam.push({CODE: "SBU"}); 
                oDDTextParam.push({CODE: "MATTYP"}); 
                oDDTextParam.push({CODE: "MATGRPCD"}); 
                oDDTextParam.push({CODE: "GMC"}); 
                oDDTextParam.push({CODE: "MATTYPCLS"}); 
                oDDTextParam.push({CODE: "DESCEN"}); 
                oDDTextParam.push({CODE: "DESCZH"}); 
                oDDTextParam.push({CODE: "ITEMS"}); 
                oDDTextParam.push({CODE: "INFO_DATA_SAVE"}); 
                oDDTextParam.push({CODE: "INFO_DATA_DELETED"}); 
                oDDTextParam.push({CODE: "WRAP"}); 
                oDDTextParam.push({CODE: "UNWRAP"}); 
                oDDTextParam.push({CODE: "DESC"}); 
                oDDTextParam.push({CODE: "EKWSL"}); 
                oDDTextParam.push({CODE: "UNTTO"}); 
                oDDTextParam.push({CODE: "UEBTO"}); 
                oDDTextParam.push({CODE: "UEBTK"}); 
                oDDTextParam.push({CODE: "KDGRP"}); 
                oDDTextParam.push({CODE: "KTEXT"}); 
                oDDTextParam.push({CODE: "INFO_GMC_VALIDATE_UOM_1"}); 
                oDDTextParam.push({CODE: "INFO_GMC_VALIDATE_UOM_2"}); 
                oDDTextParam.push({CODE: "INFO_SEL_RECORD_TO_REMOVE"}); 
                oDDTextParam.push({CODE: "INFO_NO_RECORD_TO_REMOVE"}); 
                oDDTextParam.push({CODE: "INFO_NO_DATA_EDIT"}); 

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

                oRouter.getRoute("RouteMain").attachPatternMatched(this._onPatternMatched, this);

                // oModel.read('/MatTypeSHSet', {
                //     async: false,
                //     success: function (oData) {
                //         _this.getView().setModel(new JSONModel(oData.results), "mattyp");
                //     },
                //     error: function (err) { }
                // })

                // oModel.read('/MatGrpRscSet', {
                //     async: false,
                //     success: function (oData) {
                //         _this.getView().setModel(new JSONModel(oData.results), "matgrp");
                //     },
                //     error: function (err) { }
                // })

                // oModel.read('/UOMRscSet', {
                //     async: false,
                //     success: function (oData) {
                //         _this.getView().setModel(new JSONModel(oData.results), "uom");
                //     },
                //     error: function (err) { }
                // })

                // oModel.read('/WtUOMRscSet', {
                //     async: false,
                //     success: function (oData) {
                //         _this.getView().setModel(new JSONModel(oData.results), "wtuom");
                //     },
                //     error: function (err) { }
                // })

                // oModel.read('/ProcessRscSet', {
                //     async: false,
                //     success: function (oData) {
                //         _this.getView().setModel(new JSONModel(oData.results), "process");
                //     },
                //     error: function (err) { }
                // })

                // oModel.read('/PurcValKeyRscSet', {
                //     async: false,
                //     success: function (oData) {
                //         _this.getView().setModel(new JSONModel(oData.results), "purvalkey");
                //     },
                //     error: function (err) { }
                // })

                oModel.read('/MatTypeAttribSet', {
                    async: false,
                    success: function (oData) {
                        _this.getView().setModel(new JSONModel(oData.results), "mattypattrib");
                    },
                    error: function (err) { }
                })

                // oModel.read('/MatTypeClassSet', {
                //     async: false,
                //     success: function (oData) {
                //         _this.getView().setModel(new JSONModel(oData.results), "mattypcls");
                //     },
                //     error: function (err) { }
                // })

                // oModel.read('/CusGrpRscSet', {
                //     async: false,
                //     success: function (oData) {
                //         _this.getView().setModel(new JSONModel(oData.results), "cusgrp");
                //     },
                //     error: function (err) { }
                // })

                this.getGMCDescZHAuth();
                this.getResources();
                // this.byId("splitterMain").setProperty("height", "99%");
            },

            _onPatternMatched : function (oEvent) {
                this._pSBU =  oEvent.getParameter("arguments").sbu;
                this._pGMC =  oEvent.getParameter("arguments").gmc;

                if (this._pGMC !== undefined) {
                    this.getView().getModel("ui").setProperty("/sbu", this._pSBU);
                    this.onSBUChange();
                    this.onSearch();
                }
            },
            
            // onBeforeRendering: async function(oEvent) {
            //     await this.getResource(this);
            // },

            getResource: async (me) => {
                var promise = new Promise((resolve, reject) => {
                    var oInterval = setInterval(() => {
                        if (me._bResourcesRendered) {
                            clearInterval(oInterval);
                            resolve(true);
                        }
                    }, 100);
                })

                // var oModel = me.getOwnerComponent().getModel();

                // var oParam = {
                //     "SBU":"",
                //     "N_MatTypeRsc": [],
                //     "N_MatGrpRsc": [],
                //     "N_UOMRsc": [],
                //     "N_WtUOMRsc": [],
                //     "N_ProcessRsc": [],
                //     "N_PurcValKeyRsc": [],
                //     "N_MatTypeAttribRsc": [],
                //     "N_MatTypeClassRsc": [],
                //     "N_CusGrpRsc": []
                // }

                // var promise = new Promise((resolve, reject) => {
                //     oModel.create("/ResourceSet", oParam, {
                //         method: "POST",
                //         success: function (oData) {
                //             console.log(oData)
                //             me.getView().setModel(new JSONModel(oData.N_MatTypeRsc.results), "mattyp");
                //             me.getView().setModel(new JSONModel(oData.N_MatGrpRsc.results), "matgrp");
                //             me.getView().setModel(new JSONModel(oData.N_UOMRsc.results), "uom");
                //             me.getView().setModel(new JSONModel(oData.N_WtUOMRsc.results), "wtuom");
                //             me.getView().setModel(new JSONModel(oData.N_ProcessRsc.results), "process");
                //             me.getView().setModel(new JSONModel(oData.N_PurcValKeyRsc.results), "purvalkey");
                //             me.getView().setModel(new JSONModel(oData.N_MatTypeAttribRsc.results), "mattypattrib");
                //             me.getView().setModel(new JSONModel(oData.N_MatTypeClassRsc.results), "mattypcls");
                //             me.getView().setModel(new JSONModel(oData.N_CusGrpRsc.results), "cusgrp");
                //             resolve(true);
                //         },
                //         error: function (err) { 
                //             resolve(false);
                //         }
                //     })
                // })

                return await promise;
            },

            getResources() {
                var me = this;
                var oModel = me.getOwnerComponent().getModel();

                var oParam = {
                    "SBU":"",
                    "N_MatTypeRsc": [],
                    "N_MatGrpRsc": [],
                    "N_UOMRsc": [],
                    "N_WtUOMRsc": [],
                    "N_ProcessRsc": [],
                    "N_PurcValKeyRsc": [],
                    "N_MatTypeClassRsc": [],
                    "N_CusGrpRsc": []
                }

                oModel.create("/ResourceSet", oParam, {
                    method: "POST",
                    success: function (oData) {
                        // console.log(oData)
                        me._bResourcesRendered = true;
                        me.getView().setModel(new JSONModel(oData.N_MatTypeRsc.results), "mattyp");
                        me.getView().setModel(new JSONModel(oData.N_MatGrpRsc.results), "matgrp");
                        me.getView().setModel(new JSONModel(oData.N_UOMRsc.results), "uom");
                        me.getView().setModel(new JSONModel(oData.N_WtUOMRsc.results), "wtuom");
                        me.getView().setModel(new JSONModel(oData.N_ProcessRsc.results), "process");
                        me.getView().setModel(new JSONModel(oData.N_PurcValKeyRsc.results), "purvalkey");
                        me.getView().setModel(new JSONModel(oData.N_MatTypeAttribRsc.results), "mattypattrib");
                        me.getView().setModel(new JSONModel(oData.N_MatTypeClassRsc.results), "mattypcls");
                        me.getView().setModel(new JSONModel(oData.N_CusGrpRsc.results), "cusgrp");
                    },
                    error: function (err) { 

                    }
                })
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
                        this.byId("btnAddCusMat").setVisible(false);
                        this.byId("btnEditCusMat").setVisible(false);
                        this.byId("btnDeleteCusMat").setVisible(false);
                    }
                    else {
                        this.byId("btnAddGMC").setVisible(true);
                        this.byId("btnEditGMC").setVisible(true);
                        this.byId("btnDeleteGMC").setVisible(true);
                        this.byId("btnEditAttr").setVisible(true);
                        this.byId("btnAddCusMat").setVisible(true);
                        this.byId("btnEditCusMat").setVisible(true);
                        this.byId("btnDeleteCusMat").setVisible(true);
                    }
                }
            },

            // onExit: function() {
            //     console.log('app exit');
            //     console.log(sap.ushell.Container.getDirtyFlag());
            // },

            onSBUChange: function(oEvent) {
                this._sbuChange = true;
                
                var me = this;
                var vSBU = this.getView().byId("cboxSBU").getSelectedKey();
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_GMC_FILTERS_CDS");

                oModel.read("/ZVB_3DERP_MATTYPE_SH", {
                    urlParameters: {
                        "$filter": "SBU eq '" + vSBU + "'"
                    },                    
                    success: function (oData, oResponse) {
                        me.getView().setModel(new JSONModel(oData.results.filter(item => item.SBU === vSBU)), "sfmMATTYP");
                    },
                    error: function (err) { }
                });

                // // console.log(this.byId('cboxSBU').getSelectedKey());
                // var vSBU = this.byId('cboxSBU').getSelectedKey();
                // this.getView().getModel("ui").setProperty("/sbu", vSBU);
                // this.showLoadingDialog('Loading...');
                // // this.getColumns();
                // this.getGMC();

                // this.byId("btnColPropAttr").setEnabled(true);
                // this.byId("btnAddGMC").setEnabled(true);
                // this.byId("btnEditGMC").setEnabled(true);
                // this.byId("btnDeleteGMC").setEnabled(true);
                // this.byId("btnRefreshGMC").setEnabled(true);
                // this.byId("btnSortGMC").setEnabled(true);
                // // this.byId("btnFilterGMC").setEnabled(true);
                // this.byId("btnFullScreenHdr").setEnabled(true);
                // this.byId("btnColPropGMC").setEnabled(true);
                // this.byId("searchFieldGMC").setEnabled(true);
                // this.byId("btnTabLayoutGMC").setEnabled(true);
                // this.byId("btnEditAttr").setEnabled(true);
                // this.byId("btnRefreshAttr").setEnabled(true);
                // this.byId("btnSortAttr").setEnabled(true);
                // // this.byId("btnFilterAttr").setEnabled(true);
                // this.byId("btnFullScreenAttr").setEnabled(true);
                // this.byId("btnColPropAttr").setEnabled(true);
                // this.byId("searchFieldAttr").setEnabled(true);
                // this.byId("btnTabLayoutAttr").setEnabled(true);   
                // this.byId("refreshMaterialsButton").setEnabled(true);
                // this.byId("sortMaterialsButton").setEnabled(true);
                // // this.byId("filterMaterialsButton").setEnabled(true);
                // this.byId("btnFullScreenMatl").setEnabled(true);
                // this.byId("btnColPropMatl").setEnabled(true);
                // this.byId("searchFieldMatl").setEnabled(true);
                // this.byId("btnTabLayoutMatl").setEnabled(true);
                // this.getView().getModel("ui").setProperty("/dataMode", "READ");

                if (vSBU === "") {
                    this.byId("sffMATTYP").destroyTokens();
                }
            },

            onSearch: function () {
                var vSBU = this.byId("cboxSBU").getSelectedKey();                

                if (this.getView().getModel("ui").getData().currsbu !== vSBU) {
                    this.getColumns();
                }

                this.getView().getModel("ui").setProperty("/currsbu", vSBU);                
                this.showLoadingDialog('Loading...');
                this.getGMC();

                this.byId("btnAddGMC").setEnabled(true);
                this.byId("btnEditGMC").setEnabled(true);
                this.byId("btnDeleteGMC").setEnabled(true);
                this.byId("btnRefreshGMC").setEnabled(true);
                this.byId("btnSortGMC").setEnabled(true);
                this.byId("btnFullScreenHdr").setEnabled(true);
                this.byId("searchFieldGMC").setEnabled(true);
                this.byId("btnTabLayoutGMC").setEnabled(true);
                this.byId("btnDataWrapGMC").setEnabled(true);
                this.byId("btnEditAttr").setEnabled(true);
                this.byId("btnRefreshAttr").setEnabled(true);
                this.byId("btnSortAttr").setEnabled(true);
                this.byId("btnFullScreenAttr").setEnabled(true);
                this.byId("searchFieldAttr").setEnabled(true);
                this.byId("btnTabLayoutAttr").setEnabled(true);
                this.byId("btnDataWrapAttr").setEnabled(true);
                this.byId("refreshMaterialsButton").setEnabled(true);
                this.byId("sortMaterialsButton").setEnabled(true);
                this.byId("btnFullScreenMatl").setEnabled(true);
                this.byId("searchFieldMatl").setEnabled(true);
                this.byId("btnTabLayoutMatl").setEnabled(true);
                this.byId("btnDataWrapMatl").setEnabled(true);
                this.byId("btnAddCusMat").setEnabled(true);
                this.byId("btnEditCusMat").setEnabled(true);
                this.byId("btnDeleteCusMat").setEnabled(true);
                this.byId("btnRefreshCusMat").setEnabled(true);
                this.byId("btnFullScreenCusMat").setEnabled(true);
                this.byId("btnTabLayoutCusMat").setEnabled(true);
                this.byId("btnDataWrapCusMat").setEnabled(true);

                this.getView().getModel("ui").setProperty("/dataMode", "READ");
                this._dataMode = "READ";
                this._sbuChange = false;
            },

            async getGMC() {
                var _this = this;
                var oModel = this.getOwnerComponent().getModel();
                var oSmartFilter = this.getView().byId("smartFilterBar").getFilters();
                var aFilters = [], aFilter = [], aSmartFilter = [];
                // console.log(oSmartFilter)
                if (oSmartFilter.length > 0)  {
                    oSmartFilter[0].aFilters.forEach(item => {
                        if (item.aFilters === undefined) {
                            aFilter.push(new Filter(item.sPath, item.sOperator, item.oValue1));
                        }
                        else {
                            aFilters.push(item);
                        }
                    })

                    if (aFilter.length > 0) { aFilters.push(new Filter(aFilter, false)); }
                }

                if (Object.keys(this._oSmartFilterCustomControlProp).length > 0) {
                    Object.keys(this._oSmartFilterCustomControlProp).forEach(item => {
                        var oCtrl = this.getView().byId("smartFilterBar").determineControlByName(item);

                        if (oCtrl) {
                            var aCustomFilter = [];
    
                            if (oCtrl.getTokens().length === 1) {
                                oCtrl.getTokens().map(function(oToken) {
                                    aFilters.push(new Filter(item, FilterOperator.EQ, oToken.getKey()))
                                })
                            }
                            else if (oCtrl.getTokens().length > 1) {
                                oCtrl.getTokens().map(function(oToken) {
                                    aCustomFilter.push(new Filter(item, FilterOperator.EQ, oToken.getKey()))
                                })
    
                                aFilters.push(new Filter(aCustomFilter));
                            }
                        }
                    })
                }

                aSmartFilter.push(new Filter(aFilters, true));
                // console.log(new Date())
                await this.getResource(this);
                // console.log(new Date())
                // console.log(aSmartFilter)
                oModel.read('/GMCHdr2Set', { 
                    filters: aSmartFilter,
                    // urlParameters: {
                    //     "$filter": "SBU eq '" + vSBU + "'"
                    // },                    
                    success: function (data, response) {
                        // console.log(new Date())
                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        var oResult = data.results;
                        
                        TableFilter.removeColFilters("gmcTab", _this);
                        TableFilter.removeColFilters("attributesTab", _this);
                        TableFilter.removeColFilters("materialsTab", _this);
                        TableFilter.removeColFilters("cusmatTab", _this);

                        var oTable = _this.byId('attributesTab');
                        var oColumns = oTable.getColumns();

                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            // if (oColumns[i].getFiltered()) {
                            //     oColumns[i].filter("");
                            // }

                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
                        }

                        oTable = _this.byId('materialsTab');
                        oColumns = oTable.getColumns();

                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            // if (oColumns[i].getFiltered()) {
                            //     oColumns[i].filter("");
                            // }

                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
                        }

                        oTable = _this.byId('cusmatTab');
                        oColumns = oTable.getColumns();

                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
                        }

                        oTable = _this.byId('gmcTab');
                        oColumns = oTable.getColumns();

                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            // if (oColumns[i].getFiltered()) {
                            //     oColumns[i].filter("");
                            // }

                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
                        }

                        if (data.results.length > 0) {
                            if (_this._pGMC !== undefined) {
                                oResult = data.results.filter(fItem => fItem.GMC === _this._pGMC);
                                data["results"] = oResult;
                            }

                            data.results.sort((a,b) => (a.GMC > b.GMC ? 1 : -1));

                            data.results.forEach((item, index) => {
                                item.DELETED = item.DELETED === "X" ? true : false;
    
                                if (item.CREATEDDT !== null) { item.CREATEDDT = dateFormat.format(item.CREATEDDT) + " " + _this.formatTimeOffSet(item.CREATEDTM.ms); }
    
                                if (item.UPDATEDDT !== null) { item.UPDATEDDT = dateFormat.format(item.UPDATEDDT) + " " + _this.formatTimeOffSet(item.UPDATEDTM.ms); }
    
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
                            _this.getCustomerMaterial(false);
                        }
                        else {
                            oJSONModel.setData(data);
                            _this.getView().getModel("ui").setProperty("/activeGmc", '');
                            _this.getView().getModel("ui").setProperty("/activeMattyp", '');
                            _this.getView().getModel("counts").setProperty("/gmc", 0);
                            _this.getView().getModel("counts").setProperty("/materials", 0);
                            _this.getView().getModel("counts").setProperty("/attributes", 0);
                            _this.getView().getModel("counts").setProperty("/cusmat", 0);

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "materials");

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "attributes");

                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "cusmat");
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
                            if (item.CREATEDDT !== null) { item.CREATEDDT = dateFormat.format(item.CREATEDDT) + " " + _this.formatTimeOffSet(item.CREATEDTM.ms); }

                            if (item.UPDATEDDT !== null) { item.UPDATEDDT = dateFormat.format(item.UPDATEDDT) + " " + _this.formatTimeOffSet(item.UPDATEDTM.ms); }

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

                        // if (arg && aFilters) {
                        //     _this.onRefreshFilter("materials", aFilters);
                        // }

                        if (arg) {
                            TableFilter.applyColFilters("materialsTab", _this);
                            _this.setColumnSorters("materialsTab");
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
                                { item.CREATEDDT = dateFormat.format(item.CREATEDDT) + " " + _this.formatTimeOffSet(item.CREATEDTM.ms); }

                            if (item.UPDATEDDT !== null)
                                { item.UPDATEDDT = dateFormat.format(item.UPDATEDDT) + " " + _this.formatTimeOffSet(item.UPDATEDTM.ms); }

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

                        // if (arg && aFilters) {
                        //     _this.onRefreshFilter("attributes", aFilters);
                        // }

                        if (arg) {
                            TableFilter.applyColFilters("attributesTab", _this);
                            _this.setColumnSorters("attributesTab");
                        }

                        _this.setActiveRowHighlight("attributes");
                    },
                    error: function (err) { }
                })
            },            

            getCustomerMaterial(arg) {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oEntitySet = "/GMCCustMaterialSet";
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
                            if (item.CREATEDDT !== null) { item.CREATEDDT = dateFormat.format(item.CREATEDDT) + " " + _this.formatTimeOffSet(item.CREATEDTM.ms); }

                            if (item.UPDATEDDT !== null) { item.UPDATEDDT = dateFormat.format(item.UPDATEDDT) + " " + _this.formatTimeOffSet(item.UPDATEDTM.ms); }

                            if (index === 0) item.ACTIVE = "X";
                            else item.ACTIVE = "";
                        })

                        var aFilters = [];

                        if (arg && _this.getView().byId("cusmatTab").getBinding("rows")) {
                            aFilters = _this.getView().byId("cusmatTab").getBinding("rows").aFilters;
                        }

                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "cusmat");
                        _this.getView().getModel("counts").setProperty("/cusmat", data.results.length);
                        _this._tableRendered = "cusmatTab";

                        if (arg) {
                            TableFilter.applyColFilters("cusmatTab", _this);
                            _this.setColumnSorters("cusmatTab");
                        }

                        _this.setActiveRowHighlight("cusmat");
                    },
                    error: function (err) { }
                })
            },

            getGMCDescZHAuth() {
                var oModel = this.getOwnerComponent().getModel();
                var oEntitySet = "/CustomAuthSet";
                var sRoleId = "VERCHGZHGMCDESC";
                var sObjCd = "VERCHGZHGMC";
                var me = this;

                oModel.read(oEntitySet, {
                    urlParameters: {
                        "$filter": "ROLEID eq '" + sRoleId + "' and OBJCD eq '" + sObjCd + "'"
                    },
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            me._GMCDescZHAuth = true;
                        }

                        // console.log(me._GMCDescZHAuth);
                    },
                    error: function (err) { }
                })
            },

            checkExistingGMCDesc: async (me) => {
                var oModel = me.getOwnerComponent().getModel();
                var oEntitySet = "/ChkDupGMCDescSet";
                var aNewRows = me.getView().getModel("gmc").getData().results.filter(item => item.New === true);
                var iCounter = 0;
                var sMessage = "";
                var oParam = {};
                var oParamItems = [];

                var promise = new Promise((resolve, reject) => {
                    aNewRows.forEach(item => {
                        oParamItems.push({
                            GMC: "",
                            MATTYP: item.MATTYP,
                            DESCEN: item.DESC
                        })                        
                    })

                    oParam["N_ChkDupDescItem"] = oParamItems;

                    oModel.create("/ChkDupDescSet", oParam, {
                        method: "POST",
                        success: function (oResult) {
                            console.log(oResult)
                            oResult.N_ChkDupDescItem.results.forEach(res => {
                                if (res.GMC !== "") {
                                    sMessage += "Existing GMC " + res.GMC + " has the same description " + res.DESCEN + "\r\n";
                                }                                
                            })

                            if (sMessage.length > 0) {
                                MessageBox.information(sMessage);
                                resolve(false);
                            }
                            else {
                                resolve(true);
                            }                            
                        },
                        error: function (err) { 
                            MessageBox.information(err.message);
                            resolve(false);
                        }
                    })
                })

                // var promise = new Promise((resolve, reject) => {
                //     aNewRows.forEach(item => {
                //         // console.log(item.MATTYP, item.DESCEN);                        
                //         var sFilter = encodeURIComponent(`MATTYP eq '` + item.MATTYP + `' and DESCEN eq '` + item.DESC.replace("'","''") + `'`);
                //         oModel.read(oEntitySet, {
                //             urlParameters: {
                //                 "$filter": sFilter
                //             },
                //             success: function (oData, oResponse) {
                //                 iCounter++;
                //                 // console.log(oData)

                //                 if (oData.results.length > 0) {
                //                     sMessage += "Existing GMC " + oData.results[0].GMC + " has the same description " + oData.results[0].DESCEN + "\r\n";
                //                 }

                //                 if (aNewRows.length === iCounter) {
                //                     if (sMessage.length > 0) {
                //                         MessageBox.information(sMessage);
                //                         resolve(false);
                //                     }
                //                     else {
                //                         resolve(true);
                //                     }
                //                 }
                //             },
                //             error: function (err) { 
                //                 iCounter++;

                //                 if (aNewRows.length === iCounter) {
                //                     if (sMessage.length > 0) {
                //                         MessageBox.information(sMessage);
                //                         resolve(false);
                //                     }
                //                     else {
                //                         resolve(true);
                //                     }
                //                 }
                //             }
                //         })
                //     })
                // })

                return await promise;
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
                this._oModelColumns = oModelColumns.getData();

                this._oModelColumns["gmc"].forEach(item => {
                    item.ColumnName = item.name.toUpperCase()
                })

                this._oModelColumns["attributes"].forEach(item => {
                    item.ColumnName = item.name.toUpperCase()
                })

                this._oModelColumns["class"].forEach(item => {
                    item.ColumnName = item.name.toUpperCase()
                })
                // console.log(oColumns)
                var oModel = this.getOwnerComponent().getModel();

                oModel.metadataLoaded().then(() => {
                    this.getDynamicColumns(oColumns, "GMCHDR2", "ZDV_3DERP_GMCHDR");
                    
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "GMCATTRIB", "ZERP_GMCATTRIB");
                    }, 100);

                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "GMCMAT", "ZERP_MATERIAL");

                    }, 100);

                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "GMCCUSMAT", "ZERP_GMCCUSGRP");

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
                        oJSONColumnsModel.setData(oData);
                        // me.getView().setModel(oJSONColumnsModel, "columns"); //set the view model

                        if (oData.results.length > 0) {
                            // console.log(modCode)
                            // oData.results.forEach(item => item.scale === null ? item.precision : item.scale);
                            if (modCode === 'GMCHDR2') {
                                
                                oData.results.forEach((item, index) => {
                                     if (item.ColumnName === 'UEBTK'){
                                        item.DataType = 'BOOLEAN';
                                     }     
                                });

                                var aColumns = me.setTableColumns(oColumns["gmc"], oData.results, "gmc");                               
                                // console.log(aColumns);
                                me._aColumns["gmc"] = aColumns["columns"];
                                me._aSortableColumns["gmc"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["gmc"] = aColumns["filterableColumns"]; 
                                me.addColumns(me.byId("gmcTab"), aColumns["columns"], "gmc");
                            }
                            else if (modCode === 'GMCATTRIB') {
                                var aColumns = me.setTableColumns(oColumns["attributes"], oData.results, "attributes");
                                // console.log(aColumns);
                                me._aColumns["attributes"] = aColumns["columns"];
                                me._aSortableColumns["attributes"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["attributes"] = aColumns["filterableColumns"];
                                me.addColumns(me.byId("attributesTab"), aColumns["columns"], "attributes");
                            }
                            else if (modCode === 'GMCMAT') {
                                var aColumns = me.setTableColumns(oColumns["materials"], oData.results, "materials");
                                // console.log(aColumns);
                                me._aColumns["materials"] = aColumns["columns"];;
                                me._aSortableColumns["materials"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["materials"] = aColumns["filterableColumns"];
                                me.addColumns(me.byId("materialsTab"), aColumns["columns"], "materials");
                            }
                            else if (modCode === 'GMCCUSMAT') {
                                var aColumns = me.setTableColumns(oColumns["cusmat"], oData.results, "cusmat");
                                me._aColumns["cusmat"] = aColumns["columns"];;
                                me._aSortableColumns["cusmat"] = aColumns["sortableColumns"];
                                me._aFilterableColumns["cusmat"] = aColumns["filterableColumns"];
                                me.addColumns(me.byId("cusmatTab"), aColumns["columns"], "cusmat");
                            }
                        }
                    },
                    error: function (err) {
                        me.closeLoadingDialog(me);
                    }
                });
            },

            setTableColumns: function(arg1, arg2, arg3) {
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
                    var vCreatable = prop.Creatable;
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

                    if (arg3 === "gmc" && prop.ColumnName === "DESCZH" && this._GMCDescZHAuth) {
                        vUpdatable = true;
                    }

                    //columns
                    aColumns.push({
                        ColumnName: prop.ColumnName,
                        name: prop.ColumnName, 
                        ColumnLabel: vName,
                        label: vName, 
                        position: +vOrder,
                        DataType: prop.DataType,
                        type: prop.DataType,
                        creatable: vCreatable,
                        updatable: vUpdatable,
                        sortable: vSortable,
                        filterable: vFilterable,
                        visible: prop.Visible,
                        required: prop.Mandatory,
                        width: prop.ColumnWidth + 'px',
                        sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                        hideOnChange: false,
                        valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                        ValueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].ValueHelp,
                        showable: vShowable,
                        key: prop.Key === '' ? false : true,
                        maxLength: prop.Length,
                        precision: prop.Length,
                        scale: prop.Decimal,
                        TextFormatMode: oColumnLocalProp.length === 0 ? "Key" : oColumnLocalProp[0].TextFormatMode,
                        WrapText: prop.WrapText
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
                var me = this;
                var aColumns = columns.filter(item => item.showable === true)
                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));

                aColumns.forEach(col => {
                    // console.log(col)
                    if (col.type === "STRING" || col.type === "DATETIME") {
                        var oText = new sap.m.Text({
                            wrapping: col.WrapText === "X" ? true : false,
                            tooltip: "{" + model + ">" + col.name + "}"
                        })
                        
                        if (col.ValueHelp && col.ValueHelp["items"].text && col.ValueHelp["items"].value !== col.ValueHelp["items"].text &&
                            col.TextFormatMode && col.TextFormatMode !== "Key") {
                            oText.bindText({  
                                parts: [  
                                    { path: model + ">" + col.name }
                                ],  
                                formatter: function(sKey) {
                                    var oValue = me.getView().getModel(col.ValueHelp["items"].path).getData().filter(v => v[col.ValueHelp["items"].value] === sKey);

                                    if (oValue && oValue.length > 0) {
                                        if (col.TextFormatMode === "Value") {
                                            return oValue[0][col.ValueHelp["items"].text];
                                        }
                                        else if (col.TextFormatMode === "ValueKey") {
                                            return oValue[0][col.ValueHelp["items"].text] + " (" + sKey + ")";
                                        }
                                        else if (col.TextFormatMode === "KeyValue") {
                                            return sKey + " (" + oValue[0][col.ValueHelp["items"].text] + ")";
                                        }
                                    }
                                    else return sKey;
                                }
                            }); 
                        }
                        else {
                            oText.bindText({  
                                parts: [  
                                    { path: model + ">" + col.name }
                                ]
                            }); 
                        
                        }

                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            name: col.name,
                            width: col.width,
                            sortProperty: col.name,
                            // filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: oText,
                            // template: new sap.m.Text({
                            //     text: "{" + model + ">" + col.name + "}",
                            //     wrapping: false, 
                            //     tooltip: "{" + model + ">" + col.name + "}"
                            // }),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "NUMBER") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            name: col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            // filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({
                                text: "{path:'" + model + ">" + col.name + "', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + col.scale + ", maxFractionDigits:" + col.scale + " }, constraints:{ precision:" + col.precision + ", scale:" + col.scale + " }}",
                                // text: "{" + model + ">" + col.name + "}",
                                wrapping: col.WrapText === "X" ? true : false
                                // tooltip: "{" + model + ">" + col.name + "}"
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
                            name: col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            // filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false}),
                            visible: col.visible
                        }));
                    }
                })

                var vWrap = aColumns[0].WrapText === "X" ? true : false;
                this.getView().getModel("ui").setProperty("/dataWrap/" + model + "Tab", vWrap);

                table.addColumn(new sap.ui.table.Column({
                    id: model + "ColACTIVE",
                    name: "ACTIVE",
                    width: "100px",
                    sortProperty: "ACTIVE",
                    // filterProperty: "ACTIVE",
                    label: new sap.m.Text({text: "Active"}),
                    template: new sap.m.Text({
                        text: "{" + model + ">ACTIVE}",
                        wrapping: vWrap, 
                        tooltip: "{" + model + ">ACTIVE}"
                    }),
                    visible: false
                }));

                //date/number sorting
                table.attachSort(function(oEvent) {
                    var sPath = oEvent.getParameter("column").getSortProperty();
                    var bMultiSort = oEvent.getParameter("columnAdded");
                    var bDescending, sSortOrder, oSorter, oColumn, columnType;
                    var aSorts = [];

                    if (!bMultiSort) {
                        table.getColumns().forEach(col => {
                            if (col.getSorted()) {
                                col.setSorted(false);
                            }
                        })
                    }

                    table.getSortedColumns().forEach(col => {
                        if (col.getProperty("name") === sPath) {
                            sSortOrder = oEvent.getParameter("sortOrder");
                            oEvent.getParameter("column").setSorted(true); //sort icon indicator
                            oEvent.getParameter("column").setSortOrder(sSortOrder); //set sort order                          
                        }
                        else {
                            sSortOrder = col.getProperty("sortOrder");
                        }

                        bDescending = (sSortOrder === "Descending" ? true : false);
                        oSorter = new sap.ui.model.Sorter(col.getProperty("name"), bDescending); //sorter(columnData, If Ascending(false) or Descending(True))
                        oColumn = aColumns.filter(fItem => fItem.ColumnName === col.getProperty("name"));
                        columnType = oColumn[0].DataType;

                        if (columnType === "DATETIME") {
                            oSorter.fnCompare = function(a, b) {
                                // parse to Date object
                                var aDate = new Date(a);
                                var bDate = new Date(b);
    
                                if (bDate === null) { return -1; }
                                if (aDate === null) { return 1; }
                                if (aDate < bDate) { return -1; }
                                if (aDate > bDate) { return 1; }
    
                                return 0;
                            };
                        }
                        else if (columnType === "NUMBER") {
                            oSorter.fnCompare = function(a, b) {
                                // parse to Date object
                                var aNumber = +a;
                                var bNumber = +b;
    
                                if (bNumber === null) { return -1; }
                                if (aNumber === null) { return 1; }
                                if (aNumber < bNumber) { return -1; }
                                if (aNumber > bNumber) { return 1; }
    
                                return 0;
                            };
                        }

                        aSorts.push(oSorter);
                    })

                    table.getBinding('rows').sort(aSorts);

                    // prevent internal sorting by table
                    oEvent.preventDefault();
                });

                TableFilter.updateColumnMenu(model + "Tab", this);
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
                            // filterProperty: col.name,
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
                            // filterProperty: col.name,
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
                            // filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false})
                        }));
                    }
                })
            },

            // onTableResize(arg1, arg2) {
            //     if (arg1 === "Hdr") {
            //         if (arg2 === "Max") {
            //             // this.byId("fixFlexGMC").setProperty("fixContentSize", "99%");
            //             this.byId("itbDetail").setVisible(false);
            //             this.byId("btnFullScreenHdr").setVisible(false);
            //             this.byId("btnExitFullScreenHdr").setVisible(true);
            //         }
            //         else {
            //             // this.byId("fixFlexGMC").setProperty("fixContentSize", "50%");
            //             this.byId("itbDetail").setVisible(true);
            //             this.byId("btnFullScreenHdr").setVisible(true);
            //             this.byId("btnExitFullScreenHdr").setVisible(false);
            //         }

            //         this._tableRendered = "gmcTab";
            //     }
            //     else {
            //         if (arg2 === "Max") {
            //             // this.byId("fixFlexGMC").setProperty("fixContentSize", "0%");
            //             this.byId("gmcTab").setVisible(false);
            //             this.byId("btnFullScreenAttr").setVisible(false);
            //             this.byId("btnExitFullScreenAttr").setVisible(true);
            //             this.byId("btnFullScreenMatl").setVisible(false);
            //             this.byId("btnExitFullScreenMatl").setVisible(true);
            //             this.byId("btnFullScreenCusMat").setVisible(false);
            //             this.byId("btnExitFullScreenCusMat").setVisible(true);
            //         }
            //         else {
            //             // this.byId("fixFlexGMC").setProperty("fixContentSize", "50%");
            //             this.byId("gmcTab").setVisible(true);
            //             this.byId("btnFullScreenAttr").setVisible(true);
            //             this.byId("btnExitFullScreenAttr").setVisible(false);
            //             this.byId("btnFullScreenMatl").setVisible(true);
            //             this.byId("btnExitFullScreenMatl").setVisible(false);
            //             this.byId("btnFullScreenCusMat").setVisible(true);
            //             this.byId("btnExitFullScreenCusMat").setVisible(false);
            //         }   
                    
            //         if (arg1 === "Attr") this._tableRendered = "attributesTab";
            //         else if (arg1 === "Matl") this._tableRendered = "materialsTab";
            //         else if (arg1 === "CusMat") this._tableRendered = "cusmatTab";
            //     }
            // },

            onTableResize: function(oEvent) {
                var oSplitter = this.byId("splitterMain");
                var oHeaderPane = oSplitter.getRootPaneContainer().getPanes().at(0);
                var oDetailPane = oSplitter.getRootPaneContainer().getPanes().at(1);
                var vFullScreen = oEvent.getSource().data("Fullscreen") === "1" ? true : false;
                var vPart = oEvent.getSource().data("Part");
                var vHeaderSize = oEvent.getSource().data("HeaderSize");
                var vDetailSize = oEvent.getSource().data("DetailSize");

                this._sActiveTable = oEvent.getSource().data("TableId");
                this.getView().getModel("ui").setProperty("/fullscreen/" + vPart, vFullScreen);
                this.byId("smartFilterBar").setVisible(!vFullScreen);

                var oHeaderLayoutData = new sap.ui.layout.SplitterLayoutData({
                    size: vHeaderSize,
                    resizable: !vFullScreen
                });

                var oDetailLayoutData = new sap.ui.layout.SplitterLayoutData({
                    size: vDetailSize,
                    resizable: !vFullScreen
                });

                document.getElementsByClassName("sapUiLoSplitterBar")[0].setAttribute("style", "display: " + (vFullScreen ? "none" : "flex"));

                oHeaderPane.setLayoutData(oHeaderLayoutData);
                oDetailPane.setLayoutData(oDetailLayoutData);
            },

            onNew() {
                if (this.getView().getModel("ui").getData().dataMode === "READ" && this._appAction !== "display") {
                    if (this._sActiveTable === "gmcTab") { this.onCreateGMC(); }
                    if (this._sActiveTable === "cusmatTab") { this.onCreateCusMat(); }
                }
            },

            onEdit() {
                if (this.getView().getModel("ui").getData().dataMode === "READ" && this._appAction !== "display") {
                    if (this._sActiveTable === "gmcTab") { this.onEditGMC(); }
                    else if (this._sActiveTable === "attributesTab") { this.onEditAttr(); }
                    else if (this._sActiveTable === "cusmatTab") { this.onEditCusMat(); }
                }
            },
            
            onDelete() {
                if (this.getView().getModel("ui").getData().dataMode === "READ" && this._appAction !== "display") {
                    if (this._sActiveTable === "gmcTab") { this.onDeleteGMC(); }
                    if (this._sActiveTable === "cusmatTab") { this.onDeleteCusMat(); }
                }
            },
            
            onDeleteCusMat() {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oTable = this.byId("cusmatTab");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = this.getView().getModel("cusmat").getData().results;

                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["update"]);
                
                var mParameters = {
                    "groupId":"update"
                }

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    aSelIndices = oTmpSelectedIndices;

                    MessageBox.confirm("Proceed to delete " + aSelIndices.length + " record(s)?", {
                        actions: ["Yes", "No"],
                        onClose: function (sAction) {
                            if (sAction === "Yes") {
                                me.showLoadingDialog('Processing...');

                                // if (me.byId(me._sActiveTable).getBinding("rows").aFilters.length > 0) {
                                //     me._aColFilters = me.byId(me._sActiveTable).getBinding("rows").aFilters;
                                // }
            
                                // if (me.byId(me._sActiveTable).getBinding("rows").aSorters.length > 0) {
                                //     me._aColSorters = me.byId(me._sActiveTable).getBinding("rows").aSorters;
                                // }

                                aSelIndices.forEach(item => {
                                    var entitySet = "GMCCustMaterialSet(";
                                    var iKeyCount = me._aColumns["cusmat"].filter(col => col.key === true).length;
                                    var itemValue;

                                    me._aColumns["cusmat"].forEach(col => {
                                        if (col.DataType === "DATETIME") {
                                            itemValue = sapDateFormat.format(new Date(aData.at(item)[col.ColumnName])) + "T00:00:00";
                                        } 
                                        else if (col.DataType === "BOOLEAN") {
                                            param[col.ColumnName] = aData.at(item)[col.ColumnName] === true ? "X" : "";
                                        }
                                        else {
                                            itemValue = aData.at(item)[col.ColumnName];
                                        }

                                        if (iKeyCount === 1) {
                                            if (col.key)
                                                entitySet += "'" + itemValue + "'"
                                        }
                                        else if (iKeyCount > 1) {
                                            if (col.key) {
                                                entitySet += col.ColumnName + "='" + itemValue + "',"
                                            }
                                        }
                                    })
                
                                    if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
                                    entitySet += ")";
                
                                    // console.log(entitySet);
                                    // console.log(param);
                                    oModel.remove("/" + encodeURIComponent(entitySet), mParameters);
                                })
            
                                oModel.submitChanges({
                                    groupId: "update",
                                    success: function (oData, oResponse) {
                                        me.closeLoadingDialog()
                                        // me.refreshData();
                                        aSelIndices.sort((a, b) => -1);
                                        // console.log(aSelIndices)

                                        aSelIndices.forEach(item => {
                                            aData.splice(item, 1);
                                        })

                                        // console.log(aData);

                                        me.getView().getModel("cusmat").setProperty("/results/", aData);

                                        // if (me._aColFilters.length > 0) { me.setColumnFilters(me._sActiveTable); }
                                        // if (me._aColSorters.length > 0) { me.setColumnSorters(me._sActiveTable); }

                                        me.getView().getModel("counts").setProperty("/cusmat", aData.length);

                                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_DELETED"]);
                                    },
                                    error: function () {
                                        me.closeLoadingDialog();
                                    }
                                }) 
                            }
                        }                        
                    })
                }   
                else {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                }       
            },

            onSave() {
                if (this.getView().getModel("ui").getData().dataMode === "NEW" || this.getView().getModel("ui").getData().dataMode === "EDIT") {
                    if (this._sActiveTable === "gmcTab") { this.onSaveChanges("gmc"); }
                    else if (this._sActiveTable === "attributesTab") { this.onSaveChanges("attributes"); }
                    else if (this._sActiveTable === "cusmatTab") { this.onSaveChanges("cusmat"); }
                }
            },
            
            onCancel() {
                if (this.getView().getModel("ui").getData().dataMode === "NEW" || this.getView().getModel("ui").getData().dataMode === "EDIT") {
                    if (this._sActiveTable === "gmcTab") this.onCancelGMC();
                    else if (this._sActiveTable === "attributesTab") this.onCancelAttr();
                    else if (this._sActiveTable === "cusmatTab") this.onCancelCusMat();
                }
            },           

            onRefresh() {
                if (this.getView().getModel("ui").getData().dataMode === "READ") {
                    if (this._sActiveTable === "gmcTab") this.onRefreshGMC();
                    else if (this._sActiveTable === "attributesTab") this.onRefreshAttr();
                    else if (this._sActiveTable === "materialsTab") this.onRefreshMatl();
                    else if (this._sActiveTable === "cusmatTab") this.onRefreshCusMat();
                }
            }, 

            onCreateGMC() {
                this._oTmpAttrib = {};
                this.byId("btnAddGMC").setVisible(false);
                this.byId("btnAddRowGMC").setVisible(true);
                this.byId("btnRemoveRowGMC").setVisible(true);
                this.byId("btnEditGMC").setVisible(false);
                this.byId("btnSaveGMC").setVisible(true);
                this.byId("btnCancelGMC").setVisible(true);
                this.byId("btnDeleteGMC").setVisible(false);
                this.byId("btnRefreshGMC").setVisible(false);
                this.byId("btnSortGMC").setVisible(false);
                // this.byId("btnFilterGMC").setVisible(false);
                // this.byId("btnFullScreenHdr").setVisible(false);
                // this.byId("btnExitFullScreenHdr").setVisible(false);
                // this.byId("btnColPropGMC").setVisible(false);
                this.byId("searchFieldGMC").setVisible(false);
                // this.onTableResize("Hdr","Max");
                this.byId("btnTabLayoutGMC").setVisible(false);
                this.byId("btnDataWrapGMC").setVisible(false);
                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("gmc").getData());
                this.byId("cboxSBU").setEnabled(false);
                // this.setScreenSize("header", true, "100%", "0%");
                var _this = this;

                this.byId("btnEditAttr").setVisible(false);
                this.byId("btnRefreshAttr").setVisible(false);
                this.byId("btnSortAttr").setVisible(false);
                this.byId("searchFieldAttr").setVisible(false);
                this.byId("btnTabLayoutAttr").setVisible(false);
                this.byId("btnDataWrapAttr").setVisible(false);
                this.byId("smartFilterBar").setVisible(false);

                this.getView().getModel("ui").setProperty("/activeGmc", "New");

                var oIconTabBar = this.byId("itbDetail");
                oIconTabBar.setSelectedKey("attributes");
                oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                    .forEach(item => item.setProperty("enabled", false)); 

                var me = this;
                var aNewRow = [];
                var oNewRow = {};
                var oTable = this.byId("gmcTab");
                oTable.focus();
                var iCellIndexToFocus = -1;
                this._setFocusInput = false;

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

                    if (isFiltered) {
                        oColumns[i].filter("");
                    }
                }
                
                var oInputEventDelegate = {
                    onkeydown: function(oEvent) {
                        me.onInputKeyDown(oEvent);
                    },

                    onclick: function(oEvent) {
                        me.onInputFocus(oEvent);
                    }
                };

                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns["gmc"].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (!ci.hideOnChange && (ci.creatable || ci.updatable)) {
                                if (ci.type === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{gmc>" + ci.name + "}", editable: true}));
                                }
                                else if (ci.valueHelp["show"]) {
                                    var bValueFormatter = true;
                                    // var sSuggestItemText = ci.ValueHelp["SuggestionItems"].text;
                                    // var sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '';                                    
                                    var sTextFormatMode = "Key";

                                    if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                                        sTextFormatMode = ci.TextFormatMode;
                                        // bValueFormatter = true;

                                        // if (ci.ValueHelp["SuggestionItems"].additionalText && ci.ValueHelp["SuggestionItems"].text !== ci.ValueHelp["SuggestionItems"].additionalText) {
                                        //     if (sTextFormatMode === "ValueKey" || sTextFormatMode === "Value") {
                                        //         sSuggestItemText = ci.ValueHelp["SuggestionItems"].additionalText;
                                        //         sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].text;
                                        //     }
                                        // }
                                    }

                                    var oColumns = [], oCells = [];

                                    //assign first cell to key/code
                                    this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Key === true).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    //assign second cell to display value/description
                                    this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Key === false && fItem.Value === true).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    //add other column info
                                    this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Visible === true && fItem.Key === false && fItem.Value === false).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] }),
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    var oInput = new sap.m.Input({
                                        type: "Text",
                                        showValueHelp: true,
                                        valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                                        showSuggestion: true,
                                        maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].maxSuggestionWidth !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                        // suggestionItems: {
                                        //     path: ci.ValueHelp["SuggestionItems"].path,
                                        //     length: 10000,
                                        //     template: new sap.ui.core.ListItem({
                                        //         key: ci.ValueHelp["SuggestionItems"].text,
                                        //         text: sSuggestItemText,
                                        //         additionalText: sSuggestItemAddtlText,
                                        //     }),
                                        //     templateShareable: false
                                        // },
                                        suggestionColumns: oColumns,
                                        suggestionRows: {
                                            path: ci.ValueHelp["SuggestionItems"].path,
                                            template: new sap.m.ColumnListItem({
                                                cells: oCells
                                            }),
                                            length: 10000,
                                            templateShareable: false
                                        },
                                        suggest: this.onInputSuggest.bind(this),
                                        suggestionItemSelected: this.onInputSuggestionItemSelected.bind(this),
                                        change: this.onValueHelpLiveInputChange.bind(this)
                                    })

                                    oInput.setSuggestionRowValidator(this.suggestionRowValidator);

                                    if (bValueFormatter) {
                                        oInput.setProperty("textFormatMode", sTextFormatMode)

                                        oInput.bindValue({  
                                            parts: [{ path: "gmc>" + ci.name }, { value: ci.ValueHelp["items"].path }, { value: ci.ValueHelp["items"].value }, { value: ci.ValueHelp["items"].text }, { value: sTextFormatMode }],
                                            formatter: this.formatValueHelp.bind(this)
                                        });
                                    }
                                    else {
                                        oInput.bindValue({  
                                            parts: [  
                                                { path: "gmc>" + ci.name }
                                            ]
                                        });
                                    }

                                    oInput.addEventDelegate(oInputEventDelegate);
                                    // oInput.addEventDelegate({
                                    //     onAfterRendering: function(oEvent) {
                                    //         if (!me._setFocusInput) {
                                    //             me._setFocusInput = true;
                                    //             console.log(oEvent);
                                    //             // oInput.focus();
                                    //             oEvent.srcControl.focus();
                                    //             // $("#" + oEvent.srcControl.sId + "-inner").focus();
                                    //             // me.byId(oEvent.srcControl.sId + "-inner").focus();
                                    //         }
                                    //     }
                                    // });

                                    col.setTemplate(oInput);

                                    // var oInput = new sap.m.Input({
                                    //     // id: "ipt" + ci.name,
                                    //     type: "Text",
                                    //     value: "{gmc>" + ci.name + "}",
                                    //     maxLength: +ci.maxLength,
                                    //     showValueHelp: true,
                                    //     // valueHelpRequest: this.handleValueHelp.bind(this),
                                    //     valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                                    //     showSuggestion: true,
                                    //     maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                    //     suggestionItems: {
                                    //         path: ci.valueHelp["suggestionItems"].path,
                                    //         length: 10000,
                                    //         template: new sap.ui.core.ListItem({
                                    //             key: ci.valueHelp["suggestionItems"].text,
                                    //             text: ci.valueHelp["suggestionItems"].text,
                                    //             additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                    //         }),
                                    //         templateShareable: false
                                    //     },
                                    //     change: this.onValueHelpLiveInputChange.bind(this)
                                    // })

                                    // col.setTemplate(oInput);
                                }
                                else if (ci.type === "NUMBER") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        liveChange: this.onNumberLiveChange.bind(this),
                                        value: {
                                            path: "gmc>" + ci.name,
                                            // type: "sap.ui.model.odata.type.Decimal",
                                            formatOptions: { 
                                                minFractionDigits: ci.scale, 
                                                maxFractionDigits: ci.scale  
                                            },
                                            constraints: { 
                                                precision: ci.precision + ci.scale, 
                                                scale: ci.scale
                                            }
                                        }
                                    }));
                                }
                                else {
                                    if (ci.name !== "DESCZH") {
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
                            }

                            if (ci.required) {
                                col.getLabel().addStyleClass("sapMLabelRequired");

                            }

                            if (ci.type === "STRING") oNewRow[ci.name] = "";
                            else if (ci.type === "NUMBER") oNewRow[ci.name] = 0;
                            else if (ci.type === "BOOLEAN") oNewRow[ci.name] = false;
                        })
                })

                oNewRow["UMREN"] = "1";
                oNewRow["UMREZ"] = "1";
                oNewRow["TMPGMC"] = "1";
                oNewRow["DESC"] = "";
                oNewRow["New"] = true;
                aNewRow.push(oNewRow);

                this.getView().getModel("gmc").setProperty("/results", aNewRow);
                this.getView().getModel("ui").setProperty("/dataMode", "NEW");
                this.getView().getModel("ui").setProperty("/updTable", "gmc");
                this.getView().getModel("ui").setProperty("/activeTmpGmc", "1");
                this.getView().getModel("ui").setProperty("/activeTmpMattyp", "");

                aNewRow = [];
                oNewRow = {};
                
                // oNewRow["SEQ"] = "1";
                // oNewRow["New"] = true;
                // aNewRow.push(oNewRow);
                this.getView().getModel("attributes").setProperty("/results", aNewRow);

                setTimeout(() => {
                    this.byId("gmcTab").getRows()[0].getCells().forEach(cell => {
                        if (cell.getBindingInfo("value") !== undefined && !this._setFocusInput) {
                            this._setFocusInput = true;
                            cell.focus();
                        }
                    })
                }, 1);

                if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(true); }

                oTable = this.byId("attributesTab");

                if (oTable.getBinding().aFilters.length > 0) {
                    // this._aFiltersBeforeChange = jQuery.extend(true, [], oTable.getBinding().aFilters);
                    oTable.getBinding().aFilters = [];
                }
                
                oColumns = oTable.getColumns();

                for (var i = 0, l = oColumns.length; i < l; i++) {
                    var isFiltered = oColumns[i].getFiltered();

                    if (isFiltered) {
                        oColumns[i].filter("");
                    }
                }

                oTable.getColumns().forEach((col, idx) => {
                    var oValueHelp = false;

                    _this._aColumns["attributes"].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            // console.log(ci)
                            if (!ci.hideOnChange && (ci.creatable || ci.updatable)) {
                                if (ci.ValueHelp !== undefined) oValueHelp = ci.ValueHelp["show"];

                                if (ci.type === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{attributes>" + ci.name + "}", editable: true}));
                                }
                                else if (oValueHelp) {
                                    var bValueFormatter = true;
                                    var sTextFormatMode = "Key";

                                    if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                                        sTextFormatMode = ci.TextFormatMode;
                                    }
                                    
                                    var oInput;
                                    var oColumns = [], oCells = [];

                                    //assign first cell to key/code
                                    _this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Key === true).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: _this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    //assign second cell to display value/description
                                    _this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Key === false && fItem.Value === true).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: _this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    //add other column info
                                    _this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Visible === true && fItem.Key === false && fItem.Value === false).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: _this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] }),
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    if (ci.name === "ATTRIBCD") {
                                        oInput = new sap.m.Input({
                                            type: "Text",
                                            showValueHelp: true,
                                            valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(_this),
                                            showSuggestion: true,
                                            maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].maxSuggestionWidth !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                            suggest: _this.onInputSuggest.bind(_this),
                                            suggestionItemSelected: _this.onInputSuggestionItemSelected.bind(_this),
                                            change: _this.onValueHelpLiveInputChange.bind(_this)
                                        })
                                    }
                                    else {
                                        oInput = new sap.m.Input({
                                            type: "Text",
                                            showValueHelp: true,
                                            valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(_this),
                                            showSuggestion: true,
                                            maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].maxSuggestionWidth !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                            suggestionColumns: oColumns,
                                            suggestionRows: {
                                                path: ci.ValueHelp["SuggestionItems"].path,
                                                template: new sap.m.ColumnListItem({
                                                    cells: oCells
                                                }),
                                                length: 10000,
                                                templateShareable: false
                                            },
                                            suggest: _this.onInputSuggest.bind(_this),
                                            suggestionItemSelected: _this.onInputSuggestionItemSelected.bind(_this),
                                            change: _this.onValueHelpLiveInputChange.bind(_this)
                                        })
                                    }

                                    oInput.setSuggestionRowValidator(_this.suggestionRowValidator);

                                    if (bValueFormatter) {
                                        oInput.setProperty("textFormatMode", sTextFormatMode)

                                        oInput.bindValue({  
                                            parts: [{ path: "attributes>" + ci.name }, { value: ci.ValueHelp["items"].path }, { value: ci.ValueHelp["items"].value }, { value: ci.ValueHelp["items"].text }, { value: sTextFormatMode }],
                                            formatter: _this.formatValueHelp.bind(_this)
                                        });
                                    }
                                    else {
                                        oInput.bindValue({  
                                            parts: [  
                                                { path: "attributes>" + ci.name }
                                            ]
                                        });
                                    }

                                    oInput.addEventDelegate(oInputEventDelegate);
                                    col.setTemplate(oInput);
                                }
                                else if (ci.type === "NUMBER") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        liveChange: _this.onNumberLiveChange.bind(_this),
                                        value: {
                                            path: "attributes>" + ci.name,
                                            // type: "sap.ui.model.odata.type.Decimal",
                                            formatOptions: { 
                                                minFractionDigits: ci.scale, 
                                                maxFractionDigits: ci.scale  
                                            },
                                            constraints: { 
                                                precision: ci.precision + ci.scale, 
                                                scale: ci.scale
                                            }
                                        }
                                    }).addEventDelegate(oInputEventDelegate));
                                }
                                else {
                                    if (ci.maxLength !== null) {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{attributes>" + ci.name + "}",
                                            maxLength: +ci.maxLength,
                                            liveChange: _this.onInputLiveChange.bind(_this)
                                        }).addEventDelegate(oInputEventDelegate));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{attributes>" + ci.name + "}",
                                            liveChange: _this.onInputLiveChange.bind(_this)
                                        }).addEventDelegate(oInputEventDelegate));
                                    }
                                }                                
                            }

                            if (ci.required) {
                                // col.getLabel().setProperty("required", true);
                                col.getLabel().addStyleClass("sapMLabelRequired");
                            }
                        })
                })
            },

            onAddRow: function(oEvent) {
                var bProceed = true;

                this._aColumns[this._sActiveTable.replace("Tab", "")].filter(fItem => fItem.required).forEach(item => {
                    this.getView().getModel(this._sActiveTable.replace("Tab", "")).getData().results.forEach(r => {
                        if (r[item.name] === "") {
                            bProceed = false;
                        }
                    })
                })

                if (!bProceed) {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
                    return;
                }

                var aNewRows = this.getView().getModel(this._sActiveTable.replace("Tab", "")).getData().results.filter(item => item.New === true);
                var oNewRow = {};

                if (this._sActiveTable === "gmcTab") {
                    oNewRow["CUSMATCD"] = "";
                    oNewRow["ISSUOM"] = "";
                    oNewRow["VOLUOM"] = "";
                    oNewRow["WTUOM"] = "";
                    oNewRow["EKWSL"] = "";
                    oNewRow["GRSWT"] = "0";
                    oNewRow["NETWT"] = "0";
                    oNewRow["VOLUME"] = "0";
                    oNewRow["UNTTO"] = "0";
                    oNewRow["UEBTO"] = "0";
                    oNewRow["UMREN"] = "1";
                    oNewRow["UMREZ"] = "1";
                    oNewRow["DESC"] = "";
                    oNewRow["TMPGMC"] = aNewRows.length + 1 + "";
                }
                else {
                    oNewRow["GMC"] = this.getView().getModel("ui").getData().activeGmc;
                }

                oNewRow["New"] = true;
                aNewRows.push(oNewRow);

                if (this._sActiveTable === "gmcTab") {
                    this.getView().getModel("ui").setProperty("/activeTmpGmc", aNewRows.length + "");
                    this.getView().getModel("attributes").setProperty("/results", []);
                }

                this.getView().getModel(this._sActiveTable.replace("Tab", "")).setProperty("/results", aNewRows);
                this._setFocusInput = false;

                setTimeout(() => {
                    this.byId(this._sActiveTable).getRows()[aNewRows.length - 1].getCells().forEach(cell => {
                        if (cell.getBindingInfo("value") !== undefined && !this._setFocusInput) {
                            this._setFocusInput = true;
                            cell.focus();
                        }
                    })
                }, 1);
            },

            onRemoveRow: function(oEvent) {
                var oTable = this.byId(this._sActiveTable);
                var oData = this.getView().getModel(this._sActiveTable.replace("Tab", "")).getData().results.filter(item => item.New === true);
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var bProceed = false;

                if (oData.length === 0) {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_RECORD_TO_REMOVE"]);
                    return;
                }

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    aSelIndices = oTmpSelectedIndices;
                    aSelIndices.sort((a, b) => (a < b ? 1 : -1));

                    aSelIndices.forEach((item, index) => {
                        var idxToRemove = oData.indexOf(oData.at(item));

                        oData.splice(idxToRemove, 1);
                        bProceed = true;
                    })

                    if (bProceed) {
                        this.getView().getModel(this._sActiveTable.replace("Tab", "")).setProperty("/results", oData);
                        oTable.clearSelection();

                        if (this._sActiveTable === "gmcTab") {
                            if (oData.length === 0) {
                                this.getView().getModel("attributes").setProperty("/results", []);
                            }
                            else {
                                var sTmpGMC = oData[0].TMPGMC;
                                this.getView().getModel("attributes").setProperty("/results", this._oTmpAttrib[sTmpGMC]);
                            }
                        }
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_TO_REMOVE"])
                    }
                }
                else {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_TO_REMOVE"]);   
                }
            },

            setScreenSize(part, isFullscreen, headerSize, detailSize) {
                var oSplitter = this.byId("splitterMain");
                var oFirstPane = oSplitter.getRootPaneContainer().getPanes().at(0);
                var oSecondPane = oSplitter.getRootPaneContainer().getPanes().at(1);

                this.getView().getModel("ui").setProperty("/fullscreen/" + part, isFullscreen);
                // this.getView().getModel("ui").setProperty("/splitter/header", headerSize);
                // this.getView().getModel("ui").setProperty("/splitter/detail", detailSize);
                if (isFullscreen) {
                    this.byId("smartFilterBar").setVisible(false);

                    var oLayoutDataMax = new sap.ui.layout.SplitterLayoutData({
                        size: "100%",
                        resizable: false
                    });

                    var oLayoutDataMin = new sap.ui.layout.SplitterLayoutData({
                        size: "0%",
                        resizable: false
                    });

                    if (part === "header") {
                        oFirstPane.setLayoutData(oLayoutDataMax);
                        oSecondPane.setLayoutData(oLayoutDataMin);
                    }
                    else {
                        oSecondPane.setLayoutData(oLayoutDataMax);
                        oFirstPane.setLayoutData(oLayoutDataMin);
                    }
                }
                else {
                    // this.byId("splitterMain").setProperty("height", "99%");
                    this.byId("smartFilterBar").setVisible(true);

                    var oLayoutDataHdr = new sap.ui.layout.SplitterLayoutData({
                        size: "46%",
                        resizable: true
                    });

                    oFirstPane.setLayoutData(oLayoutDataHdr);

                    var oLayoutDataDtl = new sap.ui.layout.SplitterLayoutData({
                        size: "54%",
                        resizable: true
                    });

                    oSecondPane.setLayoutData(oLayoutDataDtl);
                }
            },

            onCreateCusMat() {
                this.byId("btnAddCusMat").setVisible(false);
                this.byId("btnAddRowCusMat").setVisible(true);
                this.byId("btnRemoveRowCusMat").setVisible(true);
                this.byId("btnEditCusMat").setVisible(false);
                this.byId("btnDeleteCusMat").setVisible(false);
                this.byId("btnSaveCusMat").setVisible(true);
                this.byId("btnCancelCusMat").setVisible(true);
                this.byId("btnRefreshCusMat").setVisible(false);
                this.byId("btnFullScreenCusMat").setVisible(false);
                // this.onTableResize("CusMat","Max");
                this.byId("btnExitFullScreenCusMat").setVisible(false);
                this.byId("btnTabLayoutCusMat").setVisible(false);
                this.byId("btnDataWrapCusMat").setVisible(false);
                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("cusmat").getData());
                this.setScreenSize("detail", true, "0%", "100%");

                var oIconTabBar = this.byId("itbDetail");
                oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                    .forEach(item => item.setProperty("enabled", false));

                var me = this;
                var aNewRow = [];
                var oNewRow = {};
                var oTable = this.byId("cusmatTab");
                var iCellIndexToFocus = -1;

                if (oTable.getBinding("rows").aApplicationFilters.length > 0) {
                    this._aMultiFiltersBeforeChange = this._aFilterableColumns["cusmat"].filter(fItem => fItem.value !== "");                   
                    oTable.getBinding("rows").filter("", "Application");
                }
                
                if (oTable.getBinding().aFilters.length > 0) {
                    this._aFiltersBeforeChange = jQuery.extend(true, [], oTable.getBinding().aFilters);
                    oTable.getBinding().aFilters = [];
                }
                
                var oColumns = oTable.getColumns();

                for (var i = 0, l = oColumns.length; i < l; i++) {
                    var isFiltered = oColumns[i].getFiltered();

                    if (isFiltered) {
                        oColumns[i].filter("");
                    }
                }
                
                var oInputEventDelegate = {
                    onkeydown: function(oEvent){
                        me.onInputKeyDown(oEvent);
                    },
                };

                oTable.getColumns().forEach((col, idx) => {
                    this._aColumns["cusmat"].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (!ci.hideOnChange && (ci.creatable || ci.updatable)) {
                                if (ci.type === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({selected: "{cusmat>" + ci.name + "}", editable: true}));
                                }
                                else if (ci.valueHelp["show"]) {
                                    var bValueFormatter = true;
                                    // var sSuggestItemText = ci.ValueHelp["SuggestionItems"].text;
                                    // var sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '';                                    
                                    var sTextFormatMode = "Key";

                                    if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                                        sTextFormatMode = ci.TextFormatMode;
                                        // bValueFormatter = true;

                                        // if (ci.ValueHelp["SuggestionItems"].additionalText && ci.ValueHelp["SuggestionItems"].text !== ci.ValueHelp["SuggestionItems"].additionalText) {
                                        //     if (sTextFormatMode === "ValueKey" || sTextFormatMode === "Value") {
                                        //         sSuggestItemText = ci.ValueHelp["SuggestionItems"].additionalText;
                                        //         sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].text;
                                        //     }
                                        // }
                                    }

                                    var oColumns = [], oCells = [];

                                    //assign first cell to key/code
                                    this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Key === true).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    //assign second cell to display value/description
                                    this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Key === false && fItem.Value === true).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    //add other column info
                                    this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Visible === true && fItem.Key === false && fItem.Value === false).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] }),
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    var oInput = new sap.m.Input({
                                        type: "Text",
                                        showValueHelp: true,
                                        valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                                        showSuggestion: true,
                                        maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].maxSuggestionWidth !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                        // suggestionItems: {
                                        //     path: ci.ValueHelp["SuggestionItems"].path,
                                        //     length: 10000,
                                        //     template: new sap.ui.core.ListItem({
                                        //         key: ci.ValueHelp["SuggestionItems"].text,
                                        //         text: sSuggestItemText,
                                        //         additionalText: sSuggestItemAddtlText,
                                        //     }),
                                        //     templateShareable: false
                                        // },
                                        suggestionColumns: oColumns,
                                        suggestionRows: {
                                            path: ci.ValueHelp["SuggestionItems"].path,
                                            template: new sap.m.ColumnListItem({
                                                cells: oCells
                                            }),
                                            length: 10000,
                                            templateShareable: false
                                        },
                                        suggest: this.onInputSuggest.bind(this),
                                        suggestionItemSelected: this.onInputSuggestionItemSelected.bind(this),
                                        change: this.onValueHelpLiveInputChange.bind(this)
                                    })

                                    oInput.setSuggestionRowValidator(this.suggestionRowValidator);

                                    if (bValueFormatter) {
                                        oInput.setProperty("textFormatMode", sTextFormatMode)

                                        oInput.bindValue({  
                                            parts: [{ path: "cusmat>" + ci.name }, { value: ci.ValueHelp["items"].path }, { value: ci.ValueHelp["items"].value }, { value: ci.ValueHelp["items"].text }, { value: sTextFormatMode }],
                                            formatter: this.formatValueHelp.bind(this)
                                        });
                                    }
                                    else {
                                        oInput.bindValue({  
                                            parts: [  
                                                { path: "cusmat>" + ci.name }
                                            ]
                                        });
                                    }

                                    oInput.addEventDelegate(oInputEventDelegate);

                                    col.setTemplate(oInput);

                                    // var oInput = new sap.m.Input({
                                    //     // id: "ipt" + ci.name,
                                    //     type: "Text",
                                    //     value: "{gmc>" + ci.name + "}",
                                    //     maxLength: +ci.maxLength,
                                    //     showValueHelp: true,
                                    //     // valueHelpRequest: this.handleValueHelp.bind(this),
                                    //     valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                                    //     showSuggestion: true,
                                    //     maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                    //     suggestionItems: {
                                    //         path: ci.valueHelp["suggestionItems"].path,
                                    //         length: 10000,
                                    //         template: new sap.ui.core.ListItem({
                                    //             key: ci.valueHelp["suggestionItems"].text,
                                    //             text: ci.valueHelp["suggestionItems"].text,
                                    //             additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                    //         }),
                                    //         templateShareable: false
                                    //     },
                                    //     change: this.onValueHelpLiveInputChange.bind(this)
                                    // })

                                    // col.setTemplate(oInput);
                                }
                                else if (ci.type === "NUMBER") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        liveChange: this.onNumberLiveChange.bind(this),
                                        value: {
                                            path: "cusmat>" + ci.name,
                                            // type: "sap.ui.model.odata.type.Decimal",
                                            formatOptions: { 
                                                minFractionDigits: ci.scale, 
                                                maxFractionDigits: ci.scale  
                                            },
                                            constraints: { 
                                                precision: ci.precision + ci.scale, 
                                                scale: ci.scale
                                            }
                                        }
                                    }));
                                }
                                else {
                                    if (ci.maxLength !== null) {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{cusmat>" + ci.name + "}", 
                                            maxLength: +ci.maxLength,
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{cusmat>" + ci.name + "}", 
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }
                            }

                            if (ci.required) {
                                col.getLabel().addStyleClass("sapMLabelRequired");
                            }

                            if (ci.type === "STRING") oNewRow[ci.name] = "";
                            else if (ci.type === "NUMBER") oNewRow[ci.name] = 0;
                            else if (ci.type === "BOOLEAN") oNewRow[ci.name] = false;
                        })
                })

                oNewRow["GMC"] = this.getView().getModel("ui").getData().activeGmc;
                oNewRow["New"] = true;
                aNewRow.push(oNewRow);
                this.getView().getModel("cusmat").setProperty("/results", aNewRow);
                this.getView().getModel("ui").setProperty("/dataMode", "NEW");
                this.getView().getModel("ui").setProperty("/updTable", "cusmat");

                oTable.focus();
                this._setFocusInput = false;

                setTimeout(() => {
                    this.byId(this._sActiveTable).getRows()[aNewRow.length - 1].getCells().forEach(cell => {
                        if (cell.getBindingInfo("value") !== undefined && !this._setFocusInput) {
                            this._setFocusInput = true;
                            cell.focus();
                        }
                    })
                }, 1);

                if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(true); }
            },

            onEditCusMat() {
                if (this.getView().getModel("cusmat").getData().results.length === 0) {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_EDIT"]);
                    return;
                }

                this.byId("btnAddCusMat").setVisible(false);
                this.byId("btnEditCusMat").setVisible(false);
                this.byId("btnDeleteCusMat").setVisible(false);
                this.byId("btnSaveCusMat").setVisible(true);
                this.byId("btnCancelCusMat").setVisible(true);
                this.byId("btnRefreshCusMat").setVisible(false);
                this.byId("btnFullScreenCusMat").setVisible(false);
                // this.onTableResize("CusMat","Max");
                this.byId("btnExitFullScreenCusMat").setVisible(false);
                this.byId("btnTabLayoutCusMat").setVisible(false);
                this.byId("btnDataWrapCusMat").setVisible(false);
                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("cusmat").getData());
                this.setScreenSize("detail", true, "0%", "100%");

                var oIconTabBar = this.byId("itbDetail");
                oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                    .forEach(item => item.setProperty("enabled", false));

                var me = this;
                var oTable = this.byId("cusmatTab");
                var iCellIndexToFocus = -1;

                // if (oTable.getBinding("rows").aApplicationFilters.length > 0) {
                //     this._aMultiFiltersBeforeChange = this._aFilterableColumns["cusmat"].filter(fItem => fItem.value !== "");                   
                //     oTable.getBinding("rows").filter("", "Application");
                // }
                
                // if (oTable.getBinding().aFilters.length > 0) {
                //     this._aFiltersBeforeChange = jQuery.extend(true, [], oTable.getBinding().aFilters);
                //     oTable.getBinding().aFilters = [];
                // }
                
                // var oColumns = oTable.getColumns();

                // for (var i = 0, l = oColumns.length; i < l; i++) {
                //     var isFiltered = oColumns[i].getFiltered();

                //     if (isFiltered) {
                //         oColumns[i].filter("");
                //     }
                // }
                
                // var oInputEventDelegate = {
                //     onkeydown: function(oEvent){
                //         me.onInputKeyDown(oEvent);
                //     },
                // };

                // oTable.getColumns().forEach((col, idx) => {
                //     this._aColumns["cusmat"].filter(item => item.label === col.getLabel().getText())
                //         .forEach(ci => {
                //             if (!ci.hideOnChange && ci.updatable) {
                //                 if (ci.type === "BOOLEAN") {
                //                     col.setTemplate(new sap.m.CheckBox({selected: "{cusmat>" + ci.name + "}", editable: true}));
                //                 }
                //                 else if (ci.valueHelp["show"]) {
                //                     var bValueFormatter = true;
                //                     // var sSuggestItemText = ci.ValueHelp["SuggestionItems"].text;
                //                     // var sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '';                                    
                //                     var sTextFormatMode = "Key";

                //                     if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                //                         sTextFormatMode = ci.TextFormatMode;
                //                     }

                //                     var oColumns = [], oCells = [];

                //                     //assign first cell to key/code
                //                     this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Key === true).forEach(item => {
                //                         oColumns.push(new sap.m.Column({
                //                             header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                //                         }))

                //                         oCells.push(new sap.m.Text({
                //                             text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                //                         }))
                //                     })

                //                     //assign second cell to display value/description
                //                     this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Key === false && fItem.Value === true).forEach(item => {
                //                         oColumns.push(new sap.m.Column({
                //                             header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                //                         }))

                //                         oCells.push(new sap.m.Text({
                //                             text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                //                         }))
                //                     })

                //                     //add other column info
                //                     this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Visible === true && fItem.Key === false && fItem.Value === false).forEach(item => {
                //                         oColumns.push(new sap.m.Column({
                //                             header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] }),
                //                         }))

                //                         oCells.push(new sap.m.Text({
                //                             text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                //                         }))
                //                     })

                //                     var oInput = new sap.m.Input({
                //                         type: "Text",
                //                         showValueHelp: true,
                //                         valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                //                         showSuggestion: true,
                //                         maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].maxSuggestionWidth !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                //                         suggestionColumns: oColumns,
                //                         suggestionRows: {
                //                             path: ci.ValueHelp["SuggestionItems"].path,
                //                             template: new sap.m.ColumnListItem({
                //                                 cells: oCells
                //                             }),
                //                             length: 10000,
                //                             templateShareable: false
                //                         },
                //                         change: this.onValueHelpLiveInputChange.bind(this)
                //                     })

                //                     oInput.setSuggestionRowValidator(this.suggestionRowValidator);

                //                     if (bValueFormatter) {
                //                         oInput.setProperty("textFormatMode", sTextFormatMode)

                //                         oInput.bindValue({  
                //                             parts: [{ path: "cusmat>" + ci.name }, { value: ci.ValueHelp["items"].path }, { value: ci.ValueHelp["items"].value }, { value: ci.ValueHelp["items"].text }, { value: sTextFormatMode }],
                //                             formatter: this.formatValueHelp.bind(this)
                //                         });
                //                     }
                //                     else {
                //                         oInput.bindValue({  
                //                             parts: [  
                //                                 { path: "cusmat>" + ci.name }
                //                             ]
                //                         });
                //                     }

                //                     oInput.addEventDelegate(oInputEventDelegate);

                //                     col.setTemplate(oInput);
                //                 }
                //                 else if (ci.type === "NUMBER") {
                //                     col.setTemplate(new sap.m.Input({
                //                         type: sap.m.InputType.Number,
                //                         textAlign: sap.ui.core.TextAlign.Right,
                //                         liveChange: this.onNumberLiveChange.bind(this),
                //                         value: {
                //                             path: "cusmat>" + ci.name,
                //                             // type: "sap.ui.model.odata.type.Decimal",
                //                             formatOptions: { 
                //                                 minFractionDigits: ci.scale, 
                //                                 maxFractionDigits: ci.scale  
                //                             },
                //                             constraints: { 
                //                                 precision: ci.precision + ci.scale, 
                //                                 scale: ci.scale
                //                             }
                //                         }
                //                     }));
                //                 }
                //                 else {
                //                     if (ci.maxLength !== null) {
                //                         col.setTemplate(new sap.m.Input({
                //                             value: "{cusmat>" + ci.name + "}", 
                //                             maxLength: +ci.maxLength,
                //                             liveChange: this.onInputLiveChange.bind(this)
                //                         }));
                //                     }
                //                     else {
                //                         col.setTemplate(new sap.m.Input({
                //                             value: "{cusmat>" + ci.name + "}", 
                //                             liveChange: this.onInputLiveChange.bind(this)
                //                         }));
                //                     }
                //                 }
                //             }

                //             if (ci.required) {
                //                 col.getLabel().addStyleClass("sapMLabelRequired");
                //             }
                //         })
                // })

                this.setRowEditMode("cusmat");
                this.getView().getModel("ui").setProperty("/dataMode", "EDIT");
                this.getView().getModel("ui").setProperty("/updTable", "cusmat");
                this._isCusMatEdited = false;
                
                // oTable.focus();
                if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(true); }
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
                                    // me.byId("btnFilterGMC").setVisible(false);
                                    me.byId("btnExitFullScreenHdr").setVisible(false);
                                    // me.byId("btnColPropGMC").setVisible(false);
                                    me.byId("searchFieldGMC").setVisible(false);
                                    // me.onTableResize("Hdr","Max");
                                    me.byId("btnExitFullScreenHdr").setVisible(false);
                                    me.byId("btnTabLayoutGMC").setVisible(false);
                                    me.byId("btnDataWrapGMC").setVisible(false);
                                    me.byId("cboxSBU").setEnabled(false);
                                    me.setScreenSize("header", true, "100%", "0%");

                                    me._oDataBeforeChange = jQuery.extend(true, {}, me.getView().getModel("gmc").getData());
                
                                    me.getView().getModel("gmc").setProperty("/results", aDataToEdit);
                                    me.setRowEditMode("gmc");
                    
                                    me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                    me.getView().getModel("ui").setProperty("/updTable", "gmc");
                                    me._isGMCEdited = false;
                                    if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(false); }
                                }
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
                                    if (data.results.length > 0) { 
                                        bWithMaterial = true; 
                                        aData.at(item).WMAT = true;
                                    }
                                    else {
                                        aData.at(item).WMAT = false;
                                    }

                                    aDataToEdit.push(aData.at(item));

                                    if (aSelIndices.length === iCounter) {
                                        if (!me._GMCDescZHAuth && aDataToEdit.filter(fItem => fItem.WMAT === false).length === 0) {
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
                                            // me.byId("btnFilterGMC").setVisible(false);
                                            me.byId("btnExitFullScreenHdr").setVisible(false);
                                            // me.byId("btnColPropGMC").setVisible(false);
                                            me.byId("searchFieldGMC").setVisible(false);
                                            // me.onTableResize("Hdr","Max");
                                            me.byId("btnExitFullScreenHdr").setVisible(false);
                                            me.byId("btnTabLayoutGMC").setVisible(false);
                                            me.byId("btnDataWrapGMC").setVisible(false);
                                            me.byId("cboxSBU").setEnabled(false);
                                            me.setScreenSize("header", true, "100%", "0%");

                                            me._oDataBeforeChange = jQuery.extend(true, {}, me.getView().getModel("gmc").getData());
                        
                                            me.getView().getModel("gmc").setProperty("/results", aDataToEdit);
                                            me.setRowEditMode("gmc");
                            
                                            me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                            me.getView().getModel("ui").setProperty("/updTable", "gmc");
                                            me._isGMCEdited = false;
                                            if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(false); }
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
                // this.showLoadingDialog('Processing...');
                // console.log(new Date())
                var bExist = await this.checkMaterials(this);
                if (bExist) {
                    sap.m.MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_GMC_WITH_MATL"]);
                    // this.closeLoadingDialog();
                    return;
                }
                // console.log(new Date())
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oTable = this.byId("attributesTab")
                var _this = this;
                var _data = {};
                var iIndex = -1;
                var sGmc = this.getView().getModel("ui").getData().activeGmc;
                var sMattyp = '';

                this.getView().getModel("gmc").getData().results.filter(fItem => fItem.GMC === sGmc)
                    .forEach(item => sMattyp = item.MATTYP)

                this.getView().getModel("ui").setProperty("/activeMattyp", sMattyp);

                oTable.getRows()[0].getCells().forEach((item, idx) => {
                    if (item.getBindingInfo("text").parts[0].path === "ATTRIBCD") iIndex = idx;
                })

                this.byId("btnEditAttr").setVisible(false);
                this.byId("btnSaveAttr").setVisible(true);
                this.byId("btnCancelAttr").setVisible(true);
                this.byId("btnRefreshAttr").setVisible(false);
                this.byId("btnSortAttr").setVisible(false);
                // this.byId("btnFilterAttr").setVisible(false);
                this.byId("btnFullScreenAttr").setVisible(false);
                // this.byId("btnColPropAttr").setVisible(false);
                this.byId("searchFieldAttr").setVisible(false);
                // this.onTableResize("Attr","Max");
                this.byId("btnExitFullScreenAttr").setVisible(false);
                this.byId("btnTabLayoutAttr").setVisible(false);
                this.byId("btnDataWrapAttr").setVisible(false);
                this.setScreenSize("detail", true, "0%", "100%");

                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("attributes").getData());
                this.setRowEditMode("attributes");

                var oIconTabBar = this.byId("itbDetail");
                oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                    .forEach(item => item.setProperty("enabled", false));

                this.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                this.getView().getModel("ui").setProperty("/updTable", "attributes");
                this._isAttrEdited = false;
                if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(false); }
                // console.log(oTable.getRows()[0])

                this.getView().getModel("attributes").getData().results.forEach((item, index) => {
                    var oData = this.getView().getModel("mattypattrib").getData().filter(fItem => fItem.Mattyp === sMattyp && fItem.Mattypcls === item.MATTYPCLS);

                    if (oData.length > 0) {
                        oData.sort((a,b) => (a.Attribcd > b.Attribcd ? 1 : -1));
                        _data[item.MATTYPCLS] = oData;
                    }

                    if (this.getView().getModel("attributes").getData().results.length === (index + 1)) {
                        oJSONModel.setData(_data);
                        this.getView().setModel(oJSONModel, "attribute");
                    }
                })

                // this.closeLoadingDialog();

                // setTimeout(() => {
                //     // oTable.getRows()[0].getCells().forEach((item, idx) => {
                //     //     console.log(item);
                        
                //     //     if (item.getBindingInfo("value") !== undefined) {
                //     //         if (item.getBindingInfo("value").parts[0].path === "ATTRIBCD") iIndex = idx;
                //     //     }
                //     // }) 

                //     this.getView().getModel("attributes").getData().results.forEach((item, index) => {
                //         var oData = this.getView().getModel("mattypattrib").getData().filter(fItem => fItem.Mattyp === sMattyp && fItem.Mattypcls === item.MATTYPCLS);
                //         // console.log(this.getView().getModel("mattypattrib").getData())
                //         // console.log(sMattyp, item.MATTYPCLS)
                //         // console.log(oData)
                //         if (oData.length > 0) {
                //             oData.sort((a,b) => (a.Attribcd > b.Attribcd ? 1 : -1));
                //             _data[item.MATTYPCLS] = oData;
    
                //             oTable.getRows()[index].getCells()[iIndex].bindAggregation("suggestionItems", {
                //                 path: "attribute>/" + item.MATTYPCLS,
                //                 length: 10000,
                //                 template: new sap.ui.core.ListItem({
                //                     text: "{attribute>Attribcd}",
                //                     key: "{attribute>Attribcd}",
                //                     additionalText: "{attribute>Shorttext}"
                //                 })
                //             });
                //         }

                //         if (this.getView().getModel("attributes").getData().results.length === (index + 1)) {
                //             oJSONModel.setData(_data);
                //             this.getView().setModel(oJSONModel, "attribute");
                //             // this.closeLoadingDialog();
                //         }
                //     })
                // }, 100);
            },

            setRowEditMode(arg) {
                this.getView().getModel(arg).getData().results.forEach(item => item.Edited = false);
                var oTable = this.byId(arg + "Tab");
                var me = this;

                var oInputEventDelegate = {
                    onkeydown: function(oEvent){
                        me.onInputKeyDown(oEvent);
                    },

                    onclick: function(oEvent) {
                        if (arg === "attributes") {
                            me.onInputFocus(oEvent);
                        }
                    }
                };

                oTable.getColumns().forEach((col, idx) => {
                    var oValueHelp = false;

                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            // console.log(ci)
                            if (!ci.hideOnChange && ci.updatable) {
                                if (ci.ValueHelp !== undefined) oValueHelp = ci.ValueHelp["show"];

                                if (ci.type === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({
                                        selected: "{" + arg + ">" + ci.name + "}", 
                                        editable: true,
                                        enabled: {
                                            path: arg + ">WMAT",
                                            formatter: function (WMAT) {
                                                if (arg === "gmc"){
                                                    if (WMAT) { return false; }
                                                    else { return true; }
                                                }
                                                else { return true }
                                            }
                                        }
                                    }));
                                }
                                else if (oValueHelp) {
                                    var bValueFormatter = true;
                                    // var sSuggestItemText = ci.ValueHelp["SuggestionItems"].text;
                                    // var sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '';                                    
                                    var sTextFormatMode = "Key";

                                    if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                                        sTextFormatMode = ci.TextFormatMode;
                                        // bValueFormatter = true;

                                        // if (ci.ValueHelp["SuggestionItems"].additionalText && ci.ValueHelp["SuggestionItems"].text !== ci.ValueHelp["SuggestionItems"].additionalText) {
                                        //     if (sTextFormatMode === "ValueKey" || sTextFormatMode === "Value") {
                                        //         sSuggestItemText = ci.ValueHelp["SuggestionItems"].additionalText;
                                        //         sSuggestItemAddtlText = ci.ValueHelp["SuggestionItems"].text;
                                        //     }
                                        // }
                                    }
                                    
                                    var oInput;

                                    // if (arg === "attributes" && ci.name === "ATTRIBCD") {
                                    //     oInput = new sap.m.Input({
                                    //         type: "Text",
                                    //         showValueHelp: true,
                                    //         valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                                    //         showSuggestion: true,
                                    //         maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                    //         change: this.onValueHelpLiveInputChange.bind(this)
                                    //     })
                                    // }
                                    // else {
                                    //     oInput = new sap.m.Input({
                                    //         type: "Text",
                                    //         showValueHelp: true,
                                    //         valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                                    //         showSuggestion: true,
                                    //         maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                    //         suggestionItems: {
                                    //             path: ci.ValueHelp["SuggestionItems"].path,
                                    //             length: 10000,
                                    //             template: new sap.ui.core.ListItem({
                                    //                 key: ci.ValueHelp["SuggestionItems"].text,
                                    //                 text: sSuggestItemText,
                                    //                 additionalText: sSuggestItemAddtlText,
                                    //             }),
                                    //             templateShareable: false
                                    //         },
                                    //         change: this.onValueHelpLiveInputChange.bind(this)
                                    //     })
                                    // }

                                    var oColumns = [], oCells = [];

                                    //assign first cell to key/code
                                    this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Key === true).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    //assign second cell to display value/description
                                    this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Key === false && fItem.Value === true).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    //add other column info
                                    this._oModelColumns[ci.ValueHelp["columns"]].filter(fItem => fItem.Visible === true && fItem.Key === false && fItem.Value === false).forEach(item => {
                                        oColumns.push(new sap.m.Column({
                                            header: new sap.m.Label({ text: this.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] }),
                                        }))

                                        oCells.push(new sap.m.Text({
                                            text: { path: ci.ValueHelp["SuggestionItems"].path.replace("/", "") + item.ColumnName }
                                        }))
                                    })

                                    if (arg === "attributes" && ci.name === "ATTRIBCD") {
                                        oInput = new sap.m.Input({
                                            type: "Text",
                                            showValueHelp: true,
                                            valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                                            showSuggestion: true,
                                            maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].maxSuggestionWidth !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                            suggest: this.onInputSuggest.bind(this),
                                            suggestionItemSelected: this.onInputSuggestionItemSelected.bind(this),
                                            change: this.onValueHelpLiveInputChange.bind(this),
                                            enabled: {
                                                path: arg + ">WMAT",
                                                formatter: function (WMAT) {
                                                    if (arg === "gmc"){
                                                        if (WMAT) { return false; }
                                                        else { return true; }
                                                    }
                                                    else { return true }
                                                }
                                            }
                                        })
                                    }
                                    else {
                                        oInput = new sap.m.Input({
                                            type: "Text",
                                            showValueHelp: true,
                                            valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                                            showSuggestion: true,
                                            maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].maxSuggestionWidth !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                            suggestionColumns: oColumns,
                                            suggestionRows: {
                                                path: ci.ValueHelp["SuggestionItems"].path,
                                                template: new sap.m.ColumnListItem({
                                                    cells: oCells
                                                }),
                                                length: 10000,
                                                templateShareable: false
                                            },
                                            suggest: this.onInputSuggest.bind(this),
                                            suggestionItemSelected: this.onInputSuggestionItemSelected.bind(this),
                                            change: this.onValueHelpLiveInputChange.bind(this),
                                            enabled: {
                                                path: arg + ">WMAT",
                                                formatter: function (WMAT) {
                                                    if (arg === "gmc"){
                                                        if (WMAT) { return false; }
                                                        else { return true; }
                                                    }
                                                    else { return true }
                                                }
                                            }
                                        })
                                    }

                                    oInput.setSuggestionRowValidator(this.suggestionRowValidator);

                                    if (bValueFormatter) {
                                        oInput.setProperty("textFormatMode", sTextFormatMode)

                                        oInput.bindValue({  
                                            parts: [{ path: arg + ">" + ci.name }, { value: ci.ValueHelp["items"].path }, { value: ci.ValueHelp["items"].value }, { value: ci.ValueHelp["items"].text }, { value: sTextFormatMode }],
                                            formatter: this.formatValueHelp.bind(this)
                                        });
                                    }
                                    else {
                                        oInput.bindValue({  
                                            parts: [  
                                                { path: arg + ">" + ci.name }
                                            ]
                                        });
                                    }

                                    oInput.addEventDelegate(oInputEventDelegate);

                                    col.setTemplate(oInput);

                                    // col.setTemplate(new sap.m.Input({
                                    //     type: "Text",
                                    //     value: "{" + arg + ">" + ci.name + "}",
                                    //     maxLength: +ci.maxLength,
                                    //     showValueHelp: true,
                                    //     // valueHelpRequest: this.handleValueHelp.bind(this),
                                    //     valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),
                                    //     showSuggestion: true,
                                    //     maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                    //     suggestionItems: {
                                    //         path: ci.valueHelp["items"].path, //ci.valueHelp.model + ">/items", //ci.valueHelp["suggestionItems"].path,
                                    //         length: 10000,
                                    //         template: new sap.ui.core.ListItem({
                                    //             key: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}",
                                    //             text: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}", //ci.valueHelp["suggestionItems"].text
                                    //             additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                    //         }),
                                    //         templateShareable: false
                                    //     },
                                    //     change: this.onValueHelpLiveInputChange.bind(this)
                                    // }).addEventDelegate(oInputEventDelegate));
                                }
                                else if (ci.type === "NUMBER") {
                                    col.setTemplate(new sap.m.Input({
                                        type: sap.m.InputType.Number,
                                        textAlign: sap.ui.core.TextAlign.Right,
                                        liveChange: this.onNumberLiveChange.bind(this),
                                        value: {
                                            path: arg + ">" + ci.name,
                                            // type: "sap.ui.model.odata.type.Decimal",
                                            formatOptions: { 
                                                minFractionDigits: ci.scale, 
                                                maxFractionDigits: ci.scale  
                                            },
                                            constraints: { 
                                                precision: ci.precision + ci.scale, 
                                                scale: ci.scale
                                            }
                                        },
                                        enabled: {
                                            path: arg + ">WMAT",
                                            formatter: function (WMAT) {
                                                if (arg === "gmc"){
                                                    if (WMAT) { return false; }
                                                    else { return true; }
                                                }
                                                else { return true }
                                            }
                                        }
                                    }).addEventDelegate(oInputEventDelegate));
                                }
                                else {
                                    if (ci.maxLength !== null) {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            maxLength: +ci.maxLength,
                                            liveChange: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: arg + ">WMAT",
                                                formatter: function (WMAT) {
                                                    if (arg === "gmc" && ci.name === "DESCZH"){
                                                        if (me._GMCDescZHAuth) { return true; }
                                                        else { return false; }
                                                    }
                                                    else { return true }
                                                }
                                            }
                                        }).addEventDelegate(oInputEventDelegate));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            value: "{" + arg + ">" + ci.name + "}",
                                            liveChange: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: arg + ">WMAT",
                                                formatter: function (WMAT) {
                                                    if (arg === "gmc" && ci.name === "DESCZH"){
                                                        if (me._GMCDescZHAuth) { return true; }
                                                        else { return false; }
                                                    }
                                                    else { return true }
                                                }
                                            }
                                        }).addEventDelegate(oInputEventDelegate));
                                    }
                                }                                
                            }

                            if (ci.required) {
                                // col.getLabel().setProperty("required", true);
                                col.getLabel().addStyleClass("sapMLabelRequired");
                            }
                        })
                })
            },

            onNumberLiveChange: function(oEvent) {
                console.log(oEvent.getParameters())
                console.log(oEvent.getSource())
                // console.log(oEvent.getParameters().value.split("."))
                // console.log(this.validationErrors)
                if (this.validationErrors === undefined) this.validationErrors = [];

                var vDecPlaces = oEvent.getSource().getBindingInfo("value").parts[0].constraints.scale;
                var vDigitNumber = oEvent.getSource().getBindingInfo("value").parts[0].constraints.precision;

                if (oEvent.getParameters().value.split(".").length > 1) {
                    if (vDecPlaces === 0) {
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number without decimals.");
                        this.validationErrors.push(oEvent.getSource().getId());
                    }
                    else if (oEvent.getParameters().value.split(".")[1].length > vDecPlaces) {
                        // console.log("invalid");
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number with a maximum of " + vDecPlaces + " decimal places.");
                        this.validationErrors.push(oEvent.getSource().getId());
                    }
                    else if (oEvent.getParameters().value.split(".")[0].length > (vDigitNumber - vDecPlaces))  {
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number with a maximum of " + (vDigitNumber - vDecPlaces)  + " whole number.");
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
                else if (oEvent.getParameters().value.length > (vDigitNumber - vDecPlaces))  {
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Enter a number with a maximum of " + (vDigitNumber - vDecPlaces)  + " whole number.");
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
                // this._isGMCEdited = true;
                var oSource = oEvent.getSource();
                // console.log(oSource)
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
                this._isGMCEdited = true;
                
                if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(true); }
            },

            onInputLiveChange: function(oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                
                this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
                
                if (sModel === 'gmc') this._isGMCEdited = true;
                else if (sModel === 'attributes') this._isAttrEdited = true;
                else if (sModel === 'cusmat') this._isCusMatEdited = true;

                if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(true); }
            },

            onCustomSmartFilterValueHelp: function() {
                this.oColModel = new JSONModel({
                    "cols": [
                        {
                            "label": "Material Type",
                            "template": "MaterialType",
                            "sortProperty": "MaterialType"
                        },
                        {
                            "label": "Description",
                            "template": "Description",
                            "sortProperty": "Description"
                        },
                    ]
                });

                var aCols = this.oColModel.getData().cols;
                this._oBasicSearchField = new SearchField({
                    showSearchButton: false
                });
    
                this._oCustomSmartFilterValueHelpDialog = sap.ui.xmlfragment("zuigmc2.view.fragments.valuehelp.SmartFilterValueHelpDialog", this);
                this.getView().addDependent(this._oCustomSmartFilterValueHelpDialog);
    
                this._oCustomSmartFilterValueHelpDialog.setRangeKeyFields([{
                    label: "Material Type",
                    key: "MaterialType",
                    type: "string",
                    typeInstance: new typeString({}, {
                        maxLength: 4
                    })
                }]);
    
                // this._oCustomSmartFilterValueHelpDialog.getFilterBar().setBasicSearch(this._oBasicSearchField);
    
                this._oCustomSmartFilterValueHelpDialog.getTableAsync().then(function (oTable) {
                    oTable.setModel(this.getView().getModel("materialType"));
                    oTable.setModel(this.oColModel, "columns");
                    console.log(oTable.getModel())
                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", "/results");
                    }
    
                    if (oTable.bindItems) {
                        oTable.bindAggregation("items", "/results", function () {
                            return new ColumnListItem({
                                cells: aCols.map(function (column) {
                                    return new Label({ text: "{" + column.template + "}" });
                                })
                            });
                        });
                    }
    
                    this._oCustomSmartFilterValueHelpDialog.update();
                }.bind(this));
    
                
                this._oCustomSmartFilterValueHelpDialog.setTokens(this._oMultiInput.getTokens());
                this._oCustomSmartFilterValueHelpDialog.open();
            },
    
            _onMultiInputValidate: function(oArgs) {
                var aToken = this._oMultiInput.getTokens();

                if (oArgs.suggestionObject) {
                    var oObject = oArgs.suggestionObject.getBindingContext("materialType").getObject(),
                        oToken = new Token();

                    oToken.setKey(oObject.MaterialType);
                    oToken.setText(oObject.Description + " (" + oObject.MaterialType + ")");
                    aToken.push(oToken)

                    this._oMultiInput.setTokens(aToken);
                    this._oMultiInput.setValueState("None");
                }
                else if (oArgs.text !== "") {
                    this._oMultiInput.setValueState("Error");
                }
    
                return null;
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
                    // this.byId("btnFilterGMC").setVisible(true);
                    this.byId("btnFullScreenHdr").setVisible(true);
                    // this.byId("btnColPropGMC").setVisible(true);
                    // this.byId("searchFieldGMC").setVisible(true);
                    // this.onTableResize("Hdr","Min");
                    this.setRowReadMode("gmc");
                    this.getView().getModel("gmc").setProperty("/", this._oDataBeforeChange);
                    this.byId("btnTabLayoutGMC").setVisible(true);
                    this.byId("btnDataWrapGMC").setVisible(true);
                    this.byId("cboxSBU").setEnabled(true);
                    this.setScreenSize("header", false, "50%", "50%");

                    if (this.getView().getModel("ui").getData().dataMode === 'NEW') {
                        // this.setFilterAfterCreate();
                        TableFilter.applyColFilters("gmcTab", this);
                    }

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
                    // this.byId("btnFilterAttr").setVisible(true);
                    this.byId("btnFullScreenHdr").setVisible(true);
                    // this.byId("btnColPropAttr").setVisible(true);
                    // this.byId("searchFieldAttr").setVisible(true);
                    // this.onTableResize("Attr","Min");
                    this.byId("btnTabLayoutAttr").setVisible(true);
                    this.byId("btnDataWrapAttr").setVisible(true);
                    this.setScreenSize("detail", false, "50%", "50%");

                    this.setRowReadMode("attributes");
                    this.getView().getModel("attributes").setProperty("/", this._oDataBeforeChange);
    
                    var oIconTabBar = this.byId("itbDetail");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                }
            },

            onCancelCusMat() {
                if (this._isCusMatEdited || this.getView().getModel("ui").getData().dataMode === "NEW") {
                    this._cancelCusMat = true;

                    if (!this._DiscardChangesDialog) {
                        this._DiscardChangesDialog = sap.ui.xmlfragment("zuigmc2.view.DiscardChangesDialog", this);
                        this.getView().addDependent(this._DiscardChangesDialog);
                    }
                    
                    this._DiscardChangesDialog.open();
                }
                else {
                    this.byId("btnAddCusMat").setVisible(true);
                    this.byId("btnAddRowCusMat").setVisible(false);
                    this.byId("btnRemoveRowCusMat").setVisible(false);
                    this.byId("btnEditCusMat").setVisible(true);
                    this.byId("btnDeleteCusMat").setVisible(true);
                    this.byId("btnSaveCusMat").setVisible(false);
                    this.byId("btnCancelCusMat").setVisible(false);
                    this.byId("btnRefreshCusMat").setVisible(true);
                    this.byId("btnFullScreenCusMat").setVisible(true);
                    // this.onTableResize("CusMat","Min");
                    this.byId("btnTabLayoutCusMat").setVisible(true);
                    this.byId("btnDataWrapCusMat").setVisible(true);
                    this.setScreenSize("detail", false, "50%", "50%");

                    this.setRowReadMode("cusmat");
                    this.getView().getModel("cusmat").setProperty("/", this._oDataBeforeChange);
    
                    var oIconTabBar = this.byId("itbDetail");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                }
            },

            async onSaveChanges(arg) {
                var _this = this;
                var aNewRows = this.getView().getModel(arg).getData().results.filter(item => item.New === true);
                var aEditedRows = this.getView().getModel(arg).getData().results.filter(item => item.Edited === true);
                var bProceed = true;
                var sMessage = "";
                var sResult = "";
                var oModel = this.getOwnerComponent().getModel();
                var iCounter = 0;

                if (this.validationErrors.length === 0)
                {
                    if (aNewRows.length > 0) {
                        if (arg === "gmc") {
                            var vSBU = this.getView().getModel("ui").getData().sbu;
                            var _aDescen = [], _aDesczh = [];

                            var sTmpGMC = this.getView().getModel("attributes").getData().results[0].TMPGMC;
                            this._oTmpAttrib[sTmpGMC] = this.getView().getModel("attributes").getData().results;
                            
                            aNewRows.forEach(hdr => {
                                var aAttribNewRows = this._oTmpAttrib[hdr.TMPGMC];
                                _aDescen = [];
                                // _aDesczh = [];

                                aAttribNewRows.forEach(item => {
                                    // if (item.DESCZH === '') item.DESCZH = item.DESCEN;
                                    
                                    if (item.INCLINDESC === 'X') {
                                        if (item.DESCEN !== '' && item.DESCEN !== undefined) _aDescen.push(item.DESCEN);
                                        // if (item.DESCZH !== '' && item.DESCZH !== undefined) _aDesczh.push(item.DESCZH);
                                    }
                                })

                                hdr.DESC = _aDescen.join(', ');
                                // hdr.DESCEN = _aDescen.join(', ');
                                // hdr.DESCZH = _aDesczh.join(', ');

                                if (hdr.MATTYP === '' || hdr.MATGRPCD === '' || hdr.BASEUOM === '') {
                                    bProceed = false;
                                    sMessage = this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"];
                                }
                                else if (hdr.ORDERUOM !== hdr.BASEUOM && hdr.UMREN === hdr.UMREZ) {
                                    bProceed = false;
                                    sMessage = this.getView().getModel("ddtext").getData()["INFO_GMC_VALIDATE_UOM_1"];
                                }
                                else if (hdr.ORDERUOM === hdr.BASEUOM && hdr.UMREN !== hdr.UMREZ) {
                                    bProceed = false;
                                    sMessage = this.getView().getModel("ddtext").getData()["INFO_GMC_VALIDATE_UOM_2"];
                                }
                                else if (_aDescen.join("") === "") {
                                    bProceed = false;
                                    sMessage = this.getView().getModel("ddtext").getData()["INFO_GMC_DESC_REQD"];
                                }
                            })

                            // this.getView().getModel("gmc").setProperty("/results", aNewRows);

                            if (!bProceed) { 
                                MessageBox.information(sMessage);
                                return; 
                            }
                            
                            this.showLoadingDialog('Processing...');
                            sMessage = "";
                            
                            bProceed = await this.checkExistingGMCDesc(this);

                            if (!bProceed) { 
                                this.closeLoadingDialog();
                                return; 
                            }

                            aNewRows.forEach((hdr, idx) => {
                                var aAttribNewRows = this._oTmpAttrib[hdr.TMPGMC];
                                _aDescen = [];
                                _aDesczh = [];

                                aAttribNewRows.forEach(item => {
                                    if (item.DESCZH === '') item.DESCZH = item.DESCEN;
                                    
                                    if (item.INCLINDESC === 'X') {
                                        if (item.DESCEN !== '' && item.DESCEN !== undefined) _aDescen.push(item.DESCEN);
                                        if (item.DESCZH !== '' && item.DESCZH !== undefined) _aDesczh.push(item.DESCZH);
                                    }
                                })

                                var _descen = _aDescen.join(', ');
                                var _desczh = _aDesczh.join(', ');
                                var _param = {};
                                var _param2 = {};
                                var _paramAttrib = [];

                                aAttribNewRows.forEach(item => {
                                    _paramAttrib.push({
                                        "Seq": hdr.TMPGMC,
                                        "Seqno": item.SEQ,
                                        "Mattypcls": item.MATTYPCLS,
                                        "Attribcd": item.ATTRIBCD,
                                        "Descen": item.DESCEN,
                                        "Desczh": item.DESCZH
                                    })
                                });

                                _param = {  
                                    "Seq": hdr.TMPGMC,
                                    "Mattyp": hdr.MATTYP,
                                    "Sbu": vSBU,
                                    "Descen": _descen,
                                    "Desczh": _desczh,
                                    "Matgrpcd": hdr.MATGRPCD,
                                    "Baseuom": hdr.BASEUOM,
                                    "Orderuom": hdr.ORDERUOM,
                                    "Issuom": hdr.ISSUOM,
                                    "Grswt": hdr.GRSWT + '',
                                    "Netwt": hdr.NETWT + '',
                                    "Wtuom": hdr.WTUOM,
                                    "Volume": hdr.VOLUME + '',
                                    "Voluom": hdr.VOLUOM,
                                    "Cusmatcd": hdr.CUSMATCD,
                                    "Processcd": hdr.PROCESSCD,
                                    "Ekwsl": hdr.EKWSL,
                                    "GMCAttribParamSet": _paramAttrib,
                                    "RetMsgSet": [{ "Seq": hdr.TMPGMC }]
                                }

                                _param2[hdr.TMPGMC] = [{
                                    "Umren": hdr.UMREN,
                                    "Umrez": hdr.UMREZ
                                }]

                                console.log(_param);
                                // console.log(_param2);

                                var oModelUpd = this.getOwnerComponent().getModel();
                                var mParameters = {
                                    "groupId": "update"
                                };
                                var updParam = {};
        
                                oModelUpd.setUseBatch(true);
                                oModelUpd.setDeferredGroups(["update"]);

                                setTimeout(() => {
                                    oModel.create("/GMCParamSet", _param, {
                                        method: "POST",
                                        success: function(res, oResponse) {
                                            iCounter++;
                                            _this.closeLoadingDialog();
                                            console.log(res)
                                            if (res.RetMsgSet.results[0].Type === "S") {
                                                sResult = "S";
    
                                                updParam["UMREN"] = _param2[res.RetMsgSet.results[0].Seq][0].Umren;
                                                updParam["UMREZ"] = _param2[res.RetMsgSet.results[0].Seq][0].Umrez;
                                                oModelUpd.update("/UpdateGMCSet('" + res.RetMsgSet.results[0].MessageV1 + "')", updParam, mParameters);
                                            }
    
                                            sMessage += res.RetMsgSet.results[0].Message + "\r\n";
                                            
                                            if (aNewRows.length === iCounter) {
                                                if (sResult === "S") {
                                                    oModelUpd.submitChanges({
                                                        groupId: "update",
                                                        success: function(odata, resp){ 
                                                            TableFilter.applyColFilters("gmcTab", _this);
                                                            _this.setButton("gmc", "save");
                                                            _this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                
                                                            MessageBox.information(sMessage);
                                                            if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(false); }
                                                            _this.setActiveRowHighlight("gmc");
                    
                                                            _this.byId("btnEditAttr").setVisible(true);
                                                            _this.byId("btnRefreshAttr").setVisible(true);
                                                            _this.byId("btnSortAttr").setVisible(true);
                                                            _this.byId("btnTabLayoutAttr").setVisible(true);
                                                            _this.byId("btnDataWrapAttr").setVisible(true);
                    
                                                            _this.setRowReadMode("attributes");
                                                            _this.setReqColHdrColor("attributes");
                    
                                                            var oIconTabBar = _this.byId("itbDetail");
                                                            oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                                                                .forEach(item => item.setProperty("enabled", true)); 
    
                                                            var oTable = _this.byId("gmcTab");
    
                                                            oTable.getModel("gmc").getData().results.forEach(item => {
                                                                if (item.ACTIVE === "X") {
                                                                    _this.getView().getModel("ui").setProperty("/activeGmc", item.GMC);
                                                                    _this.getAttributes(false);
                                                                }
                                                            })
                                                        },
                                                        error: function(odata, resp) { console.log(resp); }
                                                    });
                                                }
                                            }
                                        },
                                        error: function() {
                                            // alert("Error");
                                        }
                                    });                                    
                                }, 100);
                            })
                        }
                        else {
                            this.showLoadingDialog('Processing...');
                        
                            var oModel = this.getOwnerComponent().getModel();
                            var _this = this; 
                            var mParameters = {
                                "groupId": "update"
                            };
                            var proceed = true;
    
                            oModel.setUseBatch(true);
                            oModel.setDeferredGroups(["update"]);
    
                            aNewRows.forEach(item => {
                                var entitySet = "/" + this._aEntitySet[arg];
                                var param = {};

                                this._aColumns[this._sActiveTable.replace("Tab","")].forEach(col => {
                                    if (col.updatable || col.creatable) {
                                        if (col.DataType === "DATETIME") {
                                            param[col.ColumnName] = item[col.ColumnName] === "" ? "" : sapDateFormat.format(new Date(item[col.ColumnName])) + "T00:00:00";
                                        } 
                                        else if (col.DataType === "BOOLEAN") {
                                            param[col.ColumnName] = item[col.ColumnName] === true ? "X" : "";
                                        }
                                        else {
                                            param[col.ColumnName] = item[col.ColumnName] === "" ? "" : item[col.ColumnName] + "";
                                        }
    
                                        if (col.required && (item[col.ColumnName] + "").length === 0) proceed = false;
                                    }
                                })
    
                                param["GMC"] = this.getView().getModel("ui").getData().activeGmc;
                                console.log(entitySet, param)
                                oModel.create(entitySet, param, mParameters);
                            })
                            
                            if (!proceed) {
                                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
                                _this.closeLoadingDialog();
                            }
                            else {
                                oModel.submitChanges({
                                    groupId: "update",
                                    success: function (oData, oResponse) {
                                        MessageBox.information(_this.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);
                                        // console.log(oResponse);
                                        // var aData = _this._oDataBeforeChange;
                                        
                                        // oResponse.data.__batchResponses[0].__changeResponses.forEach((resp, respIdx) => {
                                        //     var oMessage = JSON.parse(resp.headers["sap-message"]);
        
                                        //     if (oMessage.severity === "success") {
                                        //         aNewRows.forEach((nr, nrIndex) => {
                                        //             if (nrIndex === respIdx) {
                                        //                 //set SEQ assigned from backend
                                        //                 // nr.SEQ = oMessage.message;
                                        //                 nr.GMC = _this.getView().getModel("ui").getData().activeGmc;

                                        //                 //merge data
                                        //                 aData.results.push(nr);
                                        //             }
                                        //         })
                                        //     }
                                        // })

                                        // //merge data
                                        // // aNewRows.forEach(item => aData.push(item));
                                        // _this.byId(_this._sActiveTable).getModel(arg).setProperty("/", aData);
                                        // // _this.byId(_this._sActiveTable).bindRows("/rows");

                                        _this.setButton("cusmat", "save");
                                        TableFilter.applyColFilters("cusmatTab", _this);
                                        _this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                                        // _this.getView().getModel("counts").setProperty("/cusmat", aData.results.length);

                                        if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(false); }
                                        _this.setActiveRowHighlight("cusmat");

                                        var oIconTabBar = _this.byId("itbDetail");
                                        oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                                            .forEach(item => item.setProperty("enabled", true));

                                        if (arg === "cusmat") {
                                            _this.getCustomerMaterial(false);
                                        }

                                        // if (me._aColSorters.length > 0) { me.setColumnSorters(me._sActiveTable); }

                                        // me._dataMode = "READ";
                                        _this.closeLoadingDialog();
                                    },
                                    error: function () {
                                        _this.closeLoadingDialog();
                                    }
                                })
                            }
                        }
                    }
                    else if (aEditedRows.length > 0) {
                        var oModel = this.getOwnerComponent().getModel();
                        var iEdited = 0;
                        var _this = this; 
                        var bProceed = true;
                        var mParameters = {
                            "groupId": "update"
                        };

                        oModel.setUseBatch(true);
                        oModel.setDeferredGroups(["update"]);

                        aEditedRows.forEach(item => {
                            var entitySet = "/" + this._aEntitySet[arg] + "(";
                            var param = {};
                            var iKeyCount = this._aColumns[arg].filter(col => col.key === true).length;
                            
                            if (!bProceed) { return; }
                            
                            if (arg === "gmc" && !item.WMAT) {
                                if (item.ORDERUOM !== item.BASEUOM && item.UMREN === item.UMREZ) {
                                    bProceed = false;
                                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_GMC_VALIDATE_UOM_1"]);
                                }
                                else if (item.ORDERUOM === item.BASEUOM && item.UMREN !== item.UMREZ) {
                                    bProceed = false;
                                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_GMC_VALIDATE_UOM_2"]);
                                }
                            }

                            _this._aColumns[arg].forEach(col => {
                                if (col.updatable) param[col.name] = item[col.name];

                                if (arg === "attributes" && (col.name === "DESCEN" || col.name === "DESCZH")) {
                                    param[col.name] = item[col.name];
                                }
    
                                if (iKeyCount === 1) { 
                                    if (col.key) entitySet += "'" + item[col.name] + "'" 
                                }
                                else if (iKeyCount > 1) { 
                                    if (col.key) entitySet += col.name + "='" + item[col.name] + "',"
                                }
                            })
                            
                            if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
    
                            entitySet += ")";
                            console.log(param)
                            oModel.update(entitySet, param, mParameters);
                        });
                        
                        if (bProceed) {
                            this.showLoadingDialog('Processing...');

                            oModel.submitChanges({
                                groupId: "update",
                                success: function(odata, resp){ 
                                    _this.closeLoadingDialog();
                                    _this.setButton(arg, "save");
    
                                    if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(false); }
    
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

                                    if (arg === "attributes") {
                                        _this.getAttributes(false);
                                    }
                                    else if (arg === "cusmat") {
                                        _this.getCustomerMaterial(false);
                                    }
                                },
                                error: function(odata, resp) { console.log(resp); }
                            });
                        }
                    }
                    else {
                        var bCompact = true;
    
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"],
                            { styleClass: bCompact ? "sapUiSizeCompact" : "" }
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
                    }
                    else if (aEditedRows.length > 0) {
                        this.showLoadingDialog('Processing...');
                        
                        var oModel = this.getOwnerComponent().getModel();
                        var iEdited = 0;
                        var _this = this;
                        
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
                            
                            if (iKeyCount > 1) entitySet = entitySet.substr(0, entitySet.length - 1);
    
                            entitySet += ")";
                            // console.log(entitySet)
                            console.log(param)
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
                        this.byId("btnAddRowGMC").setVisible(false);
                        this.byId("btnRemoveRowGMC").setVisible(false);
                        this.byId("btnEditGMC").setVisible(true);
                        this.byId("btnSaveGMC").setVisible(false);
                        this.byId("btnCancelGMC").setVisible(false);
                        this.byId("btnDeleteGMC").setVisible(true);
                        this.byId("btnRefreshGMC").setVisible(true);
                        this.byId("btnSortGMC").setVisible(true);
                        // this.byId("btnFilterGMC").setVisible(true);
                        this.byId("btnFullScreenHdr").setVisible(true);
                        // this.byId("btnColPropGMC").setVisible(true);
                        // this.byId("searchFieldGMC").setVisible(true);
                        // this.onTableResize("Hdr","Min");
                        this.byId("btnTabLayoutGMC").setVisible(true);
                        this.byId("btnDataWrapGMC").setVisible(true);
                        this.byId("cboxSBU").setEnabled(true);
                        this.setScreenSize("header", false, "50%", "50%");
                    }
                    else if (arg1 === "attributes") {
                        this.byId("btnEditAttr").setVisible(true);
                        this.byId("btnSaveAttr").setVisible(false);
                        this.byId("btnCancelAttr").setVisible(false);
                        this.byId("btnRefreshAttr").setVisible(true);
                        this.byId("btnSortAttr").setVisible(true);
                        // this.byId("btnFilterAttr").setVisible(true);
                        this.byId("btnFullScreenAttr").setVisible(true);
                        // this.byId("btnColPropAttr").setVisible(true);
                        // this.byId("searchFieldAttr").setVisible(true);
                        // this.onTableResize("Attr","Min");
                        this.byId("btnTabLayoutAttr").setVisible(true);
                        this.byId("btnDataWrapAttr").setVisible(true);
                        this.setScreenSize("detail", false, "50%", "50%");
                    }
                    else if (arg1 === "cusmat") {
                        this.byId("btnAddCusMat").setVisible(true);
                        this.byId("btnAddRowCusMat").setVisible(false);
                        this.byId("btnRemoveRowCusMat").setVisible(false);
                        this.byId("btnEditCusMat").setVisible(true);
                        this.byId("btnDeleteCusMat").setVisible(true);
                        this.byId("btnSaveCusMat").setVisible(false);
                        this.byId("btnCancelCusMat").setVisible(false);
                        this.byId("btnRefreshCusMat").setVisible(true);
                        this.byId("btnFullScreenCusMat").setVisible(true);
                        // this.onTableResize("CusMat","Min");
                        this.byId("btnTabLayoutCusMat").setVisible(true);
                        this.byId("btnDataWrapCusMat").setVisible(true);
                        this.setScreenSize("detail", false, "50%", "50%");
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
                                        // _this.byId("btnFilterAttr").setVisible(true);
                                        _this.byId("btnFullScreenAttr").setVisible(true);
                                        // _this.byId("btnColPropAttr").setVisible(true);
                                        // _this.byId("searchFieldAttr").setVisible(true);
                                        // _this.onTableResize("Attr","Min");
                                        _this.byId("btnTabLayoutAttr").setVisible(true);
                                        _this.byId("btnDataWrapAttr").setVisible(true);
                                        _this.setScreenSize("detail", false, "50%", "50%");
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
                                                                me.onRefreshGMC();
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

                var _this = this;
                var oModel = this.getOwnerComponent().getModel();
                var oSmartFilter = this.getView().byId("smartFilterBar").getFilters();
                var aFilters = [],
                    aFilter = [],
                    aCustomFilter = [],
                    aSmartFilter = [];
                var oJSONModel = new JSONModel();
                var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

                if (this.byId("gmcTab").getBinding("rows").aSorters.length > 0) {
                    this._aColSorters["gmc"] = jQuery.extend(true, [], this.byId("gmcTab").getBinding("rows").aSorters);
                }
                else {
                    this._aColSorters["gmc"] = [];
                }

                if (this.byId("attributesTab").getBinding("rows").aSorters.length > 0) {
                    this._aColSorters["attributes"] = jQuery.extend(true, [], this.byId("attributesTab").getBinding("rows").aSorters);
                }
                else {
                    this._aColSorters["attributes"] = [];
                }

                if (this.byId("materialsTab").getBinding("rows").aSorters.length > 0) {
                    this._aColSorters["materials"] = jQuery.extend(true, [], this.byId("materialsTab").getBinding("rows").aSorters);
                }
                else {
                    this._aColSorters["materials"] = [];
                }

                if (this.byId("cusmatTab").getBinding("rows").aSorters.length > 0) {
                    this._aColSorters["cusmat"] = jQuery.extend(true, [], this.byId("cusmatTab").getBinding("rows").aSorters);
                }
                else {
                    this._aColSorters["cusmat"] = [];
                }

                if (oSmartFilter.length > 0)  {
                    oSmartFilter[0].aFilters.forEach(item => {
                        if (item.aFilters === undefined) {
                            aFilter.push(new Filter(item.sPath, item.sOperator, item.oValue1));
                        }
                        else {
                            aFilters.push(item);
                        }
                    })

                    if (aFilter.length > 0) { aFilters.push(new Filter(aFilter, false)); }
                }

                if (this.getView().byId("smartFilterBar")) {
                    var oCtrl = this.getView().byId("smartFilterBar").determineControlByName("MATTYP");

                    if (oCtrl) {
                        var aCustomFilter = [];

                        if (oCtrl.getTokens().length === 1) {
                            oCtrl.getTokens().map(function(oToken) {
                                aFilters.push(new Filter("MATTYP", FilterOperator.EQ, oToken.getKey()))
                            })
                        }
                        else if (oCtrl.getTokens().length > 1) {
                            oCtrl.getTokens().map(function(oToken) {
                                aCustomFilter.push(new Filter("MATTYP", FilterOperator.EQ, oToken.getKey()))
                            })

                            aFilters.push(new Filter(aCustomFilter));
                        }
                    }
                }

                aSmartFilter.push(new Filter(aFilters, true));

                // var vSBU = this.getView().getModel("ui").getData().sbu;

                oModel.read('/GMCHdr2Set', {
                    filters: aSmartFilter,
                    // urlParameters: {
                    //     "$filter": "SBU eq '" + vSBU + "'"
                    // },                     
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
                        
                        // var aFilters = [];

                        // if (_this.getView().byId("gmcTab").getBinding("rows")) {
                        //     aFilters = _this.getView().byId("gmcTab").getBinding("rows").aFilters;
                        // }

                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "gmc"); 
                        _this.getView().getModel("counts").setProperty("/gmc", data.results.length);
                        _this.getView().getModel("ui").setProperty("/activeGmc", data.results[0].GMC);
                        _this.getView().getModel("ui").setProperty("/activeMattyp", data.results[0].MATTYP);
                        _this._tableRendered = "gmcTab";
                        _this.getAttributes(true);
                        _this.getMaterials(true);
                        _this.getCustomerMaterial(true);
                        
                        // if (_this.byId("searchFieldGMC").getProperty("value") !== "" ) {
                        //     _this.exeGlobalSearch(_this.byId("searchFieldGMC").getProperty("value"), "gmc")
                        // }

                        // if (aFilters) {
                        //     _this.onRefreshFilter("gmc", aFilters);
                        // }
                        TableFilter.applyColFilters("gmcTab", _this);
                        _this.setColumnSorters("gmcTab");

                        // _this.byId("attributesTab").getColumns().forEach(col => { 
                        //     col.setProperty("filtered", false);
                        // })

                        // _this.byId("materialsTab").getColumns().forEach(col => { 
                        //     col.setProperty("filtered", false);
                        // })

                        _this.closeLoadingDialog();
                        _this.setActiveRowHighlight("gmc");
                    },
                    error: function (err) {
                    }
                })
            },

            onRefreshFilter(pModel, pFilters) {
                var oTable = this.byId(pModel + "Tab");
                var oColumns = oTable.getColumns();

                pFilters.forEach(item => {
                    oColumns.filter(fItem => fItem.getFilterProperty() === item.sPath)
                        .forEach(col => col.filter(item.oValue1))
                }) 
            },

            onRefreshAttr() {
                if (this.byId("attributesTab").getBinding("rows").aSorters.length > 0) {
                    this._aColSorters["attributes"] = jQuery.extend(true, [], this.byId("attributesTab").getBinding("rows").aSorters);
                }
                else {
                    this._aColSorters["attributes"] = [];
                }

                this.getAttributes(true);
            },

            onRefreshMatl() {
                if (this.byId("materialsTab").getBinding("rows").aSorters.length > 0) {
                    this._aColSorters["materials"] = jQuery.extend(true, [], this.byId("materialsTab").getBinding("rows").aSorters);
                }
                else {
                    this._aColSorters["materials"] = [];
                }

                this.getMaterials(true);
            },

            onRefreshCusMat() {
                if (this.byId("cusmatTab").getBinding("rows").aSorters.length > 0) {
                    this._aColSorters["cusmat"] = jQuery.extend(true, [], this.byId("cusmatTab").getBinding("rows").aSorters);
                }
                else {
                    this._aColSorters["cusmat"] = [];
                }

                this.getCustomerMaterial(true);
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
                // console.log(oEvent.getParameters())
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
                else if (oTable.getId().indexOf("cusmatTab") >= 0) {
                    sModel = "cusmat";
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

            onCellClickGMC: function(oEvent) {
                if (!oEvent.getParameters().rowBindingContext) { return; }

                if (this.getView().getModel("ui").getData().dataMode === "NEW") {
                    var sTmpGMC  = oEvent.getParameters().rowBindingContext.getObject().TMPGMC;
                    var sNewMatType  = oEvent.getParameters().rowBindingContext.getObject().MATTYP;
                    var oData = [];

                    if (this.getView().getModel("ui").getProperty("/activeTmpGmc") !== sTmpGMC) {
                        this.getView().getModel("ui").setProperty("/activeTmpGmc", sTmpGMC);

                        if (this._oTmpAttrib[sTmpGMC] !== undefined) {
                            oData = this._oTmpAttrib[sTmpGMC];
                        }
                        
                        this.getView().getModel("attributes").setProperty("/results", oData);
    
                        // if (oData.length > 0) {
                        //     this.bindAttributes(sNewMatType);
                        // }
    
                        this.getView().getModel("counts").setProperty("/attributes", oData.length);
                    }
                }
                else {
                    var vGmc = oEvent.getParameters().rowBindingContext.getObject().GMC;
                
                    if (this.getView().getModel("ui").getData().activeGmc !== vGmc) {
                        this.getView().getModel("ui").setProperty("/activeGmc", vGmc);
                        this.getMaterials(false);
                        this.getAttributes(false);
                        this.getCustomerMaterial(false);
                        this.byId("searchFieldAttr").setProperty("value", "");
                        this.byId("searchFieldMatl").setProperty("value", "");
        
                        var oTable = this.byId('attributesTab');
                        var oColumns = oTable.getColumns();
        
                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            // if (oColumns[i].getFiltered()) {
                            //     oColumns[i].filter("");
                            // }
        
                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
                        }
        
                        oTable = this.byId('materialsTab');
                        oColumns = oTable.getColumns();
        
                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
                        }
    
                        oTable = this.byId('cusmatTab');
                        oColumns = oTable.getColumns();
        
                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
                        }
        
                        TableFilter.removeColFilters("attributesTab", this);
                        TableFilter.removeColFilters("materialsTab", this);
                        TableFilter.removeColFilters("cusmatTab", this);
        
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
                    }
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
                    this.getCustomerMaterial(false);
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

            handleStaticValueHelp: function(oEvent) {
                var oSource = oEvent.getSource();

                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputSource = oSource;
                this._inputField = oSource.getBindingInfo("value").parts[0].path;

                TableValueHelp.handleStaticTableValueHelp(oEvent, this);
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
                    this.dialogEntity=sEntity;
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
                            if(this.dialogEntity==="/PurcValKeyRscSet"){
                                var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;
                                this._valueHelpDialog.getModel().getData().items.filter(item => item.VHTitle === oSelectedItem.getTitle())
                                .forEach(item => {
                                    this.getView().getModel("gmc").setProperty(sRowPath + '/UEBTO', item.Uebto);
                                    this.getView().getModel("gmc").setProperty(sRowPath + '/UNTTO', item.Untto);
                                    this.getView().getModel("gmc").setProperty(sRowPath + '/UEBTK', item.Uebtk);
                                    //oModel.setProperty(this._inputSourceCtx.getPath() + '/UEBTK', item.Uebtk === "X" ? true : false);*/
                                });
                            }
                            else{
                                var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;
                                if (this._inputValue !== oSelectedItem.getTitle()) {                                
                                    this.getView().getModel(sTable).setProperty(sRowPath + '/Edited', true);

                                    if (sTable === 'gmc') this._isGMCEdited = true;
                                    if (sTable === 'attributes') this._isAttrEdited= true;

                                if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(true); }
                            }

                                if (this._inputSource.getBindingInfo("value").parts[0].path === 'MATTYP') {
                                    this._valueHelpDialog.getModel().getData().items.filter(item => item.VHTitle === oSelectedItem.getTitle())
                                        .forEach(item => {
                                            this.getView().getModel(sTable).setProperty(sRowPath + '/PROCESSCD', item.Processcd);
                                        })
                                }
                            }
                        }
                    }

                    this._inputSource.setValueState("None");
                }
                else if (oEvent.sId === "cancel") { }
            },

            onValueHelpLiveInputChange: function(oEvent) {
                if (this.validationErrors === undefined) this.validationErrors = [];
                // console.log("update")
                var oSource = oEvent.getSource();
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                var sRowPath = oSource.oParent.getBindingContext(sModel).sPath;
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");

                var aSelectedKeyPath = [];
                var oSelectedItem = {};
                // console.log(oSource)

                if (isInvalid) {
                    this.validateInputValue(oSource);
                    // this.validationErrors.push(oEvent.getSource().getId());
                }
                else {
                    this.setValuesAfterInputChange(oSource);
                    // var vValue = oSource.getSelectedKey();
                    // var vSuggestKey = oSource.getBindingInfo("value").parts[2].value;
                    // var sSuggestRowModel = oSource.getBindingInfo("value").parts[1].value;
                    // var aSuggestData = [];

                    // if (oSource.getBindingInfo("value").parts[0].path === 'ATTRIBCD') { 
                    //     sSuggestRowModel = "attribute"; 
                    //     aSuggestData = oSource.getSuggestionRows()[0].getBindingContext(sSuggestRowModel).getModel().getData()[this.getView().getModel(sModel).getProperty(sRowPath + '/MATTYPCLS')];
                    // } 
                    // else {
                    //     aSuggestData = oSource.getSuggestionRows()[0].getBindingContext(sSuggestRowModel).getModel().getData();
                    // }

                    // oSelectedItem = aSuggestData.filter(fItem => fItem[vSuggestKey] === vValue)[0];

                    // if (oSource.getBindingInfo("value").parts[0].path === 'MATTYP') {
                    //     this.getView().getModel(sModel).setProperty(sRowPath + '/PROCESSCD', (oSelectedItem ? oSelectedItem.Processcd : ""));
                    //     // this.setAttributesOnGMCCreate(vValue, this.getView().getModel(sModel).getProperty(sRowPath + "/TMPGMC"));
                    // }
                    // else if (oSource.getBindingInfo("value").parts[0].path === 'EKWSL') {
                    //     if (vValue !== "") {
                    //         this.getView().getModel(sModel).setProperty(sRowPath + '/UEBTO', oSelectedItem.Uebto);
                    //         this.getView().getModel(sModel).setProperty(sRowPath + '/UNTTO', oSelectedItem.Untto);
                    //         this.getView().getModel(sModel).setProperty(sRowPath + '/UEBTK', oSelectedItem.Uebtk);
                    //     }
                    //     else {
                    //         this.getView().getModel(sModel).setProperty(sRowPath + '/UEBTO', "");
                    //         this.getView().getModel(sModel).setProperty(sRowPath + '/UNTTO', "");
                    //         this.getView().getModel(sModel).setProperty(sRowPath + '/UEBTK', false);
                    //     }
                    // }
                    // else if (oSource.getBindingInfo("value").parts[0].path === 'ATTRIBCD') {
                    //     if (vValue !== "") {
                    //         this.getView().getModel(sModel).setProperty(sRowPath + '/DESCEN', oSelectedItem.Shorttext);
                    //         this.getView().getModel(sModel).setProperty(sRowPath + '/DESCZH', oSelectedItem.Shorttext2);

                    //         if (this.getView().getModel("ui").getData().dataMode === "NEW") {
                    //             var sTmpGMC = this.getView().getModel(sModel).getProperty(sRowPath + '/TMPGMC');
                    //             this._oTmpAttrib[sTmpGMC] = this.getView().getModel("attributes").getData().results;
                    //         }
                    //     }
                    //     else {
                    //         this.getView().getModel(sModel).setProperty(sRowPath + '/DESCEN', "");
                    //         this.getView().getModel(sModel).setProperty(sRowPath + '/DESCZH', "");
                    //     }
                    // }
                    // else if (oSource.getBindingInfo("value").parts[0].path === 'BASEUOM') { 
                    //     var vEntryUOM = this.getView().getModel(sModel).getProperty(sRowPath + '/ORDERUOM');

                    //     if (vEntryUOM !== "" && vValue !== vEntryUOM) {
                    //         this.convertUOM(vValue, vEntryUOM, sModel, sRowPath);
                    //     }
                    // }
                    // else if (oSource.getBindingInfo("value").parts[0].path === 'ORDERUOM') { 
                    //     var vBaseUOM = this.getView().getModel(sModel).getProperty(sRowPath + '/BASEUOM');

                    //     if (vValue !== "" && vValue !== vBaseUOM) {
                    //         this.convertUOM(vBaseUOM, vValue, sModel, sRowPath);
                    //     }
                    // }

                    // // if (this.getView().getModel("ui").getData().dataMode === "NEW") {
                    // //     if (oSource.getBindingInfo("value").parts[0].path === 'BASEUOM') {
                    // //         this.getView().getModel(sModel).setProperty(sRowPath + '/ORDERUOM', vValue);
                    // //     }
                    // // }

                    // this.getView().getModel(sModel).setProperty(sRowPath + '/' + oSource.getBindingInfo("value").parts[0].path, vValue);
                    
                    // if (oSource.getSelectedKey() === "") { oSource.setSelectedKey(vValue); }

                    // if (oSource.getBindingInfo("value").parts[0].path === 'MATTYP') {
                    //     this.setAttributesOnGMCCreate(vValue, this.getView().getModel(sModel).getProperty(sRowPath + "/TMPGMC"));
                    //     this.getView().getModel("ui").setProperty("/activeTmpMattyp", vValue);
                    // }

                    // this.validationErrors.forEach((item, index) => {
                    //     if (item === oEvent.getSource().getId()) {
                    //         this.validationErrors.splice(index, 1)
                    //     }
                    // })
                }

                if (this.getView().getModel("ui").getData().dataMode === "EDIT") {
                    this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
                    
                    if (sModel === 'gmc') this._isGMCEdited = true;
                    else if (sModel === 'attributes') this._isAttrEdited = true;
                    else if (sModel === 'cusmat') this._isCusMatEdited = true;
                }
                
                if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(true); }
            },

            validateInputValue(source) {
                var oInputSource = source;
                var sValue = oInputSource.getProperty("value").toLowerCase();
                var sFieldName = oInputSource.getBindingInfo("value").parts[0].path;
                var sModel = oInputSource.getBindingInfo("value").parts[0].model;
                var sDataSourceModel = oInputSource.getBindingInfo("value").parts[1].value;
                var sKey = oInputSource.getBindingInfo("value").parts[2].value;
                var sText = oInputSource.getBindingInfo("value").parts[3].value;
                var sTextFormatMode = oInputSource.getProperty("textFormatMode");
                var sRowPath = oInputSource.oParent.getBindingContext(sModel).sPath;
                var aDataSource = jQuery.extend(true, [], this.getView().getModel(sDataSourceModel).getData());

                aDataSource.forEach(item => {
                    if (sTextFormatMode === "ValueKey") {
                        item.DESCCODE = item[sText] + " (" + item[sKey] + ")";
                    }
                    else if (sTextFormatMode === "KeyValue") {
                        item.CODEDESC = item[sKey] + " (" + item[sText] + ")";
                    }
                })

                var aCols = Object.keys(aDataSource[0]).filter(fItem => fItem !== "__metadata");
                var vColCount = aCols.length;

                var matchedData = aDataSource.filter(function (d) {
                    for (let i = 0; i < vColCount; i++) {
                        // check for a match
                        if (d[aCols[i]] != null) {
                            if (d[aCols[i]].toString().toLowerCase() === sValue) {
                                // found match, return true to add to result set
                                return true;
                            }
                        }
                    }
                });

                if (matchedData.length !== 0) {
                    // console.log(matchedData[0][sKey])                    
                    
                    if (sTextFormatMode === "ValueKey") {
                        oInputSource.setValue(matchedData[0][sText] + " (" + matchedData[0][sKey] + ")")
                    }
                    else if (sTextFormatMode === "KeyValue") {
                        oInputSource.setValue(matchedData[0][sKey] + " (" + matchedData[0][sText] + ")")
                    }
                    else if (sTextFormatMode === "Key") {
                        oInputSource.setValue(matchedData[0][sKey])
                    }
                    else if (sTextFormatMode === "Value") {
                        oInputSource.setValue(matchedData[0][sText])
                    }

                    oInputSource.setSelectedKey(matchedData[0][sKey]);
                    oInputSource.setValueState("None");

                    this.setValuesAfterInputChange(oInputSource);

                    // this.getView().getModel(sModel).setProperty(sRowPath + '/' + sFieldName, matchedData[0][sKey]);
                    
                    // this._validationErrors.forEach((item, index) => {
                    //     if (item === oEvent.getSource().getId()) {
                    //         this._validationErrors.splice(index, 1)
                    //     }
                    // })
                }
                else {
                    oInputSource.setValueState("Error");
                    this._validationErrors.push(oEvent.getSource().getId()); 
                }
            },

            setValuesAfterInputChange(source) {                
                var oSource = source;
                var vValue = oSource.getSelectedKey();
                var vSuggestKey = oSource.getBindingInfo("value").parts[2].value;
                var sSuggestRowModel = oSource.getBindingInfo("value").parts[1].value;
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                var sRowPath = oSource.oParent.getBindingContext(sModel).sPath;
                var aSuggestData = [];
                var oSelectedItem = {};

                if (oSource.getSelectedKey() !== "") {
                    if (oSource.getBindingInfo("value").parts[0].path === 'ATTRIBCD') { 
                        sSuggestRowModel = "attribute"; 
                        aSuggestData = oSource.getSuggestionRows()[0].getBindingContext(sSuggestRowModel).getModel().getData()[this.getView().getModel(sModel).getProperty(sRowPath + '/MATTYPCLS')];
                    } 
                    else {
                        aSuggestData = oSource.getSuggestionRows()[0].getBindingContext(sSuggestRowModel).getModel().getData();
                    }
                }

                oSelectedItem = aSuggestData.filter(fItem => fItem[vSuggestKey] === vValue)[0];

                if (oSource.getBindingInfo("value").parts[0].path === 'MATTYP') {
                    this.getView().getModel(sModel).setProperty(sRowPath + '/PROCESSCD', (oSelectedItem ? oSelectedItem.Processcd : ""));
                    // this.setAttributesOnGMCCreate(vValue, this.getView().getModel(sModel).getProperty(sRowPath + "/TMPGMC"));
                }
                else if (oSource.getBindingInfo("value").parts[0].path === 'EKWSL') {
                    if (vValue !== "") {
                        this.getView().getModel(sModel).setProperty(sRowPath + '/UEBTO', oSelectedItem.Uebto);
                        this.getView().getModel(sModel).setProperty(sRowPath + '/UNTTO', oSelectedItem.Untto);
                        this.getView().getModel(sModel).setProperty(sRowPath + '/UEBTK', oSelectedItem.Uebtk);
                    }
                    else {
                        this.getView().getModel(sModel).setProperty(sRowPath + '/UEBTO', "");
                        this.getView().getModel(sModel).setProperty(sRowPath + '/UNTTO', "");
                        this.getView().getModel(sModel).setProperty(sRowPath + '/UEBTK', false);
                    }
                }
                else if (oSource.getBindingInfo("value").parts[0].path === 'ATTRIBCD') {
                    if (vValue !== "") {
                        this.getView().getModel(sModel).setProperty(sRowPath + '/DESCEN', oSelectedItem.Shorttext);
                        this.getView().getModel(sModel).setProperty(sRowPath + '/DESCZH', oSelectedItem.Shorttext2);

                        if (this.getView().getModel("ui").getData().dataMode === "NEW") {
                            var sTmpGMC = this.getView().getModel(sModel).getProperty(sRowPath + '/TMPGMC');
                            this._oTmpAttrib[sTmpGMC] = this.getView().getModel("attributes").getData().results;
                        }
                    }
                    else {
                        this.getView().getModel(sModel).setProperty(sRowPath + '/DESCEN', "");
                        this.getView().getModel(sModel).setProperty(sRowPath + '/DESCZH', "");
                    }
                }
                else if (oSource.getBindingInfo("value").parts[0].path === 'BASEUOM') { 
                    var vEntryUOM = this.getView().getModel(sModel).getProperty(sRowPath + '/ORDERUOM');

                    if (vEntryUOM !== "" && vValue !== vEntryUOM) {
                        this.convertUOM(vValue, vEntryUOM, sModel, sRowPath);
                    }
                }
                else if (oSource.getBindingInfo("value").parts[0].path === 'ORDERUOM') { 
                    var vBaseUOM = this.getView().getModel(sModel).getProperty(sRowPath + '/BASEUOM');

                    if (vValue !== "" && vValue !== vBaseUOM) {
                        this.convertUOM(vBaseUOM, vValue, sModel, sRowPath);
                    }
                }

                this.getView().getModel(sModel).setProperty(sRowPath + '/' + oSource.getBindingInfo("value").parts[0].path, vValue);
                
                if (oSource.getSelectedKey() === "") { oSource.setSelectedKey(vValue); }

                if (oSource.getBindingInfo("value").parts[0].path === 'MATTYP') {
                    this.setAttributesOnGMCCreate(vValue, this.getView().getModel(sModel).getProperty(sRowPath + "/TMPGMC"));
                    this.getView().getModel("ui").setProperty("/activeTmpMattyp", vValue);
                }

                this.validationErrors.forEach((item, index) => {
                    if (item === oEvent.getSource().getId()) {
                        this.validationErrors.splice(index, 1)
                    }
                })
            },

            convertUOM(baseUOM, entryUOM, tabModel, rowPath) {
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oParam = {
                    matnr: "",
                    uom_from: baseUOM,
                    uom_to: entryUOM,
                    numerator: "",
                    denominator: "",
                    msg: ""
                }

                oModel.create("/UOMConvert", oParam, {
                    method: "POST",
                    success: function(oResult, oResponse) {
                        if (!(oResult.numerator === "" || oResult.denominator === "")) {
                            this.getView().getModel(tabModel).setProperty(rowPath + "/UMREZ", oResult.numerator);
                            this.getView().getModel(tabModel).setProperty(rowPath + "/UMREN", oResult.denominator);
                        }
                    },
                    error: function() { }
                }); 
            },

            setRowReadMode(arg) {
                var me = this;
                var oTable = this.byId(arg + "Tab");

                oTable.getColumns().forEach((col, idx) => {                    
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.TextFormatMode && ci.TextFormatMode !== "" && ci.TextFormatMode !== "Key" && ci.ValueHelp && ci.ValueHelp["items"].text && ci.ValueHelp["items"].value !== ci.ValueHelp["items"].text) {
                                col.setTemplate(new sap.m.Text({
                                    text: {
                                        parts: [  
                                            { path: arg + ">" + ci.name }
                                        ],  
                                        formatter: function(sKey) {
                                            var oValue = me.getView().getModel(ci.ValueHelp["items"].path).getData().filter(v => v[ci.ValueHelp["items"].value] === sKey);
                                            
                                            if (oValue && oValue.length > 0) {
                                                if (ci.TextFormatMode === "Value") {
                                                    return oValue[0][ci.ValueHelp["items"].text];
                                                }
                                                else if (ci.TextFormatMode === "ValueKey") {
                                                    return oValue[0][ci.ValueHelp["items"].text] + " (" + sKey + ")";
                                                }
                                                else if (ci.TextFormatMode === "KeyValue") {
                                                    return sKey + " (" + oValue[0][ci.ValueHelp["items"].text] + ")";
                                                }
                                                else { 
                                                    return sKey;
                                                }
                                            }
                                            else return sKey;
                                        }
                                    },
                                    wrapping: false,
                                    tooltip: "{" + arg + ">" + ci.nam + "}"
                                }));
                            }
                            else if (ci.type === "STRING") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + arg + ">" + ci.name + "}",
                                    wrapping: false,
                                    tooltip: "{" + arg + ">" + ci.name + "}"
                                }));
                            }
                            else if (ci.type === "NUMBER") {
                                col.setTemplate(new sap.m.Text({
                                    // text: "{" + arg + ">" + ci.name + "}",
                                    text: "{path:'" + arg + ">" + ci.name + "', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + ci.scale + ", maxFractionDigits:" + ci.scale + " }, constraints:{ precision:" + ci.precision + ", scale:" + ci.scale + " }}",
                                    wrapping: false
                                    // tooltip: "{" + arg + ">" + ci.name + "}"
                                }));
                            }
                            else if (ci.type === "BOOLEAN") {
                                col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: false}));
                            }

                            if (ci.required) {
                                col.getLabel().removeStyleClass("sapMLabelRequired");
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
                                col.getLabel().removeStyleClass("sapMLabelRequired");
                            }
                        })
                })
            },

            resetVisibleCols(arg) {
                if (this._oDataBeforeChange.results !== undefined) {
                    var aData = this.getView().getModel(arg).getData().results;

                    this._oDataBeforeChange.results.forEach((item, idx) => {
                        if (item.Deleted) {
                            aData.splice(idx, 0, item)
                        }
                    })
    
                    this.getView().getModel(arg).setProperty("/results", aData);
                }
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
                this._tableRendered = oEvent.getSource().getSelectedKey() + "Tab";
                this.setActiveRowHighlight(oEvent.getSource().getSelectedKey());
            },

            onAfterTableRendering: function(oEvent) {
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlight(this._tableRendered.replace("Tab", ""));

                    if (this._tableRendered === "gmcTab") {
                        this.setActiveRowHighlight("attributes");
                        this.setActiveRowHighlight("materials");
                        this.setActiveRowHighlight("cusmat");
                    }
                    else if (this._tableRendered === "attributesTab") {
                        this.setActiveRowHighlight("gmc");
                        this.setActiveRowHighlight("materials");
                        this.setActiveRowHighlight("cusmat");
                    }
                    else if (this._tableRendered === "materialsTab") {
                        this.setActiveRowHighlight("gmc");
                        this.setActiveRowHighlight("attributes");
                        this.setActiveRowHighlight("cusmat");
                    }
                    else if (this._tableRendered === "cusmatTab") {
                        this.setActiveRowHighlight("gmc");
                        this.setActiveRowHighlight("attributes");
                        this.setActiveRowHighlight("materials");
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
                            
                            if (item.SHORTTEXT === "") { item.MATTYPCLSDESC = item.MATTYPCLS }
                            else { item.MATTYPCLSDESC = item.SHORTTEXT + " (" + item.MATTYPCLS + ")" }
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

            setAttributesOnGMCCreate(mattyp, tmpgmc) {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var _this = this;
                var me = this;
                var oTable = this.byId("attributesTab");
                var _data = {};
                this.newMattyp = mattyp;
                var bProceed = true;
                var iRowCount = 0;

                if (this.getView().getModel("attribute") !== undefined) {
                    _data = this.getView().getModel("attribute").getData();
                }
                
                if (mattyp === "") {
                    this.getView().getModel("attributes").setProperty("/results", []);
                    // this.closeLoadingDialog();
                    return;
                }

                if (this.getView().getModel("ui").getData().activeTmpMattyp === mattyp && this.getView().getModel("attributes").getData().results.length > 0) {
                    return;
                }

                // oTable.setBusy(true);
                // this.showLoadingDialog('Processing...');
                oModel.read('/MatTypeClassSet', {
                    urlParameters: {
                        "$filter": "MATTYP eq '" + this.newMattyp + "'"
                    },
                    success: function (data, response) {
                        // _this.closeLoadingDialog();                        
                        var aNewRow = [];
                        
                        data.results.forEach((item, index) => {
                            var oNewRow = {};
                            
                            oNewRow["SEQ"] = index + 1 + "";
                            oNewRow["MATTYP"] = mattyp;
                            oNewRow["MATTYPCLS"] = item.MATTYPCLS;
                            oNewRow["INCLINDESC"] = item.INCLINDESC;
                            oNewRow["TMPGMC"] = tmpgmc;
                            oNewRow["New"] = true;
                            aNewRow.push(oNewRow);

                            var oData = _this.getView().getModel("mattypattrib").getData().filter(fItem => fItem.Mattyp === _this.newMattyp && fItem.Mattypcls === item.MATTYPCLS);

                            if (oData.length > 0) {
                                oData.sort((a,b) => (a.Attribcd > b.Attribcd ? 1 : -1));
                                _data[item.MATTYPCLS] = oData;

                                if (data.results.length === (index + 1)) {
                                    oJSONModel.setData(_data);
                                    _this.getView().setModel(oJSONModel, "attribute");
                                }
                            }
                        })
                       
                        _this.getView().getModel("attributes").setProperty("/results", aNewRow);
                        _this._oTmpAttrib[tmpgmc] = aNewRow;
                        _this.getView().getModel("counts").setProperty("/attributes", aNewRow.length);
                        // _this.closeLoadingDialog();
                        // setTimeout(() => {
                        //     var iIndex = -1;
                        //     var iCounter = 0;

                        //     oTable.getRows()[0].getCells().forEach((item, idx) => {
                        //         // console.log(item)
                        //         if (item.getBindingInfo("value") !== undefined) {
                        //             if (item.getBindingInfo("value").parts[0].path === "ATTRIBCD") { iIndex = idx;} 
                        //         }
                        //     })

                        //     iRowCount = oTable.getRows().length;
                            
                        //     oTable.getRows().forEach((row, idx) => {
                        //         if (!bProceed) { return; }
                                
                        //         if (row.getBindingContext("attributes") === null) {
                        //             iRowCount = idx;
                        //             bProceed = false;
                        //         }
                        //         else {
                        //             iCounter++;

                        //             // var iRowIndex = +row.getBindingContext("attributes").sPath.replace("/results/");
                        //             var vMattypcls = row.getBindingContext("attributes").getModel().getProperty(row.getBindingContext("attributes").sPath + "/MATTYPCLS");
                        //             var oCells = [];
                        //             var oInput = row.getCells()[iIndex];
                        //             var oSuggestColumnCount = oInput.getSuggestionColumns().length;

                        //             if (oInput.getSuggestionItems().length > 0) {
                        //                 oInput.removeAllSuggestionItems();
                        //             }

                        //             if (me._oModelColumns["tvh_attrib"] !== undefined) {
                        //                 //assign first cell to key/code
                        //                 me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Key === true).forEach(item => {
                        //                     if (oSuggestColumnCount === 0) {
                        //                         oInput.addSuggestionColumn(new sap.m.Column({
                        //                             header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                        //                         }))
                        //                     }

                        //                     oCells.push(new sap.m.Text({
                        //                         text: { path: "attribute>" + item.ColumnName }
                        //                     }))
                        //                 })

                        //                 //assign second cell to display value/description
                        //                 me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Key === false && fItem.Value === true).forEach(item => {
                        //                     if (oSuggestColumnCount === 0) {
                        //                         oInput.addSuggestionColumn(new sap.m.Column({
                        //                             header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                        //                         }))
                        //                     }

                        //                     oCells.push(new sap.m.Text({
                        //                         text: { path: "attribute>" + item.ColumnName }
                        //                     }))
                        //                 })

                        //                 //add other column info
                        //                 me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Visible === true && fItem.Key === false && fItem.Value === false).forEach(item => {
                        //                     if (oSuggestColumnCount === 0) {
                        //                         oInput.addSuggestionColumn(new sap.m.Column({
                        //                             header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                        //                         }))
                        //                     }

                        //                     oCells.push(new sap.m.Text({
                        //                         text: { path: "attribute>" + item.ColumnName }
                        //                     }))
                        //                 })

                        //                 oInput.bindSuggestionRows({
                        //                     path: "attribute>/" + vMattypcls,
                        //                     template: new sap.m.ColumnListItem({
                        //                         cells: oCells
                        //                     }),
                        //                     length: 10000,
                        //                     templateShareable: false
                        //                 }); 

                        //                 oInput.setSuggestionRowValidator(me.suggestionRowValidator);
                        //             }
                        //         }

                        //         if (iRowCount === iCounter) {
                        //             // console.log("done")
                        //             _this.closeLoadingDialog();
                        //         }
                        //     })

                        //     // _this.getView().getModel("attributes").getData().results.forEach((item, index) => {
                        //     //     var oData = _this.getView().getModel("mattypattrib").getData().filter(fItem => fItem.Mattyp === _this.newMattyp && fItem.Mattypcls === item.MATTYPCLS);

                        //     //     if (oData.length > 0) {
                        //     //         oData.sort((a,b) => (a.Attribcd > b.Attribcd ? 1 : -1));
                        //     //         _data[item.MATTYPCLS] = oData;
            
                        //     //         // oTable.getRows()[index].getCells()[iIndex].bindAggregation("suggestionItems", {
                        //     //         //     path: "attribute>/" + item.MATTYPCLS,
                        //     //         //     length: 10000,
                        //     //         //     template: new sap.ui.core.ListItem({
                        //     //         //         text: "{attribute>Attribcd}",
                        //     //         //         key: "{attribute>Attribcd}",
                        //     //         //         additionalText: "{attribute>Shorttext}"
                        //     //         //     })
                        //     //         // });

                        //     //         var oCells = [];
                        //     //         console.log(index)
                        //     //         console.log(oTable.getRows())
                        //     //         var oInput = oTable.getRows()[index].getCells()[iIndex];
                        //     //         var oSuggestColumnCount = oInput.getSuggestionColumns().length;

                        //     //         if (oInput.getSuggestionItems().length > 0) {
                        //     //             oInput.removeAllSuggestionItems();
                        //     //         }

                        //     //         if (me._oModelColumns["tvh_attrib"] !== undefined) {
                        //     //             //assign first cell to key/code
                        //     //             me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Key === true).forEach(item => {
                        //     //                 if (oSuggestColumnCount === 0) {
                        //     //                     oInput.addSuggestionColumn(new sap.m.Column({
                        //     //                         header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                        //     //                     }))
                        //     //                 }
                    
                        //     //                 oCells.push(new sap.m.Text({
                        //     //                     text: { path: "attribute>" + item.ColumnName }
                        //     //                 }))
                        //     //             })
                    
                        //     //             //assign second cell to display value/description
                        //     //             me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Key === false && fItem.Value === true).forEach(item => {
                        //     //                 if (oSuggestColumnCount === 0) {
                        //     //                     oInput.addSuggestionColumn(new sap.m.Column({
                        //     //                         header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                        //     //                     }))
                        //     //                 }
                    
                        //     //                 oCells.push(new sap.m.Text({
                        //     //                     text: { path: "attribute>" + item.ColumnName }
                        //     //                 }))
                        //     //             })
                    
                        //     //             //add other column info
                        //     //             me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Visible === true && fItem.Key === false && fItem.Value === false).forEach(item => {
                        //     //                 if (oSuggestColumnCount === 0) {
                        //     //                     oInput.addSuggestionColumn(new sap.m.Column({
                        //     //                         header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                        //     //                     }))
                        //     //                 }
                    
                        //     //                 oCells.push(new sap.m.Text({
                        //     //                     text: { path: "attribute>" + item.ColumnName }
                        //     //                 }))
                        //     //             })
                    
                        //     //             oInput.bindSuggestionRows({
                        //     //                 path: "attribute>/" + item.MATTYPCLS,
                        //     //                 template: new sap.m.ColumnListItem({
                        //     //                     cells: oCells
                        //     //                 }),
                        //     //                 length: 10000,
                        //     //                 templateShareable: false
                        //     //             }); 
                    
                        //     //             oInput.setSuggestionRowValidator(me.suggestionRowValidator);
                        //     //         }
                        //     //     }
        
                        //     //     if (_this.getView().getModel("attributes").getData().results.length === (index + 1)) {
                        //     //         console.log("done")
                        //     //         oJSONModel.setData(_data);
                        //     //         _this.getView().setModel(oJSONModel, "attribute");
                        //     //         _this.closeLoadingDialog();
                        //     //     }
                        //     // })
                        // }, 10);
                    },
                    error: function (err) { }
                })
            },

            bindAttributes(mattyp) {
                var oJSONModel = new JSONModel();
                var _this = this;
                var me = this;
                var oTable = this.byId("attributesTab");
                var _data = {};
                this.newMattyp = mattyp;
                
                // oTable.setBusy(true);
                this.showLoadingDialog('Processing...');

                setTimeout(() => {
                    var iIndex = -1;

                    oTable.getRows()[0].getCells().forEach((item, idx) => {
                        if (item.getBindingInfo("value") !== undefined) {
                            if (item.getBindingInfo("value").parts[0].path === "ATTRIBCD") { iIndex = idx;} 
                        }
                    })

                    _this.getView().getModel("attributes").getData().results.forEach((item, index) => {
                        var oData = _this.getView().getModel("mattypattrib").getData().filter(fItem => fItem.Mattyp === _this.newMattyp && fItem.Mattypcls === item.MATTYPCLS);

                        if (oData.length > 0) {
                            oData.sort((a,b) => (a.Attribcd > b.Attribcd ? 1 : -1));
                            _data[item.MATTYPCLS] = oData;

                            var oCells = [];
                            var oInput = oTable.getRows()[index].getCells()[iIndex];
                            var oSuggestColumnCount = oInput.getSuggestionColumns().length;

                            if (me._oModelColumns["tvh_attrib"] !== undefined) {
                                //assign first cell to key/code
                                me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Key === true).forEach(item => {
                                    if (oSuggestColumnCount === 0) {
                                        oInput.addSuggestionColumn(new sap.m.Column({
                                            header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))
                                    }

                                    oCells.push(new sap.m.Text({
                                        text: { path: "attribute>" + item.ColumnName }
                                    }))
                                })

                                //assign second cell to display value/description
                                me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Key === false && fItem.Value === true).forEach(item => {
                                    if (oSuggestColumnCount === 0) {
                                        oInput.addSuggestionColumn(new sap.m.Column({
                                            header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))
                                    }

                                    oCells.push(new sap.m.Text({
                                        text: { path: "attribute>" + item.ColumnName }
                                    }))
                                })

                                //add other column info
                                me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Visible === true && fItem.Key === false && fItem.Value === false).forEach(item => {
                                    if (oSuggestColumnCount === 0) {
                                        oInput.addSuggestionColumn(new sap.m.Column({
                                            header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                        }))
                                    }

                                    oCells.push(new sap.m.Text({
                                        text: { path: "attribute>" + item.ColumnName }
                                    }))
                                })

                                oInput.bindSuggestionRows({
                                    path: "attribute>/" + item.MATTYPCLS,
                                    template: new sap.m.ColumnListItem({
                                        cells: oCells
                                    }),
                                    length: 10000,
                                    templateShareable: false
                                }); 

                                oInput.setSuggestionRowValidator(me.suggestionRowValidator);
                            }
                        }

                        if (_this.getView().getModel("attributes").getData().results.length === (index + 1)) {
                            oJSONModel.setData(_data);
                            _this.getView().setModel(oJSONModel, "attribute");
                            // oTable.setBusy(false);
                            this.closeLoadingDialog();
                        }
                    })
                }, 10);
            },

            bindAttribute(input) {
                var me = this;
                var oRow = this.getView().getModel("attributes").getProperty(input.oParent.getBindingContext("attributes").sPath);
                var vMattyp = oRow.MATTYP;

                if (this.getView().getModel("ui").getProperty("/dataMode") === "EDIT") {
                    vMattyp = this.getView().getModel("ui").getProperty("/activeMattyp");
                }

                var oData = this.getView().getModel("mattypattrib").getData().filter(fItem => fItem.Mattyp === vMattyp && fItem.Mattypcls === oRow.MATTYPCLS);

                if (oData.length > 0) {
                    // console.log("bind suggestion table")
                    oData.sort((a,b) => (a.Attribcd > b.Attribcd ? 1 : -1));
                    
                    var oCells = [];
                    var oInput = input;

                    var oSuggestColumnCount = oInput.getSuggestionColumns().length;

                    if (me._oModelColumns["tvh_attrib"] !== undefined) {
                        //assign first cell to key/code
                        me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Key === true).forEach(item => {
                            if (oSuggestColumnCount === 0) {
                                oInput.addSuggestionColumn(new sap.m.Column({
                                    header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                }))
                            }

                            oCells.push(new sap.m.Text({
                                text: { path: "attribute>" + item.ColumnName }
                            }))
                        })

                        //assign second cell to display value/description
                        me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Key === false && fItem.Value === true).forEach(item => {
                            if (oSuggestColumnCount === 0) {
                                oInput.addSuggestionColumn(new sap.m.Column({
                                    header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                }))
                            }

                            oCells.push(new sap.m.Text({
                                text: { path: "attribute>" + item.ColumnName }
                            }))
                        })

                        //add other column info
                        me._oModelColumns["tvh_attrib"].filter(fItem => fItem.Visible === true && fItem.Key === false && fItem.Value === false).forEach(item => {
                            if (oSuggestColumnCount === 0) {
                                oInput.addSuggestionColumn(new sap.m.Column({
                                    header: new sap.m.Label({ text: me.getView().getModel("ddtext").getData()[item.ColumnName.toUpperCase()] })
                                }))
                            }

                            oCells.push(new sap.m.Text({
                                text: { path: "attribute>" + item.ColumnName }
                            }))
                        })

                        oInput.bindSuggestionRows({
                            path: "attribute>/" + oRow.MATTYPCLS,
                            template: new sap.m.ColumnListItem({
                                cells: oCells
                            }),
                            length: 10000,
                            templateShareable: false
                        }); 

                        oInput.setShowSuggestion(false);
                        oInput.setSuggestionRowValidator(me.suggestionRowValidator);

                        var vh = me.getView().getModel("attribute").getData()[oRow.MATTYPCLS];
                        me.getView().setModel(new JSONModel(vh), "attrib");

                        setTimeout(() => {
                            oInput.setShowSuggestion(true);
                        }, 1);
                    }
                }
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
                    var aNewRows = this.getView().getModel("gmc").getData().results.filter(item => item.New === true);
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
                        "Ekwsl":aNewRows[0].EKWSL,
                        "GMCAttribParamSet": _paramAttrib,
                        "RetMsgSet": [{ "Seq": "1" }]
                    }

                    var oModel = this.getOwnerComponent().getModel();

                    oModel.create("/GMCParamSet", _param, {
                        method: "POST",
                        success: function(res, oResponse) {
                            _this.closeLoadingDialog();

                            if (res.RetMsgSet.results[0].Type === "S") {
                                _this._oViewSettingsDialog["zuigmc2.view.CreateGMCDialog"].close();
                                _this.setButton("gmc", "save");
                                // _this.onRefreshGMC();
                                // _this.setFilterAfterCreate();
                                TableFilter.applyColFilters("gmcTab", _this);
                                _this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                            }

                            MessageBox.information(res.RetMsgSet.results[0].Message);
                            if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(false); }
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
                    // console.log(item)
                    // var _mattypcls = item.MATTYPCLS; //oSource.getContent()[0].getRows()[index].getCells()[0].getText();

                    var oData = this.getView().getModel("mattypattrib").getData().filter(fItem => fItem.Mattyp === this.newMattyp && fItem.Mattypcls === item.MATTYPCLS);
                        // console.log(index, oData)
                    if (oData.length > 0) {
                        oData.sort((a,b) => (a.Attribcd > b.Attribcd ? 1 : -1));
                        _data[item.MATTYPCLS] = oData;

                        oSource.getContent()[0].getRows()[index].getCells()[1].bindAggregation("suggestionItems", {
                            path: "attribute>/" + item.MATTYPCLS,
                            length: 10000,
                            template: new sap.ui.core.ListItem({
                                text: "{attribute>Attribcd}",
                                key: "{attribute>Attribcd}",
                                additionalText: "{attribute>Shorttext}"
                            })
                        });

                        if (oSource.getModel().getData().items.length === (index + 1)) {
                            oJSONModel.setData(_data);
                            _this.getView().setModel(oJSONModel, "attribute");
                            // console.log(_this.getView().getModel("attribute"))
                        }
                    }

                    // oModel.read('/MatTypeAttribSet', {
                    //     urlParameters: {
                    //         "$filter": "Mattyp eq '" + this.newMattyp + "' and Mattypcls eq '" + _mattypcls + "'"
                    //     },
                    //     success: function (data, response) {
                    //         data.results.sort((a,b) => (a.Attribcd > b.Attribcd ? 1 : -1));
                    //         _data[_mattypcls] = data.results;                            

                    //         oSource.getContent()[0].getRows()[index].getCells()[1].bindAggregation("suggestionItems", {
                    //             path: "attribute>/" + _mattypcls,
                    //             length: 10000,
                    //             template: new sap.ui.core.ListItem({
                    //                 text: "{attribute>Attribcd}",
                    //                 key: "{attribute>Attribcd}",
                    //                 additionalText: "{attribute>Shorttext}"
                    //             })
                    //         });

                    //         if (oSource.getModel().getData().items.length === (index + 1)) {
                    //             oJSONModel.setData(_data);
                    //             _this.getView().setModel(oJSONModel, "attribute");
                    //             // console.log(_this.getView().getModel("attribute"))
                    //         }
                    //     },
                    //     error: function (err) { }
                    // })
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

            onKeyUp(oEvent) {
                var _dataMode = this.getView().getModel("ui").getData().dataMode;
                _dataMode = _dataMode === undefined ? "READ": _dataMode;

                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    if (oTable.getId().indexOf("gmcTab") >= 0) {
                        if (_dataMode === "READ") {
                            var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["gmc"].sPath;
                            var oRow = this.getView().getModel("gmc").getProperty(sRowPath);

                            this.getView().getModel("ui").setProperty("/activeGmc", oRow.GMC);
                            this.getMaterials(false);
                            this.getAttributes(false);
                            this.getCustomerMaterial(false);

                            TableFilter.removeColFilters("attributesTab", this);
                            TableFilter.removeColFilters("materialsTab", this);
                            TableFilter.removeColFilters("cusmatTab", this);
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
                        
                        var oTableAttrib = this.byId('attributesTab');
                        var oColumns = oTableAttrib.getColumns();

                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
                        }

                        var oTableMatl = this.byId('materialsTab');
                        oColumns = oTableMatl.getColumns();

                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
                        }

                        var oTableCusMat = this.byId('cusmatTab');
                        oColumns = oTableCusMat.getColumns();

                        for (var i = 0, l = oColumns.length; i < l; i++) {
                            if (oColumns[i].getSorted()) {
                                oColumns[i].setSorted(false);
                            }
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
                    else if (oTable.getId().indexOf("cusmatTab") >= 0) {
                        if (this.byId(oEvent.srcControl.sId).getBindingContext("cusmat")) {
                            var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext("cusmat").sPath;

                            oTable.getModel("cusmat").getData().results.forEach(row => row.ACTIVE = "");
                            oTable.getModel("cusmat").setProperty(sRowPath + "/ACTIVE", "X"); 
                            
                            oTable.getRows().forEach(row => {
                                if (row.getBindingContext("cusmat") && row.getBindingContext("cusmat").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                    row.addStyleClass("activeRow");
                                }
                                else row.removeStyleClass("activeRow")
                            })
                        }
                    }                   
                }
                else if (oEvent.key === "Enter" && oEvent.srcControl.sParentAggregationName === "cells" && this._sActiveTable !== "attributesTab") {
                    if (_dataMode === "NEW") { this.onAddRow(); }
                }
            },

            onInputKeyDown(oEvent) {
                if (oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") {
                    //prevent increase/decrease of number value
                    oEvent.preventDefault();
                    console.log(this._inputSuggest)
                    if (this._inputSuggest) { return }

                    var sTableId = oEvent.srcControl.oParent.oParent.sId;
                    var oTable = this.byId(sTableId);
                    var sModelName = oEvent.srcControl.getBindingInfo("value").parts[0].model;
                    var sColumnName = oEvent.srcControl.getBindingInfo("value").parts[0].path;
                    var sCurrentRowIndex = +oEvent.srcControl.oParent.getBindingContext(sModelName).sPath.replace("/results/", "");
                    var sColumnIndex = -1;
                    var sCurrentRow = -1;
                    var sNextRow = -1;
                    var sActiveRow = -1;
                    var iFirstVisibleRowIndex = oTable.getFirstVisibleRow();
                    var iVisibleRowCount = oTable.getVisibleRowCount();

                    oTable.getModel().setProperty(oEvent.srcControl.oParent.getBindingContext(sModelName).sPath + "/" + oEvent.srcControl.getBindingInfo("value").parts[0].path, oEvent.srcControl.getValue());

                    //get active row (arrow down)
                    oTable.getBinding("rows").aIndices.forEach((item, index) => {
                        if (item === sCurrentRowIndex) { sCurrentRow = index; }
                        if (sCurrentRow !== -1 && sActiveRow === -1) { 
                            if ((sCurrentRow + 1) === index) { sActiveRow = item }
                            else if ((index + 1) === oTable.getBinding("rows").aIndices.length) { sActiveRow = item }
                        }
                    })
                    
                    //clear active row
                    oTable.getModel(sModelName).getData().results.forEach(row => row.ACTIVE = "");

                    //get next row to focus and active row (arrow up)
                    if (oEvent.key === "ArrowUp") { 
                        if (sCurrentRow !== 0) {
                            sActiveRow = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === (sCurrentRow - 1))[0];
                        }
                        else { sActiveRow = oTable.getBinding("rows").aIndices[0] }

                        sCurrentRow = sCurrentRow === 0 ? sCurrentRow : sCurrentRow - iFirstVisibleRowIndex;
                        sNextRow = sCurrentRow === 0 ? 0 : sCurrentRow - 1;
                    }
                    else if (oEvent.key === "ArrowDown") { 
                        sCurrentRow = sCurrentRow - iFirstVisibleRowIndex;
                        sNextRow = sCurrentRow + 1;
                    }

                    //set active row
                    oTable.getModel(sModelName).setProperty("/results/" + sActiveRow + "/ACTIVE", "X");

                    //auto-scroll up/down
                    if (oEvent.key === "ArrowDown" && (sNextRow + 1) < oTable.getModel(sModelName).getData().results.length && (sNextRow + 1) > iVisibleRowCount) {
                        oTable.setFirstVisibleRow(iFirstVisibleRowIndex + 1);
                    }   
                    else if (oEvent.key === "ArrowUp" && sCurrentRow === 0 && sNextRow === 0 && iFirstVisibleRowIndex !== 0) { 
                        oTable.setFirstVisibleRow(iFirstVisibleRowIndex - 1);
                    }

                    //get the cell to focus
                    oTable.getRows()[sCurrentRow].getCells().forEach((cell, index) => {
                        if (cell.getBindingInfo("value") !== undefined) {
                            if (cell.getBindingInfo("value").parts[0].path === sColumnName) { sColumnIndex = index; }
                        }
                    })
                    
                    if (oEvent.key === "ArrowDown") {
                        sNextRow = sNextRow === iVisibleRowCount ? sNextRow - 1 : sNextRow;
                    }

                    //set focus on cell
                    setTimeout(() => {
                        oTable.getRows()[sNextRow].getCells()[sColumnIndex].focus();
                        oTable.getRows()[sNextRow].getCells()[sColumnIndex].getFocusDomRef().select();
                    }, 100);

                    //set row highlight
                    this.setActiveRowHighlight(sModelName);
                }
            },

            onInputFocus(oEvent) {
                // console.log(oEvent)
                if (this.getView().getModel("ui").getData().dataMode === "NEW") {
                    if (oEvent.srcControl.getBindingInfo("value") !== undefined) {
                        if (oEvent.srcControl.getBindingInfo("value").parts[0].model === "gmc") {
                            var sTmpGMC = this.getView().getModel("gmc").getProperty(oEvent.srcControl.oParent.getBindingContext("gmc").sPath + "/TMPGMC");
                            var sNewMatType = this.getView().getModel("gmc").getProperty(oEvent.srcControl.oParent.getBindingContext("gmc").sPath + "/MATTYP");
                            var oData = [];

                            if (this.getView().getModel("ui").getProperty("/activeTmpGmc") !== sTmpGMC) {
                                this.getView().getModel("ui").setProperty("/activeTmpGmc", sTmpGMC);
        
                                if (this._oTmpAttrib[sTmpGMC] !== undefined) {
                                    oData = this._oTmpAttrib[sTmpGMC];
                                }
            
                                this.getView().getModel("attributes").setProperty("/results", oData);
            
                                // if (oData.length > 0) {
                                //     this.bindAttributes(sNewMatType);
                                // }
            
                                this.getView().getModel("counts").setProperty("/attributes", oData.length);
                            }
                        }
                        else {
                            var oRow = this.getView().getModel("attributes").getProperty(oEvent.srcControl.oParent.getBindingContext("attributes").sPath);
            
                            if (oEvent.srcControl.getBindingInfo("suggestionRows") === undefined) {
                                this.bindAttribute(oEvent.srcControl);
                            }
                            else {
                                if (oEvent.srcControl.getBindingInfo("suggestionRows").path.replace("/", "") !== oRow.MATTYPCLS) {
                                    this.bindAttribute(oEvent.srcControl);
                                }
                            }
                        }
                    }
                }
                else {
                    var oRow = this.getView().getModel("attributes").getProperty(oEvent.srcControl.oParent.getBindingContext("attributes").sPath);

                    if (oEvent.srcControl.getBindingInfo("suggestionRows") === undefined) {
                        this.bindAttribute(oEvent.srcControl);
                    }
                    else {
                        if (oEvent.srcControl.getBindingInfo("suggestionRows").path.replace("/", "") !== oRow.MATTYPCLS) {
                            this.bindAttribute(oEvent.srcControl);
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
                    if (this.getView().getModel("ui").getData().dataMode === 'NEW') {
                        // this.setFilterAfterCreate();
                        TableFilter.applyColFilters("gmcTab", this);
                        this.setRowReadMode("attributes");

                        this.byId("btnAddRowGMC").setVisible(false);
                        this.byId("btnRemoveRowGMC").setVisible(false);

                        this.byId("btnEditAttr").setVisible(true);
                        this.byId("btnRefreshAttr").setVisible(true);
                        this.byId("btnSortAttr").setVisible(true);
                        this.byId("btnTabLayoutAttr").setVisible(true);
                        this.byId("btnDataWrapAttr").setVisible(true);        
                    }

                    this.byId("btnAddGMC").setVisible(true);
                    this.byId("btnEditGMC").setVisible(true);
                    this.byId("btnSaveGMC").setVisible(false);
                    this.byId("btnCancelGMC").setVisible(false);
                    this.byId("btnDeleteGMC").setVisible(true);
                    this.byId("btnRefreshGMC").setVisible(true);
                    this.byId("btnSortGMC").setVisible(true);
                    // this.byId("btnFilterGMC").setVisible(true);
                    this.byId("btnFullScreenHdr").setVisible(true);
                    // this.byId("btnColPropGMC").setVisible(true);
                    // this.byId("searchFieldGMC").setVisible(true);
                    this.byId("btnTabLayoutGMC").setVisible(true);
                    this.byId("btnDataWrapGMC").setVisible(true);
                    this.byId("cboxSBU").setEnabled(true);
                    this.byId("smartFilterBar").setVisible(true);
                    // this.onTableResize("Hdr","Min");
                    this.setScreenSize("header", false, "50%", "50%");
                    this.setRowReadMode("gmc");
                    this.getView().getModel("gmc").setProperty("/", this._oDataBeforeChange);
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    this._isGMCEdited = false;
                    this.setActiveRowHighlight("gmc");
                    this._cancelGMC = false;

                    var oIconTabBar = this.byId("itbDetail");
                    oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                        .forEach(item => item.setProperty("enabled", true)); 

                    if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(false); }

                    var oTable = this.byId("gmcTab");

                    oTable.getModel("gmc").getData().results.forEach(item => {
                        if (item.ACTIVE === "X") {
                            this.getView().getModel("ui").setProperty("/activeGmc", item.GMC);
                            this.getAttributes(false);
                        }
                    })
                }
                else if (this._cancelAttr) {
                    this.byId("btnEditAttr").setVisible(true);
                    this.byId("btnSaveAttr").setVisible(false);
                    this.byId("btnCancelAttr").setVisible(false);
                    this.byId("btnRefreshAttr").setVisible(true);
                    this.byId("btnSortAttr").setVisible(true);
                    // this.byId("btnFilterAttr").setVisible(true);
                    this.byId("btnFullScreenHdr").setVisible(true);
                    // this.byId("btnColPropAttr").setVisible(true);
                    // this.byId("searchFieldAttr").setVisible(true);
                    // this.onTableResize("Attr","Min");
                    this.byId("btnTabLayoutAttr").setVisible(true);
                    this.byId("btnDataWrapAttr").setVisible(true);
                    this.setScreenSize("detail", false, "50%", "50%");

                    this.setRowReadMode("attributes");
                    this.getView().getModel("attributes").setProperty("/", this._oDataBeforeChange);
    
                    var oIconTabBar = this.byId("itbDetail");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    this._isAttrEdited = false;
                    this._cancelAttr = false;
                    if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(false); }
                }  
                else if (this._cancelCusMat) {
                    this.byId("btnAddCusMat").setVisible(true);
                    this.byId("btnAddRowCusMat").setVisible(false);
                    this.byId("btnRemoveRowCusMat").setVisible(false);
                    this.byId("btnEditCusMat").setVisible(true);
                    this.byId("btnDeleteCusMat").setVisible(true);
                    this.byId("btnSaveCusMat").setVisible(false);
                    this.byId("btnCancelCusMat").setVisible(false);
                    this.byId("btnRefreshCusMat").setVisible(true);
                    this.byId("btnFullScreenCusMat").setVisible(true);
                    // this.onTableResize("CusMat","Min");
                    this.byId("btnTabLayoutCusMat").setVisible(true);
                    this.byId("btnDataWrapCusMat").setVisible(true);
                    this.setScreenSize("detail", false, "50%", "50%");

                    this.setRowReadMode("cusmat");
                    this.getView().getModel("cusmat").setProperty("/", this._oDataBeforeChange);
    
                    var oIconTabBar = this.byId("itbDetail");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                    this._isCusMatEdited = false;
                    this._cancelCusMat = false;
                    if (sap.ushell.Container !== undefined) { sap.ushell.Container.setDirtyFlag(false); }
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
                else if (oTable.getId().indexOf("cusmatTab") >= 0) {
                    sModel = "cusmat";
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
                // console.log(oColumns)

                // return;
                var oParam = {
                    "SBU": vSBU,
                    "TYPE": "",
                    "TABNAME": "",
                    "TableLayoutToItems": []
                };

                if (oTable.getBindingInfo("rows").model === "gmc") {
                    oParam['TYPE'] = "GMCHDR2";
                    oParam['TABNAME'] = "ZDV_3DERP_GMCHDR";
                }
                else if (oTable.getBindingInfo("rows").model === "attributes") {
                    oParam['TYPE'] = "GMCATTRIB";
                    oParam['TABNAME'] = "ZERP_GMCATTRIB";
                }
                else if (oTable.getBindingInfo("rows").model === "materials") {
                    oParam['TYPE'] = "GMCMAT";
                    oParam['TABNAME'] = "ZERP_MATERIAL";
                }
                else if (oTable.getBindingInfo("rows").model === "cusmat") {
                    oParam['TYPE'] = "GMCCUSMAT";
                    oParam['TABNAME'] = "ZERP_GMCCUSGRP";
                }
                // console.log(oParam)
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
                        WIDTH: column.mProperties.width.replace('px',''),
                        WRAPTEXT: this.getView().getModel("ui").getData().dataWrap[this._sActiveTable] === true ? "X" : ""
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
                else if (oTable.getId().indexOf("cusmatTab") >= 0) {
                    sModel = "cusmat";
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
                else if (oTable.getId().indexOf("cusmatTab") >= 0) {
                    sModel = "cusmat";
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
                    else if (oTable.getId().indexOf("cusmatTab") >= 0) {
                        sModel = "cusmat";
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

            setAttributes: async (me) => {
                var oModel = me.getOwnerComponent().getModel();
                var sMattyp = me.getView().getModel("ui").getData().activeMattyp;
                var oTable = me.byId(me._sActiveTable);
                var _data = {};
                var iIndex = -1;

                oTable.getRows()[0].getCells().forEach((item, idx) => {
                    if (item.getBindingInfo("text").parts[0].path === "ATTRIBCD") iIndex = idx;
                })

                var promise = new Promise((resolve, reject) => {
                    me.getView().getModel("attributes").getData().results.forEach((item, index) => {
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
    
                                if (me.getView().getModel("attributes").getData().results.length === (index + 1)) {
                                    me.getView().setModel(new JSONModel(_data), "attribute");
                                    resolve(true);
                                }
                            },
                            error: function (err) {
                                if (me.getView().getModel("attributes").getData().results.length === (index + 1)) {
                                    me.getView().setModel(new JSONModel(_data), "attribute");
                                    resolve(true);
                                }
                            }
                        })
                    })
                })

                // console.log(me.getView().getModel("attribute"))
                return await promise;
            },

            setColumnSorters(sTable) {
                if (this._aColSorters[sTable.replace("Tab", "")].length > 0) {
                    var oTable = this.byId(sTable);
                    var oColumns = oTable.getColumns();

                    this._aColSorters[sTable.replace("Tab", "")].forEach(item => {
                        oColumns.filter(fItem => fItem.getSortProperty() === item.sPath)
                            .forEach(col => {
                                col.sort(item.bDescending);
                            })
                    })
                } 
            },

            formatValueHelp: function(sValue, sPath, sKey, sText, sFormat) {
                // console.log(sValue, sPath, sKey, sText, sFormat);
                // console.log(this.getView().getModel(sPath))

                if (this.getView().getModel(sPath) === undefined) {
                    return sValue;
                }

                var oValue = this.getView().getModel(sPath).getData().filter(v => v[sKey] === sValue);

                if (oValue && oValue.length > 0) {
                    if (sFormat === "Value") {
                        return oValue[0][sText];
                    }
                    else if (sFormat === "ValueKey") {
                        return oValue[0][sText] + " (" + sValue + ")";
                    }
                    else if (sFormat === "KeyValue") {
                        return sValue + " (" + oValue[0][sText] + ")";
                    }
                    else {
                        return sValue;
                    }
                }
                else return sValue;
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

            onWrapText: function(oEvent) {
                this._sActiveTable = oEvent.getSource().data("TableId");
                var vWrap = this.getView().getModel("ui").getData().dataWrap[this._sActiveTable];
                
                this.byId(this._sActiveTable).getColumns().forEach(col => {
                    var oTemplate = col.getTemplate();
                    oTemplate.setWrapping(!vWrap);
                    col.setTemplate(oTemplate);
                })

                this.getView().getModel("ui").setProperty("/dataWrap/" + [this._sActiveTable], !vWrap);
            },

            formatTimeOffSet(pTime) {
                let TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
                return timeFormat.format(new Date(pTime + TZOffsetMs));
            },

            suggestionRowValidator: function (oColumnListItem) {
                var aCells = oColumnListItem.getCells();

                if (aCells.length === 1) {
                    return new sap.ui.core.Item({
                        key: aCells[0].getText(),
                        text: aCells[0].getText()
                    }); 
                }
                else {
                    return new sap.ui.core.Item({
                        key: aCells[0].getText(),
                        text: aCells[1].getText()
                    });
                }
            },

            onInputSuggest: function(oEvent) {
                //override the default filtering "StartsWidth" to "Contains"
                var oInputSource = oEvent.getSource();
                var sSuggestValue = oEvent.getParameter("suggestValue").toLowerCase();
                var aFilters = [];
                var oFilter = null;
                
                this._inputSuggest = true;                

                if (oInputSource.getSuggestionRows().length === 0){
                    oInputSource.getBinding("suggestionRows").filter(null);
                }
                
                if (oInputSource.getSuggestionRows().length > 0) {
                    oInputSource.getSuggestionRows()[0].getCells().forEach(cell => {
                        aFilters.push(new Filter(cell.getBinding("text").sPath, FilterOperator.Contains, sSuggestValue))
                    })
    
                    oFilter = new Filter(aFilters, false);
    
                    oInputSource.getBinding("suggestionRows").filter(oFilter);
                    oInputSource.setShowSuggestion(true);
                    oInputSource.setFilterSuggests(false);
                }
            },

            onInputSuggestionItemSelected: function(oEvent) {
                this._inputSuggest = false;
            },

            //******************************************* */
            // Column Filtering
            //******************************************* */

            onColFilterClear: function(oEvent) {
                TableFilter.onColFilterClear(oEvent, this);
            },

            onColFilterCancel: function(oEvent) {
                TableFilter.onColFilterCancel(oEvent, this);
            },

            onColFilterConfirm: function(oEvent) {
                TableFilter.onColFilterConfirm(oEvent, this);
            },

            onFilterItemPress: function(oEvent) {
                TableFilter.onFilterItemPress(oEvent, this);
            },

            onFilterValuesSelectionChange: function(oEvent) {
                TableFilter.onFilterValuesSelectionChange(oEvent, this);
            },

            onSearchFilterValue: function(oEvent) {
                TableFilter.onSearchFilterValue(oEvent, this);
            },

            onCustomColFilterChange: function(oEvent) {
                TableFilter.onCustomColFilterChange(oEvent, this);
            },

            onSetUseColFilter: function(oEvent) {
                TableFilter.onSetUseColFilter(oEvent, this);
            },

            onRemoveColFilter: function(oEvent) {
                TableFilter.onRemoveColFilter(oEvent, this);
            },

            //******************************************* */
            // Smart Filter
            //******************************************* */

            beforeVariantFetch: function(oEvent) {
                SmartFilterCustomControl.beforeVariantFetch(this);
            },

            afterVariantLoad: function(oEvent) {
                SmartFilterCustomControl.afterVariantLoad(this);
            },

            clearSmartFilters: function(oEvent) {
                SmartFilterCustomControl.clearSmartFilters(this);
            }

        });
    });
