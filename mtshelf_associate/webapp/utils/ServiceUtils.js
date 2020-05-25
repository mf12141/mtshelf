sap.ui.define([
	'sap/m/Dialog',
	'sap/m/MessageToast',
	'sap/ui/core/ws/WebSocket',
	'../model/formatter'
], function (Dialog, MessageToast, WebSocket, formatter) {
	"use strict";
	return {
		formatter: formatter,
		_source: new String("A"), // Use "S" for shopper
		getUserModel: function (oContext) {
			var me = this;
			var userModel = oContext.getModel("userModel");
			var userModelPromise = new Promise(function (resolve, reject) {
				fetch("/mtshelf_node/getUserInfo")
					.then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
							throw error;
						}
						console.log("Step 1 - Getting user info");
						userModel.setData(parseResponse);
						var oMemory = {
							"customeremail": userModel.getProperty("/name")
						};
						me.setMemory(oContext, oMemory);
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to retrieve user information...  Error: " + error);
						reject();
					});
			});
			return userModelPromise;
		},
		updateDetectedItemOptions: function (oContext, oUPCData, size, shoppingCart) {
			var me = this;
			me._setBusy(oContext, true);
			this.updateCurrentUPCifNecessary(oContext, oUPCData);
			this.updateUPCData(oContext, oUPCData);
			var shoppingCartModel = oContext.getModel("shoppingCartModel");
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var upcModelPromise = new Promise(function (resolve, reject) {
				if (shoppingCart && shoppingCart !== "") {
					fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.saveDetectedUPCToCart, "", shoppingCart,
							oUPCData.item.upc,
							size), {
							method: "GET",
							headers: {
								"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
							}
						}).then(function (response) {
							return response.text();
						})
						.then(function (responseText) {
							try {
								var parseResponse = JSON.parse(responseText);
							} catch (error) {
								console.log(responseText);
								throw error;
							}
							console.log("Updating Detected Item Data");
							shoppingCartModel.setData(parseResponse);
							shoppingCartModel.refresh(true);
							me._setBusy(oContext, false);
							resolve();
						})
						.catch((error) => {
							MessageToast.show("Unable to update detected item data in Shopping Cart...  Error: " + error);
							me._setBusy(oContext, false);
							reject();
						});
				} else {
					me._setBusy(oContext, false);
					resolve();
				}
			});
			return upcModelPromise;
		},
		getUPC: function (oContext, upc, action) {
			var me = this;
			me._setBusy(oContext, true);
			var upcModel = oContext.getModel("upcList");
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var upcModelPromise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.getUPCEndpoint, "", upc, action), {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
							throw error;
						}
						console.log("Step 1 - Getting UPC info");
						if (parseResponse.item.failed) {
							console.log("UPC entered was bad try again");
						} else {
							me.updateUPCData(oContext, parseResponse);
						}
						me._setBusy(oContext, false);
						resolve(parseResponse);
					})
					.catch((error) => {
						MessageToast.show("Unable to retrieve UPC information...  Error: " + error);
						me._setBusy(oContext, false);
						reject({
							error: error
						});
					});
			});
			return upcModelPromise;
		},
		// HANA Database Services 

		// This call is made when the application starts
		// This gets a valid oAuth token for uploading images to SAP HANA - note this wouldn't really be necessary
		// because all the components share the same UAA - It was left here as a proof of concept.
		getAccessToken: function (oContext) {
			var accessTokenModel = oContext.getModel("accessTokenModel");
			var accessTokenPromise = new Promise(function (resolve, reject) {
				var promise = fetch('/mtshelf_node/getAccessToken', {});
				promise.then((response) => {
						if (!response.ok) {
							MessageToast.show("HTTP error, status = " + response.status);
							throw new Error("HTTP error, status = " + response.status);
							reject();
						}
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
							throw error;
						}
						console.log("Step 2 - Getting Access Token");
						accessTokenModel.setData(parseResponse);
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to retrieve csrf token...  Error: " + error);
						reject();
					});
			});
			return accessTokenPromise;
		},
		// SAP ConversationalAI 

		// This call is made when the application starts
		// Get access token from Chat Bot using SAP Conversational AI API
		getUUIDFromChatBot: function (oContext) {
			var uuidTokenModel = oContext.getModel("uuidTokentModel");
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var convAiUUIDPromise = new Promise(function (resolve, reject) {
				var promise = fetch(oBaseConfiguration.convAiUUIDDestination + oBaseConfiguration.slug, {
					headers: {
						"Authorization": oBaseConfiguration.requestToken
					}
				});
				promise
					.then((response) => response.json())
					.then((parseData) => {
						oBaseConfiguration.uuid = parseData.results.owner.id;
						console.log("Step 3 - Getting conversational AI UUID");
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to retrieve uuid...  Error: " + error);
						reject();
					});
			});
			return convAiUUIDPromise;
		},
		getBaseConfiguration: function (oContext) {
			// Base Configuration
			var baseConfigurationModel = oContext.getModel("baseConfigurationModel");
			if (!baseConfigurationModel.getProperty("/initialized")) {
				var oBaseConfiguration = {
					hana2Destination: "/xsjs",
					registration2Endpoint: "/CheckCustomer.xsjs?email='val1'",
					saveSnapshot2Endpoint: "/SaveSnapshot2.xsjs",
					analyzeImage2Endpoint: "/AnalyzeImagesTrigger.xsjs?appKey='val1'",
					detectedProduct2Endpoint: "/GetDetectedProduct.xsjs?appKey='val1'",
					getUPCEndpoint: "/GetUPC.xsjs?appKey='val1'&upc='val2'&action='val3'",
					salesOrder2Endpoint: "/SubmitSalesOrder.xsjs?customer='val1'&partNumber='val2'",
					shoppingCartEndpoint: "/GetShoppingCart.xsjs?appKey='val1'&shoppingCart='val2'",
					addShoppingCartItem: "/GetUPC.xsjs?appKey='val1'&shoppingCart='val2'&upc='val3'&action='val4'&source='" + this._source + "'",
					saveDetectedUPCToCart: "/SaveDetectedUPCToCart.xsjs??appKey='val1'&shoppingCart='val2'&upc='val3'&size='val4'&source='" + this._source +
						"'",
					deleteShoppingCartItem: "/DeleteUPCFromShoppingCart.xsjs?appKey='val1'&shoppingCart='val2'&upc='val3'&source='" + this._source +
						"'",
					decrementShoppingCartItem: "/DecrementUPCFromShoppingCart.xsjs?appKey='val1'&shoppingCart='val2'&upc='val3'&source='" + this._source +
						"'",
					shoppingCartTax: "/GetShoppingCartTax.xsjs?shoppingCart='val1'",
					cycleCountEndpoint: "/UpdateCycleCount.xsjs?upc='val1'&quantity='val2'",
					updateLocationEndpoint: "/UpdateLocation.xsjs?upc='val1'&aisle='val2'&area='val3'",
					changeSCStatusEndpoint: "/ChangeSCStatus.xsjs?shoppingCart='val1'&status='val2'&source='" + this._source + "'",
					getPromotionsEndpoint: "/GetPromotions.xsjs",
					updatePromotionStatusEndpoint: "/UpdatePromotionStatus.xsjs?promotion='val1'&status='val2'",
					imageType: "P",
					csrfToken: "",
					convAiDestination: "/build/v1/dialog",
					convAiUUIDDestination: "/auth/v1/owners",
					// Conversational AI Settings
					requestToken: "4428401fab47fba67e86839bd9109eff",
					slug: "/greghawkins",
					uuid: "",
					oauthDestination: "/oauth",
					oauthEndpoint: "/token?grant_type=client_credentials",
					shoppingCart: "",
					allowSCEdit: false,
					currentUPCSource: "S",
					upcListVisible: true,
					promotionListVisible: false,
					promotionButtonsEnabled: false,
					initialized: true
				}
				baseConfigurationModel.setData(oBaseConfiguration);
			}
			return baseConfigurationModel.getData();
		},
		uploadSnapshot: function (oContext, oBody) {
			var me = this;
			me._setBusy(oContext, true);
			var shoppingCartModel = oContext.getModel("shoppingCartModel");
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var snapshotPromise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + oBaseConfiguration.saveSnapshot2Endpoint, {
						method: "POST",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						},
						body: JSON.stringify(oBody)
					}).then(function (response) {
						return response.text();
					}).then(function (responseText) {
						console.log("Step 4 - Uploading file");
						console.log(responseText);
						MessageToast.show("File uploaded successfully...  Response from server: " + responseText);
						//Pause for processing time.  10 seconds.
						resolve()
					})
					.catch((error) => {
						me._setBusy(false);
						MessageToast.show("Unable to upload file...  Error: " + error);
						reject()
					});
			});
			return snapshotPromise;
		},
		getShoppingCart: function (oContext, shoppingCart) {
			var me = this;
			me._setBusy(oContext, true);
			var shoppingCartModel = oContext.getModel("shoppingCartModel");
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var shoppingCartPromise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.shoppingCartEndpoint, "", shoppingCart), {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						var parseResponse = {};
						try {
							parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
						}
						console.log("Step 1 - Getting Shopping Cart info");
						if (!parseResponse) {
							console.log(responseText);
						} else if (parseResponse.errors || !parseResponse.header || !parseResponse.header.status) {
							MessageToast.show("Invalid Shopping Cart Number received, try again.");
							sap.ui.getCore().getEventBus().publish("sap.challenge.mtshelf.mtshelf_associate", "CloseSC", {});
						} else {
							if (parseResponse.header.status === "A") {
								oContext.getModel("baseConfigurationModel").setProperty("/allowSCEdit", true);
							} else {
								oContext.getModel("baseConfigurationModel").setProperty("/allowSCEdit", false);
							}
							shoppingCartModel.setData(parseResponse);
							shoppingCartModel.refresh(true);
						}
						me._setBusy(oContext, false);
						resolve(parseResponse);
					})
					.catch((error) => {
						MessageToast.show("Unable to retrieve Shopping Cart Information...  Error: " + error);
						me._setBusy(oContext, false);
						reject(error);
					});
			});
			return shoppingCartPromise;
		},
		deleteItemFromShoppingCart: function (oContext, shoppingCart, upc) {
			var me = this;
			me._setBusy(oContext, true);
			var shoppingCartModel = oContext.getModel("shoppingCartModel");
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var promise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.deleteShoppingCartItem, "", shoppingCart, upc), {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
						}
						console.log("Deleting Item from Shopping Cart");
						shoppingCartModel.setData(parseResponse);
						shoppingCartModel.refresh(true);
						me._setBusy(oContext, false);
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to delete item from Shopping Cart...  Error: " + error);
						me._setBusy(oContext, false);
						reject();
					});
			});
			return promise;
		},
		getShoppingCartTax: function (oContext, shoppingCart) {
			var me = this;
			me._setBusy(oContext, true);
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var promise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.shoppingCartTax, shoppingCart), {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						var parseResponse = {};
						try {
							parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
						}
						console.log("Get Shopping Cart Tax");
						me._setBusy(oContext, false);
						resolve(parseResponse);
					})
					.catch((error) => {
						MessageToast.show("Unable to get Shopping Cart Tax...  Error: " + error);
						me._setBusy(oContext, false);
						reject();
					});
			});
			return promise;
		},

		decrementItemFromShoppingCart: function (oContext, shoppingCart, upc) {
			var me = this;
			me._setBusy(oContext, true);
			var shoppingCartModel = oContext.getModel("shoppingCartModel");
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var promise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.decrementShoppingCartItem, "", shoppingCart,
						upc), {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
						}
						console.log("Decrementing Item from Shopping Cart");
						shoppingCartModel.setData(parseResponse);
						shoppingCartModel.refresh(true);
						me._setBusy(oContext, false);
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to decrement item from Shopping Cart...  Error: " + error);
						me._setBusy(oContext, false);
						reject();
					});
			});
			return promise;
		},
		addItemToShoppingCart: function (oContext, shoppingCart, upc) {
			var me = this;
			me._setBusy(oContext, true);
			var shoppingCartModel = oContext.getModel("shoppingCartModel");
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var upcModelPromise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.addShoppingCartItem, "", shoppingCart, upc,
						"A"), {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
							throw error;
						}
						console.log("Step 1 - Getting UPC info");
						shoppingCartModel.setData(parseResponse.shoppingCart);
						shoppingCartModel.refresh(true);
						me._setBusy(oContext, false);
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to add item to Shopping Cart...  Error: " + error);
						me._setBusy(oContext, false);
						reject();
					});
			});
			return upcModelPromise;
		},
		updateLocation: function (oContext, upc, aisle, area) {
			var me = this;
			me._setBusy(oContext, true);
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var locationPromise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.updateLocationEndpoint, upc, aisle, area), {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
							throw error;
						}
						console.log("Step 1 - Updating Location Info");
						me.updateUPCData(oContext, parseResponse);
						me._setBusy(oContext, false);
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to update location info...  Error: " + error);
						me._setBusy(oContext, false);
						reject();
					});
			});
			return locationPromise;
		},
		updateCycleCount: function (oContext, upc, quantity) {
			var me = this;
			me._setBusy(oContext, true);
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var cycleCountPromise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.cycleCountEndpoint, upc, quantity), {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
							throw error;
						}
						console.log("Step 1 - Getting Updating Cycle Count info");
						me.updateUPCData(oContext, parseResponse);
						me._setBusy(oContext, false);
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to update cycle count...  Error: " + error);
						me._setBusy(oContext, false);
						reject();
					});
			});
			return cycleCountPromise;
		},
		updatePromotionStatus: function (oContext, promotion, status) {
			var me = this;
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var locationPromise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.updatePromotionStatusEndpoint, promotion,
						status), {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
							throw error;
						}
						console.log("Step 1 - Updating Promotion Status");
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to update promotion status...  Error: " + error);
						reject();
					});
			});
			return locationPromise;
		},
		updateUPCData: function (oContext, upcData) {
			var upcModel = oContext.getModel("upcList");
			var upcs = upcModel.getProperty("/UPCs");
			var finished = false;
			for (var i = 0; i < upcs.length; i++) {
				if (upcs[i].item.upc === upcData.item.upc) {
					upcs[i] = upcData;
					finished = true;
					i = upcs.length;
				}
			}
			if (!finished) {
				upcs.unshift(upcData);
			}
			upcModel.refresh(true);
			// Also refresh the current UPC model to update displays
			this.updateCurrentUPCifNecessary(oContext, upcData);
		},
		updateCurrentUPCifNecessary: function (oContext, upcData) {
			var oUPCModel = oContext.getModel("currentUPC");
			oUPCModel.setData(upcData);
			oUPCModel.refresh(true);
			// Changed to update every time
			//var oUPC = oUPCModel.getData();
			//if (oUPC.item && oUPC.item.upc && (oUPC.item.upc === upcData.item.upc)) {
			//	oUPCModel.setData(upcData);
			//	oUPCModel.refresh(true);
			//}
		},
		getAppKey: function (oContext) {
			var userModel = oContext.getModel("userModel");
			return userModel.getProperty("/id");
		},
		setMemory: function (oContext, oMemory) {
			var oModel = oContext.getModel("memoryModel");
			oModel.setData(oMemory);
		},
		getMemory: function (oContext) {
			var oModel = oContext.getModel("memoryModel");
			var oMemory = oModel.getData();
			return oMemory;
		},
		cycleCount: function (oContext, upcData) {
			var upc = upcData.item.upc;
			var me = this;
			var quantity = 0.00;
			var dialog = new sap.m.Dialog({
				title: "Cycle Count for " + upcData.item.name,
				type: 'Message',
				content: [
					new sap.m.FormattedText({
						width: '100%',
						htmlText: "Existing count: <strong>" + formatter.quantity(upcData.inventory.quantity) +
							"</strong> EA, Location - Aisle/Area: <strong>" + upcData.inventory.aisle + "/" + upcData.inventory.area + "</strong>"
					}),
					new sap.m.Label({
						width: '100%',
						text: 'How many units are in the location? (EA)',
						labelFor: 'quantityInput'
					}),
					new sap.m.Input('quantityInput', {
						width: '100%',
						placeholder: 'Enter new inventory quantity'
					})
				],
				beginButton: new sap.m.Button({
					text: 'Submit',
					enabled: true,
					press: function () {
						quantity = sap.ui.getCore().byId('quantityInput').getValue();
						dialog.setBusy(true);
						var oPromise = me.updateCycleCount(oContext.getOwnerComponent(), upc, quantity);
						oPromise.then(function () {
							dialog.setBusy(false);
							dialog.close();
						});
					}
				}),
				endButton: new sap.m.Button({
					text: 'Cancel',
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},
		moveProduct: function (oContext, upcData) {
			var upc = upcData.item.upc;
			var me = this;
			var aisle = "";
			var area = "";
			var dialog = new sap.m.Dialog({
				title: "Inventory Move for " + upcData.item.name,
				type: 'Message',
				content: [
					new sap.m.FormattedText({
						width: '100%',
						htmlText: "Current Location - Aisle/Area: <strong>" + upcData.inventory.aisle + "/" + upcData.inventory.area +
							"</strong>  Current count: <strong>" + formatter.quantity(upcData.inventory.quantity) + "</strong> EA"
					}),
					new sap.m.Input('aisleInput', {
						width: '100%',
						placeholder: 'Enter New Aisle 1-14',
						liveChange: me._onAisleChange
					}),
					new sap.m.Input('areaInput', {
						width: '100%',
						placeholder: 'Enter New Area A-K',
						liveChange: me._onAreaChange
					})
				],
				beginButton: new sap.m.Button({
					text: 'Submit',
					enabled: true,
					press: function () {
						aisle = sap.ui.getCore().byId('aisleInput').getValue();
						area = sap.ui.getCore().byId('areaInput').getValue();
						dialog.setBusy(true);
						var oPromise = me.updateLocation(oContext.getOwnerComponent(), upc, aisle, area);
						oPromise.then(function () {
							dialog.setBusy(false);
							dialog.close();
						})
					}
				}),
				endButton: new sap.m.Button({
					text: 'Cancel',
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},
		_urlWithQueryParam: function (url, value1, value2, value3, value4) {
			var intermediateUrl = url;
			if (value4) {
				intermediateUrl = intermediateUrl.replace("'val4'", `'${value4}'`);
			}
			if (value3) {
				intermediateUrl = intermediateUrl.replace("'val3'", `'${value3}'`);
			}
			if (value2) {
				intermediateUrl = intermediateUrl.replace("'val2'", `'${value2}'`);
			}
			return intermediateUrl.replace("'val1'", `'${value1}'`);
		},
		_setBusy: function (oContext, busy) {
			if (busy) {
				oContext.getModel("appView").setProperty("/busy", true);
			} else {
				oContext.getModel("appView").setProperty("/busy", false);
			}
		},
		_onAreaChange: function (oEvent) {
			if (oEvent) {
				var newValue = oEvent.getParameter("newValue");
				if (newValue.length === 0 || (newValue.length === 1 && newValue.match(/[A-K]/i))) {
					this.setValueState(sap.ui.core.ValueState.Success);
					this.setValueStateText("");
				} else {
					this.setValueState(sap.ui.core.ValueState.Error);
					this.setValueStateText("Only values A-K are allowed");
				}
			}
		},
		_onAisleChange: function (oEvent) {
			if (oEvent) {
				var newValue = oEvent.getParameter("newValue");
				if (newValue.length === 0 || (newValue.length < 3 && !isNaN(newValue) && newValue > 0 && newValue < 15)) {
					this.setValueState(sap.ui.core.ValueState.Success);
					this.setValueStateText("");
				} else {
					this.setValueState(sap.ui.core.ValueState.Error);
					this.setValueStateText("Only values 1-14 are allowed");
				}
			}
		},
		initializeShopperNotifications: function (oContext) {
			var me = this;
			// Web Chat
			// Change for Central Deployment
			var connection = new WebSocket('wss://c2ibcderufguuam0r-mtshelf-node-ws.cfapps.eu10.hana.ondemand.com/mtshelf_node_ws/ws/shopper'); // Works
			//var connection = new WebSocket('/mtshelf_node_ws/ws/associate');
			this._wsSConnection = connection;
			connection.attachOpen(function (oControlEvent) {
				MessageToast.show("connection opened");
			});

			// server messages
			connection.attachMessage(function (oControlEvent) {
				var message = oControlEvent.getParameter("data");
				try {
					var oData = JSON.parse(message);
					var oResponse = {
						type: "",
						user: ""
					}
					if (oData.type === 'init') {
						var userModel = oContext.getOwnerComponent().getModel("userModel");
						oResponse.type = 'init';
						oResponse.user = userModel.getProperty("/id");
						connection.send(JSON.stringify(oResponse));
					} else if (oData.type === 'refreshSC') {
						sap.ui.getCore().getEventBus().publish("sap.challenge.mtshelf.mtshelf_associate", "RefreshSC", {});
					}
				} catch (err) {
					MessageToast.show("Incorrect Message Received: " + message);
				}
			});

			// error handling
			connection.attachError(function (oControlEvent) {
				MessageToast.show("Websocket connection error");
			});

			// onConnectionClose
			connection.attachClose(function (oControlEvent) {
				MessageToast.show("Websocket connection closed");
				me.initializeShopperNotifications(oContext);
			});
		},
		initializeAssociateNotifications: function (oContext) {
			var me = this;
			// Web Chat
			// Change for Central Deployment
			var connection = new WebSocket('wss://c2ibcderufguuam0r-mtshelf-node-ws.cfapps.eu10.hana.ondemand.com/mtshelf_node_ws/ws/associate'); // Works
			//var connection = new WebSocket('/mtshelf_node_ws/ws/associate');
			this._wsAConnection = connection;
			connection.attachOpen(function (oControlEvent) {
				MessageToast.show("connection opened");
			});

			// server messages
			connection.attachMessage(function (oControlEvent) {
				var message = oControlEvent.getParameter("data");
				try {
					var oData = JSON.parse(message);
					var oResponse = {
						type: "",
						user: ""
					}
					if (oData.type === 'init') {
						var userModel = oContext.getOwnerComponent().getModel("userModel");
						oResponse.type = 'init';
						oResponse.user = userModel.getProperty("/id");
						connection.send(JSON.stringify(oResponse));
					} else if (oData.type === 'paymentFinished') {
						me.finishCheckOutAssociate(oContext);
					} else if (oData.type === 'refreshSC') {
						sap.ui.getCore().getEventBus().publish("sap.challenge.mtshelf.mtshelf_associate", "RefreshSC", {});
					} else {

					}
				} catch (err) {
					MessageToast.show("Incorrect Message Received: " + message);
				}
			});

			// error handling
			connection.attachError(function (oControlEvent) {
				MessageToast.show("Websocket connection error");
			});

			// onConnectionClose
			connection.attachClose(function (oControlEvent) {
				MessageToast.show("Websocket connection closed");
				me.initializeAssociateNotifications(oContext);
			});
		},
		registerAssociateForShoppingCartNotifications: function (oContext, shoppingCart) {
			var oMessage = {};
			var userModel = oContext.getOwnerComponent().getModel("userModel");
			oMessage.type = "initShoppingCart";
			oMessage.user = userModel.getProperty("/id");
			oMessage.shoppingCart = shoppingCart;
			this._wsAConnection.send(JSON.stringify(oMessage));
		},
		deregisterAssociateForShoppingCartNotifications: function (oContext) {
			var oMessage = {};
			var userModel = oContext.getOwnerComponent().getModel("userModel");
			oMessage.type = "dropShoppingCart";
			oMessage.user = userModel.getProperty("/id");
			this._wsAConnection.send(JSON.stringify(oMessage));
		},
		validateShoppingCart: function (oContext) {
			var shoppingCart = this.getBaseConfiguration(oContext).shoppingCart;
			if (!shoppingCart) {
				MessageToast.show("There is no cart to validate");
				return false;
			} else {
				// Validate Cart
				var valid = true;
				var upcModel = oContext.getModel("upcList");
				var upcs = upcModel.getProperty("/UPCs");
				var finished = false;
				for (var i = 0; i < upcs.length; i++) {
					if (!upcs[i].item.weight || upcs[i].item.weight === 0) {
						valid = false;
						i = upcs.length;
					}
				}
				return valid;
			}
		},
		startCheckOutAssociate: function (oContext) {
			var shoppingCartModel = oContext.getModel("shoppingCartModel");
			var shoppingCart = shoppingCartModel.getProperty("/header/autoId");
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var me = this;
			var dialog = new sap.m.Dialog({
				title: "Final Check Out",
				type: 'Message',
				content: [
					new sap.m.FormattedText({
						width: '100%',
						htmlText: "Current Status: <strong>Waiting for payment from customer</strong>"
					})
				],
				endButton: new sap.m.Button({
					text: 'Cancel',
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
			this._sCOADialog = dialog;
			var promise = this.getShoppingCartTax(oContext, shoppingCart);
			promise.then(function (oData) {
				var oMessage = {};
				var shoppingCartFull = shoppingCartModel.getData();
				oMessage.type = "initializePayment";
				oMessage.subtotal = shoppingCartFull.header.totalCost;
				oMessage.tax = oData.taxAmount.toString();
				var total = Math.round((parseFloat(oMessage.subtotal) + parseFloat(oMessage.tax)) * 100) / 100;
				oMessage.total = total.toString();
				oMessage.weight = shoppingCartFull.header.totalWeight;
				oMessage.shoppingCart = shoppingCartFull.header.autoId;
				oMessage.appKey = shoppingCartFull.header.appKey;
				me._wsAConnection.send(JSON.stringify(oMessage));
			});
		},
		finishCheckOutAssociate: function (oContext) {
			var shoppingCartModel = oContext.getModel("shoppingCartModel");
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			this._sCOADialog.close();
			sap.ui.getCore().getEventBus().publish("sap.challenge.mtshelf.mtshelf_associate", "CheckOutComplete", {});
			MessageToast.show("Checkout Complete!");
		},
		changeSCStatus: function (oContext, shoppingCart, status) {
			var me = this;
			me._setBusy(oContext, true);
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var promise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + me._urlWithQueryParam(oBaseConfiguration.changeSCStatusEndpoint, shoppingCart, status), {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
							throw error;
						}
						console.log("Updating Shopping Cart Status");
						me.updateUPCData(oContext, parseResponse);
						me._setBusy(oContext, false);
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to update shopping cart status...  Error: " + error);
						me._setBusy(oContext, false);
						reject();
					});
			});
			return promise;
		},
		clearShoppingCart: function (oContext) {
			var emptyObject = {};
			oContext.getModel("shoppingCartModel").setData(emptyObject);
			oContext.getModel("shoppingCartModel").refresh(false);
			oContext.getModel("baseConfigurationModel").setProperty("/allowSCEdit", false);
			oContext.getModel("baseConfigurationModel").setProperty("/shoppingCart", "");
			oContext.getModel("baseConfigurationModel").refresh(false);
		},
		updatePromotionList: function (oContext, oPromotions) {
			oContext.getOwnerComponent().getModel("promotionList").setData(oPromotions);
			oContext.getOwnerComponent().getModel("promotionList").refresh(false);
		},
		refreshPromotionList: function (oContext) {
			var me = this;
			me._setBusy(oContext, true);
			var oBaseConfiguration = this.getBaseConfiguration(oContext);
			var promise = new Promise(function (resolve, reject) {
				fetch(oBaseConfiguration.hana2Destination + oBaseConfiguration.getPromotionsEndpoint, {
						method: "GET",
						headers: {
							"Authorization": "Bearer " + oContext.getModel("accessTokenModel").getProperty("/access_token")
						}
					}).then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(responseText);
							throw error;
						}
						console.log("Updating Promotions List");
						me.updatePromotionList(oContext, parseResponse);
						me._setBusy(oContext, false);
						resolve();
					})
					.catch((error) => {
						MessageToast.show("Unable to update promotions list...  Error: " + error);
						me._setBusy(oContext, false);
						reject();
					});
			});
			return promise;
		}
	};
});