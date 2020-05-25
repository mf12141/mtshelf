/*global history */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/challenge/mtshelf/mtshelf_associate/utils/ServiceUtils"
], function (Controller, History, MessageBox, MessageToast, ServiceUtils) {
	"use strict";

	return Controller.extend("sap.challenge.mtshelf.mtshelf_associate.controller.BaseController", {

		// hana2Destination: "/xsjs",
		// registration2Endpoint: "/CheckCustomer.xsjs?email='val1'",
		// saveSnapshot2Endpoint: "/SaveSnapshot2.xsjs",
		// analyzeImage2Endpoint: "/AnalyzeImagesTrigger.xsjs?appKey='val1'",
		// detectedProduct2Endpoint: "/GetDetectedProduct.xsjs?appKey='val1'",
		// salesOrder2Endpoint: "/SubmitSalesOrder.xsjs?customer='val1'&partNumber='val2'",
		// imageType: "P",
		// csrfToken: "",

		// convAiDestination: "/build/v1/dialog",
		// convAiUUIDDestination: "/auth/v1/owners",

		// // Conversational AI Settings
		// requestToken: "4428401fab47fba67e86839bd9109eff",
		// slug: "/greghawkins",
		// uuid: "",
		// oauthDestination: "/oauth",
		// oauthEndpoint: "/token?grant_type=client_credentials",

		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getOwnerComponent().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler  for navigating back.
		 * It checks if there is a history entry. If yes, history.go(-1) will happen.
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {
				// Otherwise we go backwards with a forward history
				var bReplace = true;
				this.getRouter().navTo("appHome", {}, bReplace);
			}
		},

		// setUserModel: function () {

		// 	var me = this;
		// 	var userModel = this.getOwnerComponent().getModel("userModel");

		// 	let userModelPromise = new Promise(function (resolve, reject) {

		// 		fetch("/mtshelf_node/getUserInfo")
		// 			.then((response) => response.json())
		// 			.then((parseResponse) => {

		// 				console.log("Step 1 - Getting user info");
		// 				userModel.setData(parseResponse);
		// 				var memory = {
		// 					"customeremail": userModel.getProperty("/name")
		// 				};
		// 				me.setMemory(memory);
		// 				resolve();
		// 			})
		// 			.catch((error) => {
		// 				MessageToast.show("Unable to retrieve user information...  Error: " + error);
		// 				reject();
		// 			});

		// 	});

		// 	return userModelPromise;

		// },

		// // HANA Database Services 

		// // This call is made when the application starts
		// // This gets a valid oAuth token for uploading images to SAP HANA - note this wouldn't really be necessary
		// // because all the components share the same UAA - It was left here as a proof of concept.
		// getAccessToken: function () {

		// 	var me = this;
		// 	var accessTokenModel = this.getModel("accessTokenModel");

		// 	let accessTokenPromise = new Promise(function (resolve, reject) {
		// 		var promise = fetch('/mtshelf_node/getAccessToken', {
		// 		});
		// 		promise.then((response) => {
		// 				if (!response.ok) {
		// 					MessageToast.show("HTTP error, status = " + response.status);
		// 					throw new Error("HTTP error, status = " + response.status);
		// 					reject();
		// 				}
		// 				return response.json();
		// 			})
		// 			.then((parseResponse) => {

		// 				console.log("Step 2 - Getting Access Token");
		// 				accessTokenModel.setData(parseResponse);

		// 				resolve();
		// 			})
		// 			.catch((error) => {
		// 				MessageToast.show("Unable to retrieve csrf token...  Error: " + error);
		// 				reject();
		// 			});

		// 	});

		// 	return accessTokenPromise;

		// },

		// This call is made after an image has been successfully uploaded
		// This triggers the image recognition analysis on the backend
		triggerAnalyzeImage: function () {
			var me = this;
			var baseConfiguration = ServiceUtils.getBaseConfiguration(this.getOwnerComponent());
			var userModel = this.getModel("userModel");
			var accessTokenModel = this.getModel("accessTokenModel");

			var triggerAnalyzeImagePromise = new Promise(function (resolve, reject) {

				var url = baseConfiguration.hana2Destination + me.urlWithQueryParam(baseConfiguration.analyzeImage2Endpoint, ServiceUtils.getAppKey(
					me.getOwnerComponent()));
				console.log(url);

				var promise = fetch(url, {

					headers: {
						"Authorization": "Bearer " + accessTokenModel.getProperty("/access_token")
					}
				});

				promise
					.then((response) => response.text())
					.then((parseResponse) => {

						console.log("Step 6 - Trigger analyze image");
						resolve(parseResponse);

					})
					.catch((error) => reject(error))

			});

			return triggerAnalyzeImagePromise;
		},

		// This call is made after the image recognition in the backend is complete
		// This gets the image that was detected by the backend
		getDetectedImage: function () {
			var me = this;
			me._setBusy(true);
			var baseConfiguration = ServiceUtils.getBaseConfiguration(this.getOwnerComponent());
			var detectedImageModel = this.getModel("detectedImageModel");
			var userModel = this.getModel("userModel");
			var accessTokenModel = this.getModel("accessTokenModel");

			var detectedImagePromise = new Promise(function (resolve, reject) {

				var url = baseConfiguration.hana2Destination + me.urlWithQueryParam(baseConfiguration.detectedProduct2Endpoint, me.getAppKey());
				console.log(url);

				let promise = fetch(url, {

					headers: {
						"Authorization": "Bearer " + accessTokenModel.getProperty("/access_token")
					}
				});

				promise
					.then(function (response) {
						return response.text();
					})
					.then(function (responseText) {
						try {
							var parseResponse = JSON.parse(responseText);
						} catch (error) {
							console.log(error);
							console.log(responseText);
							me._setBusy(false);
							reject();
						}
						console.log("Step 7 - Getting detected image");
						if (parseResponse && parseResponse.item) {
							//parseResponse.item.image = "data:image/bmp;base64," + parseResponse.item.image;
							parseResponse.apiVersion = "1.0";
							detectedImageModel.setData(parseResponse);
						} else {
							console.log("Something wrong with response: " + JSON.stringify(parseResponse));
							me._setBusy(false);
							reject();
						}
						me._setBusy(false);
						resolve(parseResponse);
					})
					.catch((error) => {
						me._setBusy(false);
						reject(error);
					})
			});

			return detectedImagePromise;
		},

		createSalesOrder: function () {

			let me = this;
			var baseConfiguration = ServiceUtils.getBaseConfiguration(this.getOwnerComponent());
			let userModel = this.getModel("userModel");
			let customerModel = this.getModel("customerModel");
			let salesOrderModel = this.getModel("salesOrderModel");
			let detectedImageModel = this.getModel("detectedImageModel");
			let accessTokenModel = this.getModel("accessTokenModel");

			let createSalesOrderPromise = new Promise(function (resolve, reject) {

				let url = baseConfiguration.hana2Destination + me.urlWithQueryParam(baseConfiguration.salesOrder2Endpoint, customerModel.getProperty(
						"/customer"),
					detectedImageModel.getProperty("/product"));
				//let url = me.hanaDestination + me.urlWithQueryParam(me.salesOrderEndpoint, '1000054', 'LEGO303926');

				console.log(url);

				let promise = fetch(url, {
					headers: {
						"Authorization": "Bearer " + accessTokenModel.getProperty("/access_token")
					}
				});

				promise
					.then((response) => response.json())
					.then((parseResponse) => {

						console.log("Step 8 - Creating sales order");
						salesOrderModel.setData(parseResponse);
						resolve(parseResponse);

					})
					.catch((error) => reject(error))
			});

			return createSalesOrderPromise;
		},

		// // SAP ConversationalAI 

		// // This call is made when the application starts
		// // Get access token from Chat Bot using SAP Conversational AI API
		// getUUIDFromChatBot: function () {

		// 	let me = this;

		// 	let convAiUUIDPromise = new Promise(function (resolve, reject) {

		// 		let promise = fetch(me.convAiUUIDDestination + me.slug, {
		// 			headers: {
		// 				"Authorization": me.requestToken
		// 			}
		// 		});

		// 		promise
		// 			.then((response) => response.json())
		// 			.then((parseData) => {
		// 				me.uuid = parseData.results.owner.id;

		// 				console.log("Step 3 - Getting conversational AI UUID");
		// 				resolve();
		// 			})
		// 			.catch((error) => {
		// 				MessageToast.show("Unable to retrieve uuid...  Error: " + error);
		// 				reject();
		// 			});

		// 	});

		// 	return convAiUUIDPromise;
		// },

		urlWithQueryParam: function (url, value1, value2) {

			if (value2) {

				let intermediateUrl = url.replace("'val1'", `'${value1}'`);
				return intermediateUrl.replace("'val2'", `'${value2}'`);

			}

			return url.replace("'val1'", `'${value1}'`);
		},
		getAppKey: function () {
			let userModel = this.getModel("userModel");
			return userModel.getProperty("/id");
		},
		setMemory: function (memory) {
			var oModel = this.getModel("memoryModel");
			oModel.setData(memory);
		},
		getMemory: function () {
			var oModel = this.getModel("memoryModel");
			var memory = oModel.getData();
			return memory;
		},
		/**
		 * React to FlexibleColumnLayout resize events
		 * Hides navigation buttons and switches the layout as needed
		 * @param {sap.ui.base.Event} oEvent the change event
		 */
		onStateChange: function (oEvent) {
			var sLayout = oEvent.getParameter("layout"),
				iColumns = oEvent.getParameter("maxColumnsCount");

			if (iColumns === 1) {
				this.getModel("appView").setProperty("/smallScreenMode", true);
			} else {
				this.getModel("appView").setProperty("/smallScreenMode", false);
				// swich back to two column mode when device orientation is changed
				if (sLayout === "OneColumn") {
					this._setLayout("Two");
				}
			}
		},
		/**
		 * Sets the flexible column layout to one, two, or three columns for the different scenarios across the app
		 * @param {string} sColumns the target amount of columns
		 * @private
		 */
		_setLayout: function (sColumns) {
			if (sColumns) {
				this.getModel("appView").setProperty("/layout", sColumns + "Column" + (sColumns === "One" ? "" : "sMidExpanded"));
			}
		},
		_setBusy: function (busy) {
			if (busy) {
				this.getOwnerComponent().getModel("appView").setProperty("/busy", true);
			} else {
				this.getOwnerComponent().getModel("appView").setProperty("/busy", false);
			}
		}
	});
});