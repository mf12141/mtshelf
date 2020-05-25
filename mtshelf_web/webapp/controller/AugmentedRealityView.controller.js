sap.ui.define([
		"sap/challenge/mtshelf/mtshelf_web/controller/BaseController",
		"sap/challenge/mtshelf/mtshelf_web/utils/ServiceUtils",
		"sap/ui/model/json/JSONModel",
		"sap/m/MessageToast"
	],
	function (BaseController, ServiceUtils, JSONModel, MessageToast) {
		"use strict";

		return BaseController.extend("sap.challenge.mtshelf.mtshelf_web.controller.AugmentedRealityView", {
			/****************************
			 * LIFECYCLE METHODS BEGIN	*
			 ****************************/

			/**
			 * This method is called upon initialization of the View. The controller can perform its internal setup 
			 * in this hook. It is only called once per View instance, unlike the onBeforeRendering and 
			 * onAfterRendering hooks. (Even though this method is declared as "abstract", it does not need to be 
			 * defined in controllers, if the method does not exist, it will simply not be called.)
			 */
			onInit: function () {
				var me = this;
				this._oRouter = this.getRouter();
				this._oRouter.getRoute("AugmentedRealityView").attachPatternMatched(this._routePatternMatched, this);
				var oEventBus = sap.ui.getCore().getEventBus();
				oEventBus.subscribe("sap.challenge.mtshelf.mtshelf_web", "CouponSelected", function (sChannelId, sEventId, oData) {
					this.onCouponSelected(oData);
				}, this);
				oEventBus.subscribe("sap.challenge.mtshelf.mtshelf_web", "UpdateIFrame", function (sChannelId, sEventId, oData) {
					ServiceUtils.updateIFrame(me,oData);
				}, this);
				oEventBus.subscribe("sap.challenge.mtshelf.mtshelf_web", "RefreshPromotions", function (sChannelId, sEventId, oData) {
					ServiceUtils.refreshPromotionList(me);
				}, this);
			},
			_routePatternMatched: function () {
				ServiceUtils.refreshPromotionList(this);
			},

			/**
			 * This method is called upon desctuction of the View. The controller should perform its internal 
			 * destruction in this hook. It is only called once per View instance, unlike the onBeforeRendering 
			 * and onAfterRendering hooks. (Even though this method is declared as "abstract", it does not need 
			 * to be defined in controllers, if the method does not exist, it will simply not be called.)
			 */
			onExit: function () {

			},

			/**
			 * This method is called every time the View is rendered, after the HTML is placed in the DOM-Tree. 
			 * It can be used to apply additional changes to the DOM after the Renderer has finished. (Even 
			 * though this method is declared as "abstract", it does not need to be defined in controllers, 
			 * if the method does not exist, it will simply not be called.)
			 */
			onAfterRendering: function () {
			},

			/**
			 * This method is called every time the View is rendered, before the Renderer is called and the 
			 * HTML is placed in the DOM-Tree. It can be used to perform clean-up-tasks before re-rendering. 
			 * (Even though this method is declared as "abstract", it does not need to be defined in 
			 * controllers, if the method does not exist, it will simply not be called.)
			 */
			onBeforeRendering: function () {

			},
			onCouponSelected: function (oData) {
				var couponText = "";
				var Coupon2 = '045000201901';
				var Coupon2Text = "Adding Coupon for Jell-O to cart";
				var Coupon1 = '045000201902';
				var Coupon1Text = "Adding Coupon for Pure Protein Bars to cart";
				var Coupon3 = '045000201903';
				var Coupon3Text = "Adding Coupon for Red Bull to cart";
				var Coupon4 = '045000201904';
				var Coupon4Text = "Adding Coupon for Toblerone to cart";
				var shoppingCart = ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart;
				if (oData.coupon === "Coupon1") {
					ServiceUtils.addPromotionToCart(this, shoppingCart, Coupon1);
					couponText = Coupon1Text;
				}
				if (oData.coupon === "Coupon2") {
					ServiceUtils.addPromotionToCart(this, shoppingCart, Coupon2);
					couponText = Coupon2Text;
				}
				if (oData.coupon === "Coupon3") {
					ServiceUtils.addPromotionToCart(this, shoppingCart, Coupon3);
					couponText = Coupon3Text;
				}
				if (oData.coupon === "Coupon4") {
					ServiceUtils.addPromotionToCart(this, shoppingCart, Coupon4);
					couponText = Coupon4Text;
				}
				MessageToast.show(couponText);
			}

		});
	});