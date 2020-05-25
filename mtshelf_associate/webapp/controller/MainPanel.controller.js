sap.ui.define([
	"sap/challenge/mtshelf/mtshelf_associate/controller/BaseController",
	"sap/challenge/mtshelf/mtshelf_associate/utils/ServiceUtils",
	"sap/ui/model/json/JSONModel",
	"sap/ui/unified/FileUploaderParameter",
	"sap/m/MessageToast",
	"../model/formatter"
], function (BaseController, ServiceUtils, JSONModel, FileUploaderParameter, MessageToast, formatter) {
	"use strict";

	return BaseController.extend("sap.challenge.mtshelf.mtshelf_associate.controller.MainPanel", {
		formatter: formatter,
		// Controller Methods

		onInit: function () {
			var me = this;
			this._wizard = this.byId("wizardChat");
			this._oNavContainer = this.byId("wizardNavContainer");
			this._oWizardContentPage = this.byId("wizardContentPage");
			this._oPanelRegistration = this.byId("panelRegistration");

			this.conversation_id = this.generateConversationId();

			this.getView().setModel(new JSONModel({
				photos: []
			}));
			this._setLayout("Two");
			this.getRouter().navTo("home");
			ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart = "";
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("sap.challenge.mtshelf.mtshelf_associate", "CheckOutComplete", function (sChannelId, sEventId, oData) {
				this.onToggleCart(null);
			}, this);
			oEventBus.subscribe("sap.challenge.mtshelf.mtshelf_associate", "CloseSC", function (sChannelId, sEventId, oData) {
				this.onToggleCart(null);
			}, this);
			// Web Chat
			ServiceUtils.initializeAssociateNotifications(this);
		},

		/************************************************************************************/

		// Camera Event Handlers

		// This event starts the camera
		onStartCamera: function (oEvent) {
			let oCamera = this.getView().byId("idCamera");
			oCamera.rerender();
		},

		// This event stops the camera
		onStopCamera: function (oEvent) {
			let oCamera = this.getView().byId("idCamera");
			oCamera.stopCamera();
		},

		// This event captures the image and adds the image to the default model
		onSnapshot: function (oEvent) {
			// The image is inside oEvent, on the image parameter,
			// let's grab it.
			this._cameraDialog.close();
			var oModel = this.getView().getModel();
			//var aPhotos = oModel.getProperty("/photos");
			var aPhotos = []; // We only support one image at a time
			aPhotos.push({
				src: oEvent.getParameter("image")
			});
			oModel.setProperty("/photos", aPhotos);
			oModel.refresh(true);
			this.uploadPhoto(oEvent);
		},

		/************************************************************************************/

		// Wizard event handlers

		// This gets called when the last button of the wizard is clicked
		// In this case, the sales order is submitted
		onCompletedWizardHandler: function (oEvent) {

			let salesOrderModel = this.getModel("salesOrderModel");

			let promise = this.createSalesOrder();

			promise
				.then((response) => {

					let message = salesOrderModel.getProperty("/message");
					MessageToast.show(
						`${message}.  This functionality has not be implemented.`
					);

					this._handleNavigationToStep(0);
					this._wizard.discardProgress(this._wizard.getSteps()[0]);

				})
				.catch((error) => MessageToast.show("Unable to create sales order...  Error: " + error));

		},

		_handleNavigationToStep: function (iStepNumber) {
			var fnAfterNavigate = function () {
				this._wizard.goToStep(this._wizard.getSteps()[iStepNumber]);
				this._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}.bind(this);

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			this.backToWizardContent();
		},

		backToWizardContent: function () {
			this._oNavContainer.backToPage(this._oWizardContentPage.getId());
		},

		// This gets called when the wizard step that displays the detected image is initialized
		// In this case, the last detected product is requested
		onWizardStepDetectedImage: function (oEvent) {

			let promise = this.getDetectedImage();

			promise
				.then((response) => {

				})
				.catch((error) => MessageToast.show("Unable to display detected image...  Error: " + error));

		},

		onWizardStepActivateCamera: function (oEvent) {

			// let oCamera = this.getView().byId("idCamera");
			// oCamera.stopCamera();
		},
		/************************************************************************************/

		// Button event handlers in the wizard

		// This gets called when the user verifies the product that was detected by the backend
		onVerifyImage: function (oEvent) {
			MessageToast.show("The image is verified.  It will now be displayed on the main screen for further action");
			this._verifyDialog.setBusy(true);
			ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).currentUPCSource = "P";
			ServiceUtils.updateUPCData(this.getOwnerComponent(), this.getModel("detectedImageModel").getData());
			//GDH Took this out so it's not added to cart - this.onAdd(oEvent);
			this.onCancelVerify();
		},

		// This gets called when the user rejects the product that was detected by the backend
		onRejectImage: function (oEvent) {

			MessageToast.show("The image is incorrect.  Please upload the image again...");
			this.onCancelVerify(oEvent);
			this.takePhoto(oEvent);
		},

		// This call is made after an image has been successfully uploaded
		// This calls the triggerAnalyzeImage() in the base class
		onTriggerAnalyzeImage: function (oEvent) {

			this.getView().setBusy(true);

			let promise = this.triggerAnalyzeImage();

			promise
				.then((response) => {

					MessageToast.show("Image processed on backend...  Response from server: " + response);

					this._wizard.validateStep(this.byId("step2"));
					this.getView().setBusy(false);
				})
				.catch((error) => MessageToast.show("Unable to upload file...  Error: " + error));

		},

		onRegisterCustomer: function (oEvent) {

			this._wizard.validateStep(this.byId("step0"));
			window.open("https://mo-170e8bf6e.mo.sap.corp:44309/sap/bc/ui2/flp#Shell-home", '_blank');

		},

		/************************************************************************************/

		// Camera and image upload related functions

		// This method is the first step in the process of ordering a product replacement
		// This method is called when you are uploading the missing product image to SAP HANA
		onUploadImage: function (oEvent) {
			var me = this;
			this._setBusy(true);
			this._uploadDialog.setBusy(true);
			//var sPath = oEvent.getSource().getBindingContext().getPath();
			var src = this.getView().getModel().getProperty("/photos/0/src");
			//let file = this.dataURLtoFile(src, "resizedImage.png");
			var oBody = {};
			oBody.appKey = this.getAppKey();
			oBody.appTime = (new Date()).toISOString();
			oBody.imageType = 'P';
			oBody.snapshot = btoa(this.dataURLtoBinaryString(src));
			var promise = ServiceUtils.uploadSnapshot(this.getOwnerComponent(), oBody);
			var oBaseConfiguration = ServiceUtils.getBaseConfiguration(this.getOwnerComponent());
			promise.then(function () {
				setTimeout(function () {
					//do what you need here
					me._uploadDialog.setBusy(false);
					me._uploadDialog.close();
					me.verifyPhoto(oEvent);
				}, 15000);
			});
		},

		// This method is the first step in the process of ordering a product replacement
		// This method is called when you are browsing for an existing image of the product
		onBrowse: function (oEvent) {

			this.fileList = oEvent.getParameters().files;

			var oFileUploader = this.byId("fileUploader");
			oFileUploader.addParameter(new FileUploaderParameter({
				name: "files",
				value: this.fileList[0]
			}));

			this.fileSize = Math.round(this.fileList[0].size / 1000);
			MessageToast.show("File name is " + this.fileList[0].name);
			MessageToast.show("File size is " + this.fileSize + " kb");

			const width = 320;

			const fileName = this.fileList[0].name;
			const fileReader = new FileReader();

			var oModel = this.getView().getModel();
			var aPhotos = oModel.getProperty("/photos");

			if (this.fileSize > 350) {

				fileReader.readAsDataURL(this.fileList[0]);

				fileReader.onload = (event) => {

					const img = new Image();
					img.src = event.target.result;

					img.onload = () => {
						const elem = document.createElement('canvas');
						const scaleFactor = width / img.width;
						elem.width = width;
						elem.height = img.height * scaleFactor;

						const ctx = elem.getContext("2d");
						ctx.drawImage(img, 0, 0, width, img.height * scaleFactor);

						aPhotos.push({
							src: elem.toDataURL('image/png')
						});
						oModel.setProperty("/photos", aPhotos);
						oModel.refresh(true);

					}

				}

			} else {

				fileReader.readAsDataURL(this.fileList[0]);

				fileReader.onload = (event) => {

					const img = new Image();
					img.src = event.target.result;

					aPhotos.push({
						src: img.src
					});
					oModel.setProperty("/photos", aPhotos);
					oModel.refresh(true);

					fileReader.onerror = error => MessageToast.show(error);
				}
			}
		},

		onHandleDelete: function (oEvent) {

			var oModel = this.getView().getModel();
			var aPhotos = oModel.getProperty("/photos");

			var oList = oEvent.getSource();
			var oItem = oEvent.getParameter("listItem");
			var sPath = oItem.getBindingContext().getPath();
			var src = this.getView().getModel().getProperty(sPath);

			aPhotos.splice(aPhotos.indexOf(src), 1);

			oModel.setProperty("/photos", aPhotos);
			oModel.refresh(true);
		},

		/************************************************************************************/

		// Fired when clicking on btnChat (Chat with Bot)
		// Opens the dialog fragment, attaches appropriate event handlers
		onOpenChatBot: function (oEvent) {

			// create popover
			if (!this._ochatBotDialog) {
				this._ochatBotDialog = sap.ui.xmlfragment("sap.challenge.mtshelf.mtshelf_associate.fragments.ChatDialog", this);
				this.getView().addDependent(this._ochatBotDialog);
			}

			this._ochatBotDialog.openBy(oEvent.getSource());

			var chatInput = sap.ui.getCore().byId("chat");
			chatInput.attachBrowserEvent("keyup", this.onChatInputEnter.bind(this), false);
			chatInput.addStyleClass("botInput");

			this.chatScroll = sap.ui.getCore().byId("scrollBot");
			this.scrollDown();

			this.isTyping = false;
		},

		// Fired when user types the message and clicks enter on the keyboard
		// Technically fired on any key up event - but we check for keyCode === 13 (enter key)
		onChatInputEnter: function (event) {

			var message;
			var chatInput = sap.ui.getCore().byId("chat");

			if (event.keyCode === 13 && chatInput.getValue()) {

				message = chatInput.getValue().trim();

				// message is "sent" and triggers bot "response" with small delay
				if (message !== "") {

					chatInput.setValue("");
					this.displayMessageInDialog("user", message);

					// Only respond to one message at a time
					if (!this.isTyping) {
						var that = this;
						this.isTyping = true;
						setTimeout(function () {

							// User has sent a valid message.  Let's submit to the Chat Bot
							that.postMessageToChatBot(message);
						}, Math.random() * (2000) + 1000);
					}
				}
			}
		},

		/************************************************************************************/

		// SAP Conversational AI API calls

		// Post message to Chat Bot using SAP Conversational AI API
		postMessageToChatBot: function (message) {

			let uuidTokenModel = this.getOwnerComponent().getModel("uuidTokenModel");
			let uuid = uuidTokenModel.getProperty("/results/owner/id");
			var userModel = this.getModel("userModel");
			var oBaseConfiguration = ServiceUtils.getBaseConfiguration(this.getOwnerComponent());

			var data = {
				"message": {
					"type": "text",
					"content": message
				},
				"conversation_id": this.conversation_id,
				"log_level": "info",
				"memory": this.getMemory()
			};

			console.log(JSON.stringify(data));

			var promise = fetch(oBaseConfiguration.convAiDestination, {
				method: "POST",
				headers: {
					"Authorization": "Token " + oBaseConfiguration.requestToken,
					"Content-Type": "application/json",
					"x-uuid": uuid
				},
				body: JSON.stringify(data)

			});

			promise
				.then((response) => response.json())
				.then((parseResponse) => {
					for (var i = 0; i < parseResponse.results.messages.length; i++) {
						var message = parseResponse.results.messages[i];
						if (message.type === "text") {
							this.displayMessageInDialog("bot", message.content, 2000);
						} else if (message.type === "picture") {
							this.displayPictureInDialog("bot", message.content, 2000);
						}
					}
					this.setMemory(parseResponse.results.conversation.memory);
				})
				.catch((error) => MessageToast.show("Unable to post message to chat bot...  Error: " + error));

		},

		/************************************************************************************/

		// Utility Functions

		// Display message in Chat Bot dialog
		// This can either be the message that the user typed or the response from Chat Bot
		// Create a SAPUI5 CustomListItem with the message and add it to the fragment
		displayPictureInDialog: function (from, message, delay) {

			var sSrc, sStyle;
			var listItem;

			if (from === "bot") {
				sSrc = "https://cdn.recast.ai/webchat/bot.png";

				sStyle = "botStyle";
				listItem = new sap.m.CustomListItem({
					content: [
						new sap.m.Image({
							src: sSrc,
							height: "2rem"
						}),
						new sap.m.Image({
							src: message,
							width: "50%",
							height: "50%"
						})
					]
				});
			} else if (from === "user") {

				sSrc = "https://cdn.recast.ai/webchat/user.png";

				sStyle = "userStyle";

				listItem = new sap.m.CustomListItem({
					content: [
						new sap.m.Image({
							src: sSrc,
							height: "2rem"
						}),
						new sap.m.Text({
							text: message
						})
					]
				});
			}

			listItem.addStyleClass(sStyle);
			var oChatList = sap.ui.getCore().byId("list1");

			oChatList.addItem(listItem);

			this.isTyping = false;

			this.scrollDown();
		},

		displayMessageInDialog: function (from, message, delay) {

			var sSrc, sStyle;
			var listItem;

			if (from === "bot") {
				sSrc = "https://cdn.recast.ai/webchat/bot.png";

				sStyle = "botStyle";

				if (this.validURL(message)) {
					var oURL = JSON.parse(message);
					listItem = new sap.m.CustomListItem({
						content: [
							new sap.m.Image({
								src: sSrc,
								height: "2rem"
							}),
							new sap.m.Text({
								text: oURL.message
							})
						]
					});
					listItem.addStyleClass(sStyle);
					var oOutputList = sap.ui.getCore().byId("list1");
					oOutputList.addItem(listItem);
					listItem = new sap.m.CustomListItem({
						content: [
							new sap.m.Image({
								src: sSrc,
								height: "2rem"
							}),
							new sap.m.Link({
								text: oURL.linkText,
								target: "_blank",
								href: oURL.URL
							})
						]
					});

				} else {

					listItem = new sap.m.CustomListItem({
						content: [
							new sap.m.Image({
								src: sSrc,
								height: "2rem"
							}),
							new sap.m.Text({
								text: message
							})
						]
					});
				}

			} else if (from === "user") {

				sSrc = "https://cdn.recast.ai/webchat/user.png";

				sStyle = "userStyle";

				listItem = new sap.m.CustomListItem({
					content: [
						new sap.m.Image({
							src: sSrc,
							height: "2rem"
						}),
						new sap.m.Text({
							text: message
						})
					]
				});
			}

			listItem.addStyleClass(sStyle);
			var oChatList = sap.ui.getCore().byId("list1");

			oChatList.addItem(listItem);

			this.isTyping = false;

			this.scrollDown();
		},

		// If the list needs scrolling - then automatically scroll down
		// So user can see the latest messages
		scrollDown: function () {

			var oChatList = sap.ui.getCore().byId("list1");

			this.chatScroll.rerender(true);
			this.chatScroll.scrollTo(0, 100000, 0);

			/*if (oChatList.getMaxItemsCount() > 0) {
				
				this.chatScroll.scrollToElement(oChatList.getItems()[oChatList.getMaxItemsCount() - 1]);
			}*/
		},

		validURL: function (str) {
			try {
				var oMessage = JSON.parse(str);
				if (oMessage) {
					if (oMessage.URL) {
						return true;
					}
					// var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
					//  		'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
					//  		'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
					//  		'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
					//  		'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
					//  		'(\\#[-a-z\\d_]*)?$','i'); // fragment locator

					// return !!pattern.test(str);
				}
			} catch (err) {
				//console.error(err);
			}
			return false;
		},

		validPictureURL: function (str) {
			if (str.lastIndexOf("data:image", 0) === 0) {
				return true;
			}
			return false;
		},

		endsWithAny: function (suffixes, string) {

			return suffixes.some(function (suffix) {
				return string.endsWith(suffix);
			});
		},

		dataURLtoFile: function (dataurl, filename) {

			var arr = dataurl.split(','),
				mime = arr[0].match(/:(.*?);/)[1],
				bstr = atob(arr[1]),
				n = bstr.length,
				u8arr = new Uint8Array(n);

			while (n--) {
				u8arr[n] = bstr.charCodeAt(n);
			}

			return new File([u8arr], filename, {
				type: mime
			});

		},

		dataURLtoBinaryString: function (dataurl) {
			var arr = dataurl.split(','),
				mime = arr[0].match(/:(.*?);/)[1],
				bstr = atob(arr[1]);
			return bstr;
		},

		generateConversationId: function () {
			var timestamp = Date.now();
			return "ui5-" + timestamp;
		},
		onManualCart: function (oEvent) {
			// Now we need to grab the scan of the cart id
			var bPressed = false
			if (oEvent && oEvent.getParameters()) {
				bPressed = oEvent.getParameter("pressed");
			}
			var me = this;
			me._latestEvent = oEvent;
			if (!bPressed) {
				this._setLayout("Two");
				this.getRouter().navTo(bPressed ? "cart" : "home");
				ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart = "";
				ServiceUtils.deregisterAssociateForShoppingCartNotifications(this, ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart);
				ServiceUtils.clearShoppingCart(this);
			} else {
				var dialog = new sap.m.Dialog({
					title: 'Enter Shopping Cart',
					type: 'Message',
					content: [
						new sap.m.Label({
							text: 'Manually enter shopping cart number?',
							labelFor: 'shoppingCartInput'
						}),
						new sap.m.Input('shoppingCartInput', {
							width: '100%',
							placeholder: 'Enter shopping cart number (for testing only)'
						})
					],
					beginButton: new sap.m.Button({
						text: 'Open',
						enabled: true,
						press: function () {
							me.getOwnerComponent().getModel("baseConfigurationModel").setProperty("/shoppingCart", sap.ui.getCore().byId(
								'shoppingCartInput').getValue());
							ServiceUtils.registerAssociateForShoppingCartNotifications(me, sap.ui.getCore().byId(
								'shoppingCartInput').getValue());
							me._setLayout(bPressed ? "Three" : "Two");
							me.getRouter().navTo(bPressed ? "cart" : "home");
							dialog.close();
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
			}
		},
		/**
		 * Navigate to the generic cart view
		 * @param {sap.ui.base.Event} @param oEvent the button press event
		 */
		onToggleCart: function (oEvent) {
			var bPressed = false;
			if (oEvent && oEvent.getParameters()) {
				bPressed = oEvent.getParameter("pressed");
			}
			this._latestEvent = oEvent;
			if (!bPressed) {
				this._setLayout("Two");
				this.getRouter().navTo(bPressed ? "cart" : "home");
				ServiceUtils.deregisterAssociateForShoppingCartNotifications(this, ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart);
				ServiceUtils.clearShoppingCart(this);
			} else {
				// Now we need to grab the scan of the cart id
				if (!this._oScanDialog2) {
					this._oScanDialog2 = new sap.m.Dialog({
						title: "Scan Shopping Cart",
						contentWidth: "640px",
						contentHeight: "480px",
						horizontalScrolling: false,
						verticalScrolling: false,
						stretchOnPhone: true,
						content: [new sap.ui.core.HTML({
							id: this.createId("scan2Container"),
							content: "<div />"
						})],
						endButton: new sap.m.Button({
							text: "Cancel",
							press: function (oEvent) {
								this._setBusy(false);
								this._oScanDialog2.close();
							}.bind(this)
						}),
						afterOpen: function () {
							this._initQuagga2(this.getView().byId("scan2Container").getDomRef()).done(function () {
								// Initialisation done, start Quagga
								Quagga2.start();
							}).fail(function (oError) {
								// Failed to initialise, show message and close dialog...this should not happen as we have
								// already checked for camera device ni /model/models.js and hidden the scan button if none detected
								MessageBox.error(oError.message.length ? oError.message : ("Failed to initialise Quagga with reason code " + oError.name), {
									onClose: function () {
										this._oScanDialog2.close();
										this._setBusy(false);
									}.bind(this)
								});
							}.bind(this));
						}.bind(this),
						afterClose: function () {
							// Dialog closed, stop Quagga
							Quagga2.stop();
						}
					});
					this.getView().addDependent(this._oScanDialog2);
				}
				this._oScanDialog2.open();
			}
		},
		_initQuagga2: function (oTarget) {
			var me = this;
			var oDeferred = jQuery.Deferred();

			// Initialise Quagga plugin - see https://serratus.github.io/quaggaJS/#configobject for details
			Quagga2.init({
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
						format: "code_128_reader",
						//format: "upc_reader",
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

			if (!this._oQuagga2EventHandlersAttached) {
				// Attach event handlers...

				Quagga2.onProcessed(function (result) {
					var drawingCtx = Quagga2.canvas.ctx.overlay,
						drawingCanvas = Quagga2.canvas.dom.overlay;

					if (result) {
						// The following will attempt to draw boxes around detected barcodes
						if (result.boxes) {
							drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
							result.boxes.filter(function (box) {
								return box !== result.box;
							}).forEach(function (box) {
								Quagga2.ImageDebug.drawPath(box, {
									x: 0,
									y: 1
								}, drawingCtx, {
									color: "green",
									lineWidth: 2
								});
							});
						}

						if (result.box) {
							Quagga2.ImageDebug.drawPath(result.box, {
								x: 0,
								y: 1
							}, drawingCtx, {
								color: "#00F",
								lineWidth: 2
							});
						}

						if (result.codeResult && result.codeResult.code) {
							Quagga2.ImageDebug.drawPath(result.line, {
								x: 'x',
								y: 'y'
							}, drawingCtx, {
								color: 'red',
								lineWidth: 3
							});
						}
					}
				}.bind(this));

				Quagga2.onDetected(function (result) {
					// Barcode has been detected, value will be in result.codeResult.code. If requierd, validations can be done 
					// on result.codeResult.code to ensure the correct format/type of barcode value has been picked up

					// Set barcode value in input field
					this._setLayout("Three");
					this.getRouter().navTo("cart");
					this.getOwnerComponent().getModel("baseConfigurationModel").setProperty("/shoppingCart", result.codeResult.code);
					ServiceUtils.registerAssociateForShoppingCartNotifications(me, result.codeResult.code);
					// Close dialog
					this._oScanDialog2.close();
					this._setBusy(false);
				}.bind(this));

				// Set flag so that event handlers are only attached once...
				this._oQuagga2EventHandlersAttached = true;
			}

			return oDeferred.promise();
		},
		takePhoto: function (oEvent) {
			this._cameraDialog = sap.ui.xmlfragment("sap.challenge.mtshelf.mtshelf_associate.fragments.TakePicture", this);
			this._cameraDialog.open();
		},
		onCancelCamera: function (oEvent) {
			this._setBusy(false);
			this._cameraDialog.close();
		},
		onAfterCameraClosed: function (oEvent) {
			this._cameraDialog.destroy();
		},
		uploadPhoto: function (oEvent) {
			this._uploadDialog = sap.ui.xmlfragment("sap.challenge.mtshelf.mtshelf_associate.fragments.UploadPicture", this);
			this._uploadDialog.setModel(this.getView().getModel());
			this._uploadDialog.open();
		},
		onCancelUpload: function (oEvent) {
			this._uploadDialog.close();
		},
		onAfterUploadClosed: function (oEvent) {
			this._uploadDialog.destroy();
		},
		verifyPhoto: function (oEvent) {
			var promise = this.getDetectedImage();
			var me = this;
			promise
				.then(function (response) {
					me._verifyDialog = sap.ui.xmlfragment("sap.challenge.mtshelf.mtshelf_associate.fragments.VerifyPicture", me);
					me._verifyDialog.setModel(me.getModel("detectedImageModel"), "detectedImageModel");
					me._verifyDialog.open();
				})
				.catch(function (error) {
					MessageToast.show("Unable to display detected image...  Error: " + error);
					console.log(error);
				});
		},
		onCancelVerify: function (oEvent) {
			this._verifyDialog.setBusy(false);
			this._verifyDialog.close();
		},
		onAfterVerifyClosed: function (oEvent) {
			this._verifyDialog.destroy();
		},
		onTableSelection: function (oEvent) {
			var selected = this.byId("table1").getSelectedIndex();
			if (selected > -1) {
				this.byId("updateButton").setEnabled(true);
			} else {
				this.byId("updateButton").setEnabled(false);
			}
		},
		onUpdateSize: function (oEvent) {
			var currentUPCModel = this.getOwnerComponent().getModel("currentUPC");
			var oSizeData = currentUPCModel.getProperty(this.byId("table1").getBinding().getPath() + "/" + this.byId("table1").getSelectedIndex());
			var size = oSizeData.size;
			var oUPCData = currentUPCModel.getData();
			// Update based on selected size
			oUPCData.item.size = size;
			oUPCData.item.weight = oSizeData.weight;
			oUPCData.item.msrp = oSizeData.msrp;
			oUPCData.item.upc = oSizeData.size_upc;
			var shoppingCart = ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).shoppingCart;
			var promise = ServiceUtils.updateDetectedItemOptions(this.getOwnerComponent(), oUPCData, size, shoppingCart);
			promise.then(function () {
				MessageToast.show("Data updated and screen refreshed");
			});
		},
		onAdd: function (oEvent) {
			var upc = this.getOwnerComponent().getModel("currentUPC").getProperty("/item/upc");
			var shoppingCart = this.getOwnerComponent().getModel("baseConfigurationModel").getProperty("/shoppingCart");
			if (shoppingCart && shoppingCart !== "") {
				ServiceUtils.addItemToShoppingCart(this.getOwnerComponent(), shoppingCart, upc);
			}
		},
		onCount: function (oEvent) {
			var upcData = this.getOwnerComponent().getModel("currentUPC").getData();
			if (upcData.item && upcData.item.upc) {
				ServiceUtils.cycleCount(this, upcData);
			}
		},
		onMove: function (oEvent) {
			var upcData = this.getOwnerComponent().getModel("currentUPC").getData();
			if (upcData.item && upcData.item.upc) {
				ServiceUtils.moveProduct(this, upcData);
			}
		},
		// send message
		sendMsg: function () {
			var oModel = sap.ui.getCore().getModel("chatModel");
			var result = oModel.getData();
			var msg = result.chat;
			if (msg.length > 0) {
				connection.send(JSON.stringify({
					user: result.user,
					text: result.message
				}));
				oModel.setData({
					message: ""
				}, true);
			}
		},
		onErrorCall: function (oError) {
			if (oError.response.statusCode === 500 || oError.response.statusCode === 400) {
				var errorRes = JSON.parse(oError.response.body);
				sap.m.MessageBox.alert(errorRes.error.message.value);
				return;
			} else {
				sap.m.MessageBox.alert(oError.response.statusText);
				return;
			}
		},
		refreshPage: function (oEvent) {
			location.reload();
		}
	});
});