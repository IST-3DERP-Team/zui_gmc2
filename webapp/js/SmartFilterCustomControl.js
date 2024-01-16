sap.ui.define([ 
    "sap/ui/model/json/JSONModel" ,
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "sap/m/SearchField",
    "sap/ui/model/type/String",
    "sap/m/Token",
    "sap/ui/comp/filterbar/FilterBar",
    "sap/ui/comp/filterbar/FilterGroupItem"
], function(JSONModel, Filter, FilterOperator, SearchField, typeString, Token, FilterBar, FilterGroupItem) {
	"use strict";

	return {        

        onSmartFilterCustomControlValueHelp: function(oEvent) {
            var oSource = oEvent.getSource();
            var sFieldName = oSource.getProperty("name");
            var aCols = [];

            this._oSmartFilterCustomControl = this.byId("sff" + sFieldName);

            this._oSmartFilterCustomControlProp[sFieldName].property.forEach(prop => {
                aCols.push({
                    label: prop.label,
                    template: prop.name,
                    sortProperty: prop.name
                })
            })

            this._oSmartFilterCustomControlBasicSearchField = new SearchField({
                showSearchButton: false
            });

            this._oSmartFilterCustomControlValueHelpDialog = sap.ui.xmlfragment("zuigmc2.view.fragments.valuehelp.SmartFilterCustomControlValueHelpDialog", this);
            this.getView().addDependent(this._oSmartFilterCustomControlValueHelpDialog);

            this._oSmartFilterCustomControlValueHelpDialog.setRangeKeyFields([{
                label: this._oSmartFilterCustomControlProp[sFieldName].label,
                key: this._oSmartFilterCustomControlProp[sFieldName].key,
                type: this._oSmartFilterCustomControlProp[sFieldName].type,
                typeInstance: new typeString({}, {
                    maxLength: this._oSmartFilterCustomControlProp[sFieldName].maxLength
                })
            }]);

            this._oSmartFilterCustomControlValueHelpDialog.getTableAsync().then(function (oTable) {
                oTable.setModel(new JSONModel({ cols: aCols }), "columns");
                oTable.setBusy(true);

                var oInterval = setInterval(() => {
                    if (this.getView().getModel("sfm" + sFieldName) !== undefined) {
                        clearInterval(oInterval);

                        oTable.setModel(this.getView().getModel("sfm" + sFieldName));

                        if (oTable.bindRows) {
                            oTable.bindAggregation("rows", "/");
                        }

                        this._oSmartFilterCustomControlValueHelpDialog.update();
                        oTable.setBusy(false);
                    }
                }, 100);
            }.bind(this));

            
            this._oSmartFilterCustomControlValueHelpDialog.setTokens(oSource.getTokens());
            this._oSmartFilterCustomControlValueHelpDialog.setTitle(this._oSmartFilterCustomControlProp[sFieldName].label);
            this._oSmartFilterCustomControlValueHelpDialog.setKey(this._oSmartFilterCustomControlProp[sFieldName].key);
            this._oSmartFilterCustomControlValueHelpDialog.setDescriptionKey(this._oSmartFilterCustomControlProp[sFieldName].desc);
            this._oSmartFilterCustomControlValueHelpDialog.open();

            this._oSmartFilterCustomControlValueHelpDialog.attachOk(this._smartFilterCustomControl.onSmartFilterCustomControlValueHelpOkPress.bind(this));
            this._oSmartFilterCustomControlValueHelpDialog.attachCancel(this._smartFilterCustomControl.onSmartFilterCustomControlValueHelpCancelPress.bind(this));
            this._oSmartFilterCustomControlValueHelpDialog.attachAfterClose(this._smartFilterCustomControl.onSmartFilterCustomControlValueHelpAfterClose.bind(this));

            var oFilterBar = new FilterBar({
                advancedMode: true,
                search: this._smartFilterCustomControl.onSmartFilterBarCustomControlSearch.bind(this)
            });

            this._oSmartFilterCustomControlProp[sFieldName].property.forEach(prop => {
                oFilterBar.addFilterGroupItem(new FilterGroupItem({
                    groupName: "__$INTERNAL$",
                    name: prop.name,
                    label: prop.label,
                    control: new sap.m.Input({
                        name: prop.name
                    })
                }))
            })

            this._oSmartFilterCustomControlValueHelpDialog.setFilterBar(oFilterBar);
        },

        onSmartFilterCustomControlValueHelpOkPress: function (oEvent) {
            var aTokens = oEvent.getParameter("tokens");
            var sTextFormatMode = this._oSmartFilterCustomControlProp[this._oSmartFilterCustomControl.getProperty("name")].textFormatMode;

            if (sTextFormatMode === "Key") {
                aTokens.forEach(t => {
                    t.setProperty("text", t.getProperty("key"));
                })
            }

            this._oSmartFilterCustomControl.setTokens(aTokens);
            this._oSmartFilterCustomControlValueHelpDialog.close();
        },

        onSmartFilterCustomControlValueHelpCancelPress: function () {
            this._oSmartFilterCustomControlValueHelpDialog.close();
        },

        onSmartFilterCustomControlValueHelpAfterClose: function () {
            this._oSmartFilterCustomControlValueHelpDialog.destroy();
        },

        onSmartFilterBarCustomControlSearch: function (oEvent) {
            var sSearchQuery = this._oSmartFilterCustomControlBasicSearchField.getValue(),
                aSelectionSet = oEvent.getParameter("selectionSet");

            var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
                if (oControl.getValue()) {
                    aResult.push(new Filter({
                        path: oControl.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    }));
                }

                return aResult;
            }, []);

            this._smartFilterCustomControl.filterTable(this, new Filter({
                filters: aFilters,
                and: true
            }));
        },

        filterTable: function (oThis, oFilter) {
            var oValueHelpDialog = oThis._oSmartFilterCustomControlValueHelpDialog;

            oValueHelpDialog.getTableAsync().then(function (oTable) {
                if (oTable.bindRows) {
                    oTable.getBinding("rows").filter(oFilter);
                }

                oValueHelpDialog.update();
            });
        },

        onSmartFilterCustomControlValueHelpChange: function(oEvent) {
            var oSource = oEvent.getSource();
            var sFieldName = oSource.getProperty("name");

            if (oEvent.getParameter("value") === "") {
                this.byId("sff" + sFieldName).setValueState("None");
            }
        },

        onMultiInputValidate: function(oArgs) {
            // console.log(oArgs)
            if (oArgs.suggestionObject) {
                var sFieldName = oArgs.suggestionObject.oParent.oParent.oParent.getProperty("name");
                var aFieldProp = this._oSmartFilterCustomControlProp[sFieldName].property;
                var oObject = oArgs.suggestionObject.getBindingContext("sfm" + sFieldName).getObject();
                var oMultiInput = this.byId("sff" + sFieldName);
                var aToken = oMultiInput.getTokens();
                var vCount = 0;

                if (aToken.length > 0) {
                    vCount = aToken.filter(fItem => fItem.getProperty("key") === oObject[aFieldProp[0].name]).length;
                }

                if (vCount === 0) {
                    var oToken = new Token();
                    var sTextFormatMode = this._oSmartFilterCustomControlProp[sFieldName].textFormatMode;

                    if (sTextFormatMode === "Key") {
                        oToken.setKey(oObject[aFieldProp[0].name]);
                        oToken.setText(oObject[aFieldProp[0].name]);
                    }
                    else if (sTextFormatMode === "ValueKey") {
                        oToken.setKey(oObject[aFieldProp[0].name]);
                        oToken.setText(oObject[aFieldProp[1].name] + " (" + oObject[aFieldProp[0].name] + ")");
                    }

                    aToken.push(oToken)
                }

                oMultiInput.setTokens(aToken);
                oMultiInput.setValueState("None");
            }
            else if (oArgs.text !== "") {
                this._oSmartFilterCustomControl.setValueState("Error");
            }

            return null;
        },

        onMultiInputSuggest: function(oEvent) {
            //override the default filtering "StartsWidth" to "Contains"
            var oInputSource = oEvent.getSource();
            var sSuggestValue = oEvent.getParameter("suggestValue").toLowerCase();
            var aFilters = [];
            var oFilter = null;
            
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

        onMultiInputFocus(oThis, oEvent) {
            if (oEvent.srcControl instanceof sap.m.Input) {
                oThis._oSmartFilterCustomControl = oThis.byId("sff" + oEvent.srcControl.getProperty("name"));
            }
        },

	};
});