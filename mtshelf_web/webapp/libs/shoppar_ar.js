AFRAME.registerComponent('markerhandler1', {

	init: function () {
		this._marker1Present = false;
		const animatedMarker1 = document.querySelector("#animated-marker-1");
		const aEntity1 = document.querySelector("#coupon-animated-model-1");
        animatedMarker1.addEventListener('markerFound', function(ev) {
        	this._marker1Present = true;
        	
        });
        animatedMarker1.addEventListener('markerLost', function(ev) {
        	this._marker1Present = false;
        });
		animatedMarker1.addEventListener('mousedown', function (ev, target) {
			// Pure Protein
			//const intersectedElement = ev && ev.detail && ev.detail.intersectedEl;
//			if (aEntity1 && aEntity1.getAttribute("visible") && intersectedElement === aEntity1) {
			if (aEntity1 && aEntity1.getAttribute("visible") && this._marker1Present) {
				var oCoupon = {};
				oCoupon.coupon = "Coupon1";
				parent.mtshelf.raiseEvent(oCoupon);
				var markerId1 = ev.target.getAttribute("id");
				aEntity1.setAttribute("visible", false);
				// noty({
				// 	text: "Coupon #" + markerId1.split("-")[2] + " Added!",
				// 	layout: "topRight",
				// 	progressBar: true,
				// 	type: "confirm",
				// 	timeout: 5000
				// });
			}
		});
	}
});

AFRAME.registerComponent('markerhandler2', {

	init: function () {
		this._marker2Present = false;
		const animatedMarker2 = document.querySelector("#animated-marker-2");
		const aEntity2 = document.querySelector("#coupon-animated-model-2");
        parent.mtshelf.refreshPromotions({});
        animatedMarker2.addEventListener('markerFound', function(ev) {
        	this._marker2Present = true;
        });
        animatedMarker2.addEventListener('markerLost', function(ev) {
        	this._marker2Present = false;
        });
		animatedMarker2.addEventListener('mousedown', function (ev, target) {
			// Jello
			//const intersectedElement = ev && ev.detail && ev.detail.intersectedEl;
			//if (aEntity2 && aEntity2.getAttribute("visible") && intersectedElement === aEntity2) {
			if (aEntity2 && aEntity2.getAttribute("visible") && this._marker2Present) {
				var oCoupon = {};
				oCoupon.coupon = "Coupon2";
				parent.mtshelf.raiseEvent(oCoupon);
				var markerId2 = ev.target.getAttribute("id");
				aEntity2.setAttribute("visible", false);
				// noty({
				// 	text: "Coupon #" + markerId2.split("-")[2] + " Added!",
				// 	layout: "topRight",
				// 	progressBar: true,
				// 	type: "confirm",
				// 	timeout: 5000
				// });
			}
		});
	}
});

AFRAME.registerComponent('markerhandler3', {

	init: function () {
		this._marker3Present = false;
		const animatedMarker3 = document.querySelector("#animated-marker-3");
		const aEntity3 = document.querySelector("#coupon-animated-model-3");
		animatedMarker3.addEventListener('markerFound', function(ev) {
        	this._marker3Present = true;
        	
        });
        animatedMarker3.addEventListener('markerLost', function(ev) {
        	this._marker3Present = false;
        });
        
		animatedMarker3.addEventListener('mousedown', function (ev, target) {
			// Red Bull
			//const intersectedElement = ev && ev.detail && ev.detail.intersectedEl;
			//if (aEntity3 && aEntity3.getAttribute("visible") && intersectedElement === aEntity3) {
			if (aEntity3 && aEntity3.getAttribute("visible") && this._marker3Present) {
				var oCoupon = {};
				oCoupon.coupon = "Coupon3";
				parent.mtshelf.raiseEvent(oCoupon);
				var markerId3 = ev.target.getAttribute("id");
				aEntity3.setAttribute("visible", false);
				// noty({
				// 	text: "Coupon #" + markerId2.split("-")[2] + " Added!",
				// 	layout: "topRight",
				// 	progressBar: true,
				// 	type: "confirm",
				// 	timeout: 5000
				// });
			}
		});
	}
});

AFRAME.registerComponent('markerhandler4', {

	init: function () {
		this._marker4Present = false;
		const animatedMarker4 = document.querySelector("#animated-marker-4");
		const aEntity4 = document.querySelector("#coupon-animated-model-4");
		animatedMarker4.addEventListener('markerFound', function(ev) {
        	this._marker4Present = true;
        	
        });
        animatedMarker4.addEventListener('markerLost', function(ev) {
        	this._marker4Present = false;
        });
        parent.mtshelf.refreshPromotions({});
        
		animatedMarker4.addEventListener('mousedown', function (ev, target) {
			// Toblerone
			if (aEntity4 && aEntity4.getAttribute("visible") && this._marker4Present) {
				var oCoupon = {};
				oCoupon.coupon = "Coupon4";
				parent.mtshelf.raiseEvent(oCoupon);
				var markerId4 = ev.target.getAttribute("id");
				aEntity4.setAttribute("visible", false);
			}
		});
	}
});