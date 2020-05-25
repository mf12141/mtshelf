sap.ui.define([
	"sap/ui/core/Control",
	"sap/m/Button",
	"sap/m/MessageToast"
], function (Control, Button, MessageToast) {

	"use strict";

	return Control.extend("sap.challenge.mtshelf.mtshelf_web.control.Camera", {

		metadata: {

			properties: {

				"width": {
					type: "sap.ui.core.CSSSize",
					defaultValue: "240px"
				},

				"height": {
					type: "sap.ui.core.CSSSize",
					defaultValue: "320px"
				},

				"videoWidth": {
					type: "sap.ui.core.CSSSize",
					defaultValue: "240px"
				},

				"videoHeight": {
					type: "sap.ui.core.CSSSize",
					defaultValue: "320px"
				}
			},

			aggregations: {
				_button1: {
					type: "sap.m.Button",
					multiple: false,
					visibility: "hidden"
				},
				_button2: {
					type: "sap.m.Button",
					multiple: false,
					visibility: "hidden"
				},
				_button3: {
					type: "sap.m.Button",
					multiple: false,
					visibility: "hidden"
				}
			},

			events: {

				// Button 1
				"startCamera": {},
				// Button 2
				"stopCamera": {},
				// Button 3
				"captureImage": {},
				// Click inside video
				"snapshot": {}
			}
		},

		init: function () {

			this._displayingVideo = false;

			this.setAggregation("_button1", new Button({
				text: "Start",
				press: this._onStartCamera.bind(this),
				enabled: false
			}).addStyleClass("sapUiTinyMarginBottom"));

			this.setAggregation("_button2", new Button({
				text: "Stop",
				press: this._onStopCamera.bind(this),
				enabled: true
			}).addStyleClass("sapUiTinyMarginBottom"));

			this.setAggregation("_button3", new Button({
				text: "Capture Image",
				press: this._onCaptureImage.bind(this),
				enabled: true
			}).addStyleClass("sapUiTinyMarginBottom"));

		},

		onAfterRendering: function () {

			var that = this;
			var oVideo = this._getVideo();

			// Attach a click handler to the video element
			if (oVideo && !oVideo.onclick) {
				oVideo.onclick = function () {
					that._onUserClickedVideo();
				};
			}

			if (oVideo && !this._displayingVideo) {

				this._supported = 'mediaDevices' in navigator;

				if (this._supported) {

					let constraints = {
						audio: false,
						video: {
							facingMode: "environment"
						}
					};

					let promise = navigator.mediaDevices.getUserMedia(constraints);

					promise
						.then((stream) => {
								this._stream = stream;
								oVideo.srcObject = stream;
								oVideo.play();
								this._displayingVideo = true;
							},
							(err) => {
								jQuery.sap.log.error("Problems accessing the camera: " + err);

								MessageToast.show("Problems accessing the camera: " + err);
							})
						.catch((error) => MessageToast.show("Problems accessing the camera: " + err));

				} else {

					MessageToast.show("Unable to access Camera using getUserMedia() method...")
				}
			}
		},

		// This is fired when button1 (Start) is clicked
		_onStartCamera: function () {
			this.fireEvent("startCamera", {});

			this.getAggregation("_button1").setEnabled(false);
			this.getAggregation("_button2").setEnabled(true);
			this.getAggregation("_button3").setEnabled(true);
		},

		// This is fired when button2 (Stop) is clicked
		_onStopCamera: function () {
			this.fireEvent("stopCamera", {});

			this.getAggregation("_button1").setEnabled(true);
			this.getAggregation("_button2").setEnabled(false);
			this.getAggregation("_button3").setEnabled(false);
		},

		// This is fired when button3 (Capture) is clicked
		_onCaptureImage: function () {
			this.fireEvent("captureImage", {});

			this._onUserClickedVideo();
		},

		// This is fired when you click in the video (Captures image)
		_onUserClickedVideo: function () {

			/*var iVideoWidth = parseInt(this.getVideoWidth(), 10);
			var iVideoHeight = parseInt(this.getVideoHeight(), 10);*/

			var iVideoWidth = this.getVideoWidth();
			var iVideoHeight = this.getVideoHeight();

			if (this._displayingVideo) {

				// Grab the picture from the video element
				var oImage = this._takePicture(iVideoWidth, iVideoHeight);

				// Send snapshot event with the image inside.
				this.fireSnapshot({
					image: oImage
				});
				this.stopCamera();
			}
		},

		// Utility functions

		_takePicture: function (width, height) {

			var oCanvas = this._getCanvas();
			var oVideo = this._getVideo();

			var oImageData = null;
			var context = oCanvas.getContext('2d');

			if (width && height) {
				context.drawImage(oVideo, 0, 0, parseInt(width), parseInt(height));
				oImageData = oCanvas.toDataURL('image/png');
			}

			return oImageData;
		},

		_getCanvas: function () {

			return jQuery("canvas", jQuery("#" + this.getId())).get(0);
		},

		_getVideo: function () {

			return jQuery("video", jQuery("#" + this.getId())).get(0);
		},

		stopCamera: function () {

			this._displayingVideo = false;

			if (this._stream) {
				this._stream.getVideoTracks().forEach(function (t) {
					t.stop();
				});
			}
		},

		// Renderer function

		renderer: function (oRM, oControl) {

			oRM.write("<div");
			oRM.writeControlData(oControl);
			oRM.writeClasses();
			oRM.writeStyles();
			oRM.write(">");
			
			oRM.write("<div style='align-items: center;'>");
			oRM.write(
				"<video width='%w' height='%h' style='width: %pw; height: %ph;'></video>"
				.replace("%w", oControl.getVideoWidth())
				.replace("%h", oControl.getVideoHeight())
				.replace("%pw", oControl.getWidth())
				.replace("%ph", oControl.getHeight())
			);
			oRM.write(
				"<canvas width='%w' height='%h' style='display: none; width: %pw; height: %ph;'></canvas>"
				.replace("%w", oControl.getVideoWidth())
				.replace("%h", oControl.getVideoHeight())
				.replace("%pw", oControl.getWidth())
				.replace("%ph", oControl.getHeight()));
			oRM.write("<br>");

			oRM.renderControl(oControl.getAggregation("_button1"));
			oRM.renderControl(oControl.getAggregation("_button2"));
			oRM.renderControl(oControl.getAggregation("_button3"));
			oRM.write("</div>");

			/*oRM.write("<div style='display: flex; flex-direction: row; align-items: left; justify-content: space-around;'>");*/
			// oRM.write("<div style='align-items: center;'>");
			// oRM.write(
			// 	"<video width='%w' height='%h' style='width: %pw; height: %ph;'></video>"
			// 	.replace("%w", oControl.getVideoWidth())
			// 	.replace("%h", oControl.getVideoHeight())
			// 	.replace("%pw", oControl.getWidth())
			// 	.replace("%ph", oControl.getHeight())
			// );
			// oRM.write(
			// 	"<canvas width='%w' height='%h' style='display: none; width: %pw; height: %ph;'></canvas>"
			// 	.replace("%w", oControl.getVideoWidth())
			// 	.replace("%h", oControl.getVideoHeight())
			// 	.replace("%pw", oControl.getWidth())
			// 	.replace("%ph", oControl.getHeight()));
			// oRM.write("</div>");

			oRM.write("</div>");

		}
	});
});