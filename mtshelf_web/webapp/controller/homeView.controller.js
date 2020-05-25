sap.ui.define([
	"sap/challenge/mtshelf/mtshelf_web/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/Label",
	"sap/challenge/mtshelf/mtshelf_web/utils/ServiceUtils",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, Filter, Button, Dialog, Label, ServiceUtils, MessageBox, MessageToast, FilterOperator) {
	"use strict";

	return BaseController.extend("sap.challenge.mtshelf.mtshelf_web.controller.homeView", {
		onInit: function () {
			var oCarousel = this.byId("PCarousel");
			var filters = [];
			var filter = new Filter({
				path: "status",
				operator: FilterOperator.EQ,
				value1: "A"
			});
			filters.push(filter);
			oCarousel.getBindingInfo("pages").filters = filters;
			this.conversation_id = this.generateConversationId();
			this.getView().setModel(new JSONModel({
				photos: []
			}));
		},
		
		
		onAR: function (oEvent) {
		// Nav to AR offers section	
			//sap.m.URLHelper.redirect("https://mtshelfux-i813980trial.dispatcher.hanatrial.ondemand.com/index.html", true);
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("AugmentedRealityView");
		},
		
		onCheckOut: function(oEvent) {
			ServiceUtils.startCheckOutShopper(this);                         
		// Nav to Chat bot
		},
		onGetPromotionDetails: function(oEvent) {
			var oPromotion = this.getModel("promotionList").getProperty(oEvent.getSource().getBindingInfo("src").binding.getContext().getPath());
			var text = oPromotion.promotionalDesc;
			MessageToast.show(text);
		},
		onMissingTag: function(oEvent){
			this._cameraDialog = sap.ui.xmlfragment("sap.challenge.mtshelf.mtshelf_web.fragments.TakePicture", this);
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
			this._uploadDialog = sap.ui.xmlfragment("sap.challenge.mtshelf.mtshelf_web.fragments.UploadPicture", this);
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
					me._verifyDialog = sap.ui.xmlfragment("sap.challenge.mtshelf.mtshelf_web.fragments.VerifyPicture", me);
					me._verifyDialog.setModel(me.getModel("detectedImageModel"), "detectedImageModel");
					me._verifyDialog.open();
				})
				.catch(function (error) {
					me._checkUpload ++;
					if (me._checkUpload < 4) {
						me.verifyPhoto(oEvent);
					} else {
						MessageToast.show("The Image Upload was unsuccessful, please try again.");
						this.onMissingTag(oEvent);
					}
					//MessageToast.show("Unable to display detected image...  Error: " + error);
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
					me._checkUpload = 1;
					me.verifyPhoto(oEvent);
				}, 20000);
			});
		},
		// This gets called when the user verifies the product that was detected by the backend
		onVerifyImage: function (oEvent) {
			MessageToast.show("The image is verified.  It is being added to your cart.");
			this._verifyDialog.setBusy(true);
			ServiceUtils.getBaseConfiguration(this.getOwnerComponent()).currentUPCSource = "P";
			var oImageData = this.getModel("detectedImageModel").getData();
			var upc = oImageData.item.upc;
			var shoppingCart = this.getOwnerComponent().getModel("baseConfigurationModel").getProperty("/shoppingCart");
			if (shoppingCart && shoppingCart !== "") {
				ServiceUtils.addItemToShoppingCart(this.getOwnerComponent(), shoppingCart, upc);
			}
			this.onCancelVerify();
		},

		// This gets called when the user rejects the product that was detected by the backend
		onRejectImage: function (oEvent) {

			MessageToast.show("The image is incorrect.  Please upload the image again...");
			this.onCancelVerify(oEvent);
			this.onMissingTag(oEvent);
		},
		// Fired when clicking on btnChat (Chat with Bot)
		// Opens the dialog fragment, attaches appropriate event handlers
		onOpenChatBot: function (oEvent) {

			// create popover
			if (!this._ochatBotDialog) {
				this._ochatBotDialog = sap.ui.xmlfragment("sap.challenge.mtshelf.mtshelf_web.fragments.ChatDialog", this);
				this.getView().addDependent(this._ochatBotDialog);
			}
            var oControl = sap.ui.getCore().byId('__xmlview0--home');
            if (!oControl) {
            	oControl = sap.ui.getCore().byId('__xmlview1--home');
            }
			this._ochatBotDialog.openBy(oControl);

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
		}
	});
});