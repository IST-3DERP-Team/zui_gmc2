sap.ui.define([
	"sap/m/MessageToast" ], function(MessageToast) {
	"use strict";

	return {

        onExportExcel: function (oEvent) {
            var oButton = oEvent.getSource();
            var tabName = oButton.data('TableName')
            var oTable = this.getView().byId(tabName);
            var oExport = oTable.exportData();
            var date = new Date();

            oExport.mAggregations.columns.shift();
            oExport.saveFile(tabName + " " + date.toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric"}));
        },

        pad: function (num, size) {
            num = num.toString();
            while (num.length < size) num = "0" + num;
            return num;
        },

        showMessage: function(oMessage) {
			MessageToast.show(oMessage, {
				duration: 2000,
				animationDuration: 500
			});
		},

        openLoadingDialog: function(doc) {
			if (!doc._LoadingDialog) {
				doc._LoadingDialog = sap.ui.xmlfragment("zuishipdoc.view.fragments.dialog.LoadingDialog", doc);
				doc.getView().addDependent(doc._LoadingDialog);
			}
			jQuery.sap.syncStyleClass("sapUiSizeCompact", doc.getView(), doc._LoadingDialog);
			doc._LoadingDialog.open();
		},

		closeLoadingDialog: function(doc) {
			doc._LoadingDialog.close();
		},

        openProcessingDialog(doc, msg) {
            if (!doc._ProcessingDialog) {
                doc._ProcessingDialog = sap.ui.xmlfragment("zuishipdoc.view.fragments.dialog.ProcessingDialog", doc);
                doc.getView().addDependent(doc._ProcessingDialog);
            }
            jQuery.sap.syncStyleClass("sapUiSizeCompact", doc.getView(), doc._ProcessingDialog);
            
            doc._ProcessingDialog.setTitle(msg === undefined ? "Processing..." : msg);
            doc._ProcessingDialog.open();
        },

        closeProcessingDialog(doc) {
            doc._ProcessingDialog.close();
        },        
	};
});