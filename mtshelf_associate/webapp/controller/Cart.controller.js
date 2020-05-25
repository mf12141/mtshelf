sap.ui.define([
	"./BaseController",
	"sap/challenge/mtshelf/mtshelf_associate/utils/ServiceUtils",
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"../model/formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (
	BaseController,
	ServiceUtils,
	JSONModel,
	Device,
	formatter,
	MessageBox,
	MessageToast
) {
	"use strict";

	var sCartModelName = "cartProducts";
	var sCartEntries = "cartEntries";

	return BaseController.extend("sap.challenge.mtshelf.mtshelf_associate.controller.Cart", {
		formatter: formatter,

		onInit: function () {
			this._oRouter = this.getRouter();
			this._oRouter.getRoute("cart").attachPatternMatched(this._routePatternMatched, this);
			//this._oRouter.getRoute("productCart").attachPatternMatched(this._routePatternMatched, this);
			//this._oRouter.getRoute("comparisonCart").attachPatternMatched(this._routePatternMatched, this);
			// set initial ui configuration model
			var oCfgModel = new JSONModel({});
			this.getView().setModel(oCfgModel, "cfg");
			this._toggleCfgModel();
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("sap.challenge.mtshelf.mtshelf_associate", "RefreshSC", function(sChannelId, sEventId, oData) {
				MessageToast.show("Shopping Cart is being updated");
				this._routePatternMatched();
			}, this);
		},

		onExit: function () {
			if (this._orderDialog) {
				this._orderDialog.destroy();
			}
			if (this._orderBusyDialog) {
				this._orderBusyDialog.destroy();
			}
		},

		_routePatternMatched: function () {
			var me = this;
			this._setLayout("Three");
			var shoppingCart = ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart;
			if (shoppingCart && shoppingCart !== "") {
				this._setBusy(true);
				var promise = ServiceUtils.getShoppingCart(this.getOwnerComponent(), ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart);
				promise.then(function (oData) {
					me._setBusy(false);
					if (oData.errors) {
						me._setLayout("Two");
						me._oRouter.navTo("home");
					}
				});
			} else {
				me._setLayout("Two");
				me._oRouter.navTo("home");
			}
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

		onEditOrDoneButtonPress: function () {
			this._toggleCfgModel();
		},

		_toggleCfgModel: function () {
			var oCfgModel = this.getView().getModel("cfg");
			var oData = oCfgModel.getData();
			var oBundle = this.getResourceBundle();
			var bDataNoSetYet = !oData.hasOwnProperty("inDelete");
			var bInDelete = (bDataNoSetYet ? true : oData.inDelete);
			var sPhoneMode = (Device.system.phone ? "None" : "SingleSelectMaster");
			var sPhoneType = (Device.system.phone ? "Active" : "Inactive");
			var bShowChange = !bInDelete && !Device.system.phone;

			oCfgModel.setData({
				inDelete: !bInDelete,
				notInDelete: bInDelete,
				listMode: (bInDelete ? sPhoneMode : "Delete"),
				listItemType: (bInDelete ? sPhoneType : "Inactive"),
				pageTitle: (bInDelete ? oBundle.getText("cartTitle") : oBundle.getText("cartTitleEdit")),
				showChange: bShowChange
			});
		},

		onEntryListPress: function (oEvent) {
			var me = this;
			var sPath = oEvent.getSource().getBindingContext().getPath();
			var oItem = me.getModel("shoppingCartModel").getProperty(sPath);
			if (!isNaN(oItem.price) && oItem.price > 0) {
				var promise = ServiceUtils.getUPC(this.getOwnerComponent(), oItem.upc, "L");
				promise.then(function (oData) {
					ServiceUtils.getBaseConfiguration(me.getOwnerComponent()).currentUPCSource = "C";
					me.getOwnerComponent().getModel("currentUPC").setData(oData);
					me.getOwnerComponent().getModel("currentUPC").refresh(true);
				});
			} else {
				MessageToast.show("No extra details are available for the Promotions.");
			}
			//this._showProduct(oEvent.getSource().getBindingContext().getPath());
		},

		onEntryListSelect: function (oEvent) {
			var me = this;
			var oItem = oEvent.getParameter("listItem");
			var sPath = oItem.getBindingContextPath();
			oItem = me.getModel("shoppingCartModel").getProperty(sPath);
			if (!isNaN(oItem.price) && oItem.price > 0) {
				var promise = ServiceUtils.getUPC(me.getOwnerComponent(), oItem.upc, "L");
				promise.then(function (oData) {
					ServiceUtils.getBaseConfiguration(me.getOwnerComponent()).currentUPCSource = "C";
					// Update weight if there is one.
					if (oItem.weight && oItem.weight > 0) {
						oData.item.weight = oItem.weight;
					}
					me.getOwnerComponent().getModel("currentUPC").setData(oData);
					me.getOwnerComponent().getModel("currentUPC").refresh(true);
				});
			} else {
				MessageToast.show("No extra details are available for the Promotions.");
			}
			//this._showProduct(oEvent.getParameter("listItem"));
		},

		/**
		 * Called when the "save for later" link of a product in the cart is pressed.
		 * @public
		 * @param {sap.ui.base.Event} oEvent Event object
		 */
		onSaveForLater: function (oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext(sCartModelName);
			this._changeList(sSavedForLaterEntries, sCartEntries, oBindingContext);
		},

		/**
		 * Called when the "Add back to basket" link of a product in the saved for later list is pressed.
		 * @public
		 * @param {sap.ui.base.Event} oEvent Event object
		 */
		onAddBackToBasket: function (oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext(sCartModelName);

			this._changeList(sCartEntries, sSavedForLaterEntries, oBindingContext);
		},

		/**
		 * Moves a product from one list to another.
		 * @private
		 * @param {string} sListToAddItem Name of list, where item should be moved to
		 * @param {string} sListToDeleteItem Name of list, where item should be removed from
		 * @param {Object} oBindingContext Binding context of product
		 */
		_changeList: function (sListToAddItem, sListToDeleteItem, oBindingContext) {
			var oCartModel = oBindingContext.getModel();
			var oProduct = oBindingContext.getObject();
			var oModelData = oCartModel.getData();
			// why are the items cloned? - the JSON model checks if the values in the object are changed.
			// if we do our modifications on the same reference, there will be no change detected.
			// so we modify after the clone.
			var oListToAddItem = Object.assign({}, oModelData[sListToAddItem]);
			var oListToDeleteItem = Object.assign({}, oModelData[sListToDeleteItem]);
			var sProductId = oProduct.ProductId;

			// find existing entry for product
			if (oListToAddItem[sProductId] === undefined) {
				// copy new entry
				oListToAddItem[sProductId] = Object.assign({}, oProduct);
			}

			//Delete the saved Product from cart
			delete oListToDeleteItem[sProductId];
			oCartModel.setProperty("/" + sListToAddItem, oListToAddItem);
			oCartModel.setProperty("/" + sListToDeleteItem, oListToDeleteItem);
		},

		_showProduct: function (oItem) {
			var oEntry = oItem.getBindingContext(sCartModelName).getObject();

			// close cart when showing a product on phone
			var bCartVisible = false;
			if (!Device.system.phone) {
				bCartVisible = this.getModel("appView").getProperty("/layout").startsWith("Three");
			} else {
				bCartVisible = false;
				this._setLayout("Two");
			}
			this._oRouter.navTo(bCartVisible ? "productCart" : "product", {
				id: oEntry.Category,
				productId: oEntry.ProductId
			}, !Device.system.phone);
		},

		onCartEntriesDelete: function (oEvent) {
			var oList = oEvent.getSource().getParent();
			var upc = this.getModel("shoppingCartModel").getProperty(oList.getSwipedItem().getBindingContextPath()).upc;
			ServiceUtils.deleteItemFromShoppingCart(this.getOwnerComponent(), ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart,
				upc);
			oList.swipeOut();
		},
		onProceedButtonPress: function (oEvent) {
			ServiceUtils.startCheckOutAssociate(this);                           
		}
	});
});