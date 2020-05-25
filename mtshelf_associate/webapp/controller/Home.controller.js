sap.ui.define([
	"./BaseController",
	"sap/challenge/mtshelf/mtshelf_associate/utils/ServiceUtils",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/Device",
	"sap/m/MessageToast"
], function (
	BaseController,
	ServiceUtils,
	formatter,
	Filter,
	FilterOperator,
	Device,
	MessageToast) {
	"use strict";

	return BaseController.extend("sap.challenge.mtshelf.mtshelf_associate.controller.Home", {
		formatter: formatter,

		onInit: function () {
			ServiceUtils.refreshPromotionList(this);
			var oComponent = this.getOwnerComponent();
			this._router = oComponent.getRouter();
			//this._router.getRoute("categories").attachMatched(this._onRouteMatched, this);
		},

		_onRouteMatched: function () {
			var bSmallScreen = this.getModel("appView").getProperty("/smallScreenMode");
			if (bSmallScreen) {
				this._setLayout("One");
			}
		},

		onSearch: function () {
			this._search();
		},

		// onRefresh: function () {
		// 	// trigger search again and hide pullToRefresh when data ready
		// 	var oUPCList = this.byId("upcList");
		// 	var oBinding = oProductList.getBinding("items");
		// 	var fnHandler = function () {
		// 		this.byId("pullToRefresh").hide();
		// 		oBinding.detachDataReceived(fnHandler);
		// 	}.bind(this);
		// 	oBinding.attachDataReceived(fnHandler);
		// 	this._search();
		// },

		_search: function () {
			var oView = this.getView();
			var oUPCList = oView.byId("upcList");
			var oSearchField = oView.byId("searchField");

			// switch visibility of lists
			var bShowSearchResults = oSearchField.getValue().length !== 0;

			// filter product list
			var oBinding = oUPCList.getBinding("items");
			if (oBinding) {
				if (bShowSearchResults) {
					var oFilter = new Filter("item/name", FilterOperator.Contains, oSearchField.getValue());
					oBinding.filter([oFilter]);
				} else {
					oBinding.filter([]);
				}
			}
		},

		// onCategoryListItemPress: function (oEvent) {
		// 	var oBindContext = oEvent.getSource().getBindingContext();
		// 	var oModel = oBindContext.getModel();
		// 	var sCategoryId = oModel.getData(oBindContext.getPath()).Category;

		// 	this._router.navTo("category", {
		// 		id: sCategoryId
		// 	});
		// 	this._unhideMiddlePage();
		// },

		onUPCPress: function (oEvent) {
			var oItem = oEvent.getParameter("listItem");
			ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).currentUPCSource = "S";
			var UPC = this.getModel("upcList").getProperty(oItem.getBindingContextPath());
			this.getOwnerComponent().getModel("currentUPC").setData(UPC);
			this.getOwnerComponent().getModel("currentUPC").refresh(true);
		},

		// onProductListItemPress: function (oEvent) {
		// 	var oItem = oEvent.getSource();
		// 	this._showProduct(oItem);
		// },

		// _showProduct: function (oItem) {
		// 	var oEntry = oItem.getBindingContext().getObject();

		// 	this._router.navTo("product", {
		// 		id: oEntry.Category,
		// 		productId: oEntry.ProductId
		// 	}, !Device.system.phone);
		// },

		/**
		 * Always navigates back to home
		 * @override
		 */
		onBack: function () {
			this.getRouter().navTo("home");
		},
		onSubmitForValue: function (oEvent) {
			var promise = ServiceUtils.getUPC(this.getOwnerComponent(), this.getView().byId("scannedValue").getValue(), "L");
			promise.then(function (oData) {
				if (oData.item.failed) {
					MessageToast.show("The UPC was either misread or not found.  Try again.");
				}
			});
		},
		onScanForValue: function (oEvent) {
			if (!this._oScanDialog) {
				this._oScanDialog = new sap.m.Dialog({
					title: "Scan barcode",
					contentWidth: "640px",
					contentHeight: "480px",
					horizontalScrolling: false,
					verticalScrolling: false,
					stretchOnPhone: true,
					content: [new sap.ui.core.HTML({
						id: this.createId("scanContainer"),
						content: "<div />"
					})],
					endButton: new sap.m.Button({
						text: "Cancel",
						press: function (oEvent) {
							this._oScanDialog.close();
							this._setBusy(false);
						}.bind(this)
					}),
					afterOpen: function () {
						this._initQuagga(this.getView().byId("scanContainer").getDomRef()).done(function () {
							// Initialisation done, start Quagga
							Quagga.start();
						}).fail(function (oError) {
							// Failed to initialise, show message and close dialog...this should not happen as we have
							// already checked for camera device ni /model/models.js and hidden the scan button if none detected
							MessageBox.error(oError.message.length ? oError.message : ("Failed to initialise Quagga with reason code " + oError.name), {
								onClose: function () {
									this._oScanDialog.close();
									this._setBusy(false);
								}.bind(this)
							});
						}.bind(this));
					}.bind(this),
					afterClose: function () {
						// Dialog closed, stop Quagga
						Quagga.stop();
					}
				});

				this.getView().addDependent(this._oScanDialog);
			}

			this._oScanDialog.open();
		},

		_initQuagga: function (oTarget) {
			var oDeferred = jQuery.Deferred();

			// Initialise Quagga plugin - see https://serratus.github.io/quaggaJS/#configobject for details
			Quagga.init({
				inputStream: {
					type: "LiveStream",
					target: oTarget,
					constraints: {
						width: {
							min: 640
						},
						height: {
							min: 480
						},
						facingMode: "environment"
					}
				},
				locator: {
					patchSize: "medium",
					halfSample: true
				},
				numOfWorkers: 2,
				frequency: 10,
				decoder: {
					readers: [{
						//format: "code_128_reader",
						format: "upc_reader",
						config: {}
					}]
				},
				locate: true
			}, function (error) {
				if (error) {
					oDeferred.reject(error);
				} else {
					oDeferred.resolve();
				}
			});

			if (!this._oQuaggaEventHandlersAttached) {
				// Attach event handlers...

				Quagga.onProcessed(function (result) {
					var drawingCtx = Quagga.canvas.ctx.overlay,
						drawingCanvas = Quagga.canvas.dom.overlay;

					if (result) {
						// The following will attempt to draw boxes around detected barcodes
						if (result.boxes) {
							drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
							result.boxes.filter(function (box) {
								return box !== result.box;
							}).forEach(function (box) {
								Quagga.ImageDebug.drawPath(box, {
									x: 0,
									y: 1
								}, drawingCtx, {
									color: "green",
									lineWidth: 2
								});
							});
						}

						if (result.box) {
							Quagga.ImageDebug.drawPath(result.box, {
								x: 0,
								y: 1
							}, drawingCtx, {
								color: "#00F",
								lineWidth: 2
							});
						}

						if (result.codeResult && result.codeResult.code) {
							Quagga.ImageDebug.drawPath(result.line, {
								x: 'x',
								y: 'y'
							}, drawingCtx, {
								color: 'red',
								lineWidth: 3
							});
						}
					}
				}.bind(this));

				Quagga.onDetected(function (result) {
					// Barcode has been detected, value will be in result.codeResult.code. If requierd, validations can be done 
					// on result.codeResult.code to ensure the correct format/type of barcode value has been picked up

					// Set barcode value in input field
					var me = this;
					this.getView().byId("scannedValue").setValue(result.codeResult.code);
					// Add URL to list (and fetch data)
					var promise = ServiceUtils.getUPC(this.getOwnerComponent(), result.codeResult.code, "L");
					// Based on the code scanned - go get the UPC data and update the model with it.

					// Close dialog
					this._oScanDialog.close();
					promise.then(function (oData) {
						me._setBusy(false);
						if (oData.item.failed) {
							MessageToast.show("The UPC was either misread or not found.  Try again.");
							me.onScanForValue(null);
						}
					});
				}.bind(this));

				// Set flag so that event handlers are only attached once...
				this._oQuaggaEventHandlersAttached = true;
			}

			return oDeferred.promise();
		},
		addToShoppingCart: function (oEvent) {
			var upc = this.getModel("upcList").getProperty(oEvent.getSource().getParent().getParent().getSelectedContextPaths()[0]).item.upc;
			var shoppingCart = this.getOwnerComponent().getModel("baseConfigurationModel").getProperty("/shoppingCart");
			ServiceUtils.addItemToShoppingCart(this.getOwnerComponent(), shoppingCart, upc);
		},
		cycleCount: function (oEvent) {
			var upcData = this.getModel("upcList").getProperty(oEvent.getSource().getParent().getParent().getSelectedContextPaths()[0]);
			ServiceUtils.cycleCount(this, upcData);
		},
		moveProduct: function (oEvent) {
			var upcData = this.getModel("upcList").getProperty(oEvent.getSource().getParent().getParent().getSelectedContextPaths()[0]);
			ServiceUtils.moveProduct(this, upcData);
		},
		viewSelected: function (oEvent) {
			var key = oEvent.getParameters().item.getKey();
			var oBaseConfiguration = this.getModel("baseConfigurationModel");
			if (key === "upc") {
				oBaseConfiguration.setProperty("/promotionListVisible", false);
				oBaseConfiguration.setProperty("/upcListVisible", true);
				oBaseConfiguration.refresh(true);
			} else if (key === "promotions") {
				oBaseConfiguration.setProperty("/upcListVisible", false);
				oBaseConfiguration.setProperty("/promotionListVisible", true);
				ServiceUtils.refreshPromotionList(this);
			}
		},
		onPromotionPress: function (oEvent) {
			var oList = this.byId("promotionList");
			var selectedItems = oList.getSelectedItems();
			var oBaseConfiguration = this.getModel("baseConfigurationModel");
			if (selectedItems && selectedItems.length > 0) {
				oBaseConfiguration.setProperty("/promotionButtonsEnabled", true);
			} else {
				oBaseConfiguration.setProperty("/promotionButtonsEnabled", false);
			}
		},
		promotionActivate: function (oEvent) {
			this.promotionUpdate("A");
		},
		promotionDeactivate: function (oEvent) {
			this.promotionUpdate("I");
		},
		promotionUpdate: function(status) {
			var oList = this.byId("promotionList");
			var me = this;
			var promiseArray = [];
			ServiceUtils._setBusy(this, true);
			// Loop at records to activate
			var selectedItems = oList.getSelectedItems();
			var oModel = this.getModel("promotionList");
			for (var i = 0; i < selectedItems.length; i++) {
				var oPromotion = oModel.getProperty(selectedItems[i].getBindingContext("promotionList").getPath());
				if (oPromotion.status !== status) {
					var promise = ServiceUtils.updatePromotionStatus(this, oPromotion.promotion, status);
					promiseArray.push(promise);
				}
				selectedItems[i].setSelected(false);
			}
			Promise.all(promiseArray).then(function (oData) {
				// Should now have all the information updated
				ServiceUtils.refreshPromotionList(me);
				ServiceUtils._setBusy(me, false);
			});
			this.onPromotionPress(null);
		},
		onPromotionSearch: function(oEvent) {
			// add filter for search
			var aFilters = [];
			var sQuery = oEvent.getSource().getValue();
			if (sQuery && sQuery.length > 0) {
				var filter = new Filter("description", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
			}
			// update list binding
			var list = this.byId("promotionList");
			var binding = list.getBinding("items");
			binding.filter(aFilters, "Application");
		}
	});
});