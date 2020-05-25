(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
		typeof define === 'function' && define.amd ? define(factory) :
		(global.mtshelf = factory());
}(this, function () {
	'use strict';
	var mtshelf = {
		activeCoupons: {
			Coupon1: true,
			Coupon2: true,
			Coupon3: true,
			Coupon4: true,
		},
		raiseEvent: function (oData) {
			sap.ui.getCore().getEventBus().publish("sap.challenge.mtshelf.mtshelf_web", "CouponSelected", oData);
		},
		refreshPromotions: function(oData){
			sap.ui.getCore().getEventBus().publish("sap.challenge.mtshelf.mtshelf_web", "RefreshPromotions", oData);
		},
		setCoupons: function(oData) {
			const animatedMarker1 = document.querySelector("#coupon-animated-model-1");
			const animatedMarker2 = document.querySelector("#coupon-animated-model-2");
			const animatedMarker3 = document.querySelector("#coupon-animated-model-3");
			const animatedMarker4 = document.querySelector("#coupon-animated-model-4");
			for (var i=0; i<oData.active.length; i++) {
				var coupon = oData.active[i];
				if (coupon === "Coupon1" && animatedMarker1) {
					animatedMarker1.setAttribute("visible",true);
					this.activeCoupons.Coupon1 = true;
				} else if (coupon === "Coupon2" && animatedMarker2) {
					animatedMarker2.setAttribute("visible",true);
					this.activeCoupons.Coupon2 = true;
				} else if (coupon === "Coupon3" && animatedMarker3) {
					animatedMarker3.setAttribute("visible",true);
					this.activeCoupons.Coupon3 = true;
				} else if (coupon === "Coupon4" && animatedMarker4) {
					animatedMarker4.setAttribute("visible",true);
					this.activeCoupons.Coupon4 = true;
				}
			}
			for (var i=0; i<oData.inactive.length; i++) {
				var coupon = oData.inactive[i];
				if (coupon === "Coupon1" && animatedMarker1) {
					animatedMarker1.setAttribute("visible",false);
					this.activeCoupons.Coupon1 = false;
				} else if (coupon === "Coupon2" && animatedMarker2) {
					animatedMarker2.setAttribute("visible",false);
					this.activeCoupons.Coupon2 = false;
				} else if (coupon === "Coupon3" && animatedMarker3) {
					animatedMarker3.setAttribute("visible",false);
					this.activeCoupons.Coupon3 = false;
				} else if (coupon === "Coupon4" && animatedMarker4) {
					animatedMarker4.setAttribute("visible",false);
					this.activeCoupons.Coupon4 = false;
				}
			}
		}
	};
	return mtshelf;
}));