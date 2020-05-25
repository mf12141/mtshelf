sap.ui.define([
	"sap/challenge/mtshelf/mtshelf_associate/controller/BaseController",
	"sap/challenge/mtshelf/mtshelf_associate/utils/ServiceUtils",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast"
], function (BaseController, ServiceUtils, JSONModel, MessageToast) {
	
	"use strict";

	return BaseController.extend("sap.challenge.mtshelf.mtshelf_associate.controller.App", {
		onInit : function () {
			var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			oViewModel = new JSONModel({
				busy : true,
				delay : 0,
				layout : "TwoColumnsMidExpanded",
				smallScreenMode : true
			});
			this.getOwnerComponent().setModel(oViewModel, "appView");
			this.getOwnerComponent().getModel("upcList").setProperty("/UPCs",[]);
			fnSetAppNotBusy = function() {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};
			var userModelPromise = ServiceUtils.getUserModel(this.getOwnerComponent());
			var uuidTokenPromise = ServiceUtils.getUUIDFromChatBot(this.getOwnerComponent());
			var accessTokenPromise = ServiceUtils.getAccessToken(this.getOwnerComponent());
			Promise.all([userModelPromise, uuidTokenPromise, accessTokenPromise]).then(function (values) {
				// Should now have all the information updated
				fnSetAppNotBusy();
			});

			// since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
			//this.getOwnerComponent().getModel().metadataLoaded().then(fnSetAppNotBusy);
			//this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			this.getRouter().navTo("home");
			//sap.ui.getCore().applyTheme("mtshelft","https://mtshelft-h05f96198.dispatcher.us3.hana.ondemand.com");
		}
	});
});