sap.ui.define([
	"sap/challenge/mtshelf/mtshelf_web/controller/BaseController",
	"sap/challenge/mtshelf/mtshelf_web/utils/ServiceUtils",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/Label",
	"sap/m/MessageToast",
], function (BaseController, ServiceUtils, JSONModel, Filter, Button, Dialog, Label, MessageToast) {
	"use strict";

	return BaseController.extend("sap.challenge.mtshelf.mtshelf_web.controller.helpView", {
		onInit: function () {
			var me = this;
			this._oRouter = this.getRouter();
			this._oRouter.getRoute("cartView").attachPatternMatched(this._routePatternMatched, this);
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("sap.challenge.mtshelf.mtshelf_web", "RefreshSC", function (sChannelId, sEventId, oData) {
				MessageToast.show("Shopping Cart is being updated");
				this._routePatternMatched();
			}, this);
			oEventBus.subscribe("sap.challenge.mtshelf.mtshelf_web", "initializePayment", function (sChannelId, sEventId, oData) {
				ServiceUtils.initializePayment(me,oData);
			}, this);
		},
		_routePatternMatched: function () {
			var me = this;
			this._setBusy(true);
			var promise = ServiceUtils.getShoppingCart(this.getOwnerComponent(), ServiceUtils.getAppKey(
				me.getOwnerComponent()));
			promise.then(function (oData) {
				me._setBusy(false);
				if (oData.errors) {
					me._oRouter.navTo("homeView");
				}
			});
			// var oCartModel = this.getModel("cartProducts");
			// var oCartEntries = oCartModel.getProperty("/cartEntries");
			// //enables the proceed and edit buttons if the cart has entries
			// if (Object.keys(oCartEntries).length > 0) {
			// 	oCartModel.setProperty("/showProceedButton", true);
			// 	oCartModel.setProperty("/showEditButton", true);
			// }
			//set selection of list back
			var oEntryList = this.byId("entryList");
			oEntryList.removeSelections();
		},
		onCartEntriesDelete: function (oEvent) {
			var oList = oEvent.getSource().getParent();
			var upc = this.getModel("shoppingCartModel").getProperty(oList.getSwipedItem().getBindingContextPath()).upc;
			ServiceUtils.deleteItemFromShoppingCart(this.getOwnerComponent(), ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart,
				upc);
			oList.swipeOut();
		},
		onProceedButtonPress: function (oEvent) {
			//Need to show barcode for shopping cart 
			ServiceUtils.startCheckOutShopper(this);
		},
		onRemoveItem: function(oEvent) {
			var upc = this.getModel("shoppingCartModel").getProperty(oEvent.getSource().getParent().getParent().getParent().getBindingContextPath()).upc;
			var shoppingCart = ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart;
			ServiceUtils.decrementItemFromShoppingCart(this,shoppingCart,upc);                          
		},
		onAddItem: function(oEvent) {
			var upc = this.getModel("shoppingCartModel").getProperty(oEvent.getSource().getParent().getParent().getParent().getBindingContextPath()).upc;
			ServiceUtils.getUPC(this,upc,"S");
		}
	});
});