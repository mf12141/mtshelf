sap.ui.define([
	"sap/challenge/mtshelf/mtshelf_web/controller/BaseController",
	"sap/challenge/mtshelf/mtshelf_web/utils/ServiceUtils",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/Label"
], function (BaseController, ServiceUtils, JSONModel, Filter, Button, Dialog, Label) {
	"use strict";

	return BaseController.extend("sap.challenge.mtshelf.mtshelf_web.controller.Initial", {
		onInit: function () {
			var me = this;
			var finished = false;
			if (!finished) {
				finished = true;
				var viewModel = new JSONModel({
					shopIcon: "./imgs/home_active.png",
					accountIcon: "./imgs/account.png",
					cartIcon: "./imgs/shopping_cart.png",
					helpIcon: "./imgs/help.png",
					toolbarText: "Deals For You!",
					navButton: false
				});
				this.getView().setModel(viewModel, "viewModel");
				var oViewModel = new JSONModel({
					busy: true,
					delay: 0,
					scanVisible: false
				});
				this.getOwnerComponent().setModel(oViewModel, "appView");
				var userModelPromise = ServiceUtils.getUserModel(this.getOwnerComponent());
				var uuidTokenPromise = ServiceUtils.getUUIDFromChatBot(this.getOwnerComponent());
				var accessTokenPromise = ServiceUtils.getAccessToken(this.getOwnerComponent());

				Promise.all([userModelPromise, uuidTokenPromise, accessTokenPromise]).then(function (values) {
					// Should now have all the information updated
					me.getModel("appView").setProperty("/busy", false);
					me.getModel("appView").setProperty("/delay", 0);
					ServiceUtils.initializeShopperNotifications(me);
					ServiceUtils.getShoppingCart(me.getOwnerComponent(), ServiceUtils.getAppKey(me.getOwnerComponent()));
					ServiceUtils.refreshPromotionList(me);
				});
			}
			// this.router = this.getOwnerComponent().getRouter();
			// this.getView().addEventDelegate({
			// 	onAfterShow: function (event) {
			// 		this.router.navTo("homeView");
			// 	}
			// }, this);
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("homeView");
		},
		onShop: function (oEvent) {
			this.getView().getModel("viewModel").setProperty("/shopIcon", "./imgs/home_active.png");
			this.getView().getModel("viewModel").setProperty("/accountIcon", "./imgs/account.png");
			this.getView().getModel("viewModel").setProperty("/cartIcon", "./imgs/shopping_cart.png");
			this.getView().getModel("viewModel").setProperty("/helpIcon", "./imgs/help.png");
			this.byId("shopText").addStyleClass("footerTextActive");
			this.byId("accountText").removeStyleClass("footerTextActive");
			this.byId("cartText").removeStyleClass("footerTextActive");
			this.byId("helpText").removeStyleClass("footerTextActive");

			this.getView().getModel("viewModel").setProperty("/navButton", false);
			this.getView().getModel("viewModel").setProperty("/toolbarText", "Deals For You!");

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("homeView");

		},
		onAccount: function () {
			this.getView().getModel("viewModel").setProperty("/shopIcon", "./imgs/home.png");
			this.getView().getModel("viewModel").setProperty("/accountIcon", "./imgs/account_active.png");
			this.getView().getModel("viewModel").setProperty("/cartIcon", "./imgs/shopping_cart.png");
			this.getView().getModel("viewModel").setProperty("/helpIcon", "./imgs/help.png");
			this.byId("shopText").removeStyleClass("footerTextActive");
			this.byId("accountText").addStyleClass("footerTextActive");
			this.byId("cartText").removeStyleClass("footerTextActive");
			this.byId("helpText").removeStyleClass("footerTextActive");

			this.getView().getModel("viewModel").setProperty("/navButton", true);
			this.getView().getModel("viewModel").setProperty("/toolbarText", "My Account");

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("accountView");
		},
		onHelp: function () {
			this.getView().getModel("viewModel").setProperty("/shopIcon", "./imgs/home.png");
			this.getView().getModel("viewModel").setProperty("/accountIcon", "./imgs/account.png");
			this.getView().getModel("viewModel").setProperty("/cartIcon", "./imgs/shopping_cart.png");
			this.getView().getModel("viewModel").setProperty("/helpIcon", "./imgs/help_active.png");
			this.byId("shopText").removeStyleClass("footerTextActive");
			this.byId("accountText").removeStyleClass("footerTextActive");
			this.byId("cartText").removeStyleClass("footerTextActive");
			this.byId("helpText").addStyleClass("footerTextActive");

			this.getView().getModel("viewModel").setProperty("/navButton", true);
			this.getView().getModel("viewModel").setProperty("/toolbarText", "Help");

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("helpView");
		}
	});
});