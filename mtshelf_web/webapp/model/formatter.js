sap.ui.define([
	"sap/ui/core/format/NumberFormat"
], function (NumberFormat) {
	"use strict";

	var mStatusState = {
		"XL": "Success",
		"L": "Success",
		"M": "Success",
		"S": "Success",
		"O": "Warning",
		"*": "Error"
	};

	var formatter = {
		/**
		 * Formats the price
		 * @param {string} sValue model price value
		 * @return {string} formatted price
		 */
		price: function (sValue) {
			var numberFormat = NumberFormat.getFloatInstance({
				maxFractionDigits: 2,
				minFractionDigits: 2,
				groupingEnabled: true,
				groupingSeparator: ",",
				decimalSeparator: "."
			});
			return numberFormat.format(sValue);
		},

		selectImage: function (oItem) {
			var imageURL = "";
			if (oItem) {
				if (oItem.largeImage) {
					imageURL = oItem.largeImage;
				} else {
					imageURL = oItem.image;
				}
			}
			return imageURL;
		},

		quantity: function (sValue) {
			var numberFormat = NumberFormat.getFloatInstance({
				maxFractionDigits: 0,
				minFractionDigits: 0,
				groupingEnabled: true,
				groupingSeparator: ",",
				decimalSeparator: "."
			});
			return numberFormat.format(sValue);
		},

		weightText: function (sValue) {
			var numberFormat = NumberFormat.getFloatInstance({
				maxFractionDigits: 2,
				minFractionDigits: 2,
				groupingEnabled: true,
				groupingSeparator: ",",
				decimalSeparator: "."
			});
			return numberFormat.format(sValue) + " lbs";
		},

		sizesVisible: function (oVisible) {
			if (oVisible && oVisible.length > 0) {
				return true;
			} else {
				return false;
			}
		},

		sizeCount: function (oVisible) {
			if (oVisible && oVisible.length > 0) {
				return oVisible.length;
			} else {
				return 0;
			}
		},

		checkPromotion: function (oUPC) {
			var response = "";
			if (oUPC && oUPC.promotion && oUPC.promotion.promotion) {
				response = "Active Promotion!";
			}
			return response;
		},

		/**
		 * Sums up the price for all products in the cart
		 * @param {object} oCartEntries current cart entries
		 * @return {string} string with the total value
		 */
		totalPrice: function (oCartEntries) {
			var oBundle = this.getResourceBundle(),
				fTotalPrice = 0,
				needsDetermination = false;

			Object.keys(oCartEntries).forEach(function (sProductId) {
				var oProduct = oCartEntries[sProductId];
				if (oProduct.Price === 0.00) {
					needsDetermination = true;
				} else {
					fTotalPrice += parseFloat(oProduct.Price) * oProduct.Quantity;
				}
			});
			var text = "";
			if (needsDetermination) {
				text = oBundle.getText("cartTotalPrice", [formatter.price(fTotalPrice) + "*"]);
			} else {
				text = oBundle.getText("cartTotalPrice", [formatter.price(fTotalPrice)]);
			}
			return text;
		},

		/**
		 * Returns the status text based on the product status
		 * @param {string} sStatus product status
		 * @return {string} the corresponding text if found or the original value
		 */
		statusText: function (sStatus) {
			var oBundle = this.getResourceBundle();

			var mStatusText = {
				"S": oBundle.getText("statusS"),
				"M": oBundle.getText("statusM"),
				"L": oBundle.getText("statusL"),
				"XL": oBundle.getText("statusXL"),
				"*": oBundle.getText("statusE")
			};

			return mStatusText[sStatus] || "";
		},

		/**
		 * Returns the product state based on the status
		 * @param {string} sStatus product status
		 * @return {string} the state text
		 */
		statusState: function (sStatus) {
			return mStatusState[sStatus] || "None";
		},

		/**
		 * Returns the relative URL to a product picture
		 * @param {string} sUrl image URL
		 * @return {string} relative image URL
		 */
		pictureUrl: function (sUrl) {
			if (sUrl) {
				return sap.ui.require.toUrl(sUrl);
			} else {
				return undefined;
			}
		},

		/**
		 * Returns the footer text for the cart based on the amount of products
		 * @param {object} oSavedForLaterEntries the entries in the cart
		 * @return {string} "" for no products, the i18n text for >0 products
		 */
		footerTextForCart: function (oSavedForLaterEntries) {
			var oBundle = this.getResourceBundle();

			if (Object.keys(oSavedForLaterEntries).length === 0) {
				return "";
			}
			return oBundle.getText("cartSavedForLaterFooterText");
		},

		/**
		 * Checks if one of the collections contains items.
		 * @param {object} oCollection1 First array or object to check
		 * @param {object} oCollection2 Second array or object to check
		 * @return {boolean} true if one of the collections is not empty, otherwise - false.
		 */
		hasItems: function (oCollection) {
			var bCollection = oCollection && oCollection.length > 0;
			return bCollection;
		},
		promotionStatus: function (status) {
			var statusText = "Inactive";
			if (status === "A") {
				statusText = "Active";
			}
			return statusText;
		},
		promotionStatusState: function (status) {
			var statusState = "Error";
			if (status === "A") {
				statusState = "Success";
			}
			return statusState;
		},
		calcScan: function (scanEnabled, upcVisible) {
			return scanEnabled && upcVisible;
		},
		calcLookup: function (scanEnabled, upcVisible) {
			return !scanEnabled && upcVisible;
		},
		isItem: function (sValue) {
			var bItem = true;
			if (sValue < 0.0) {
				bItem = false;
			}
			return bItem;
		},
		hasPromotion: function (upc, aPromotions) {
			var hasPromotion = false;
			if (aPromotions) {
				for (var i = 0; i < aPromotions.length; i++) {
					var pUPC = aPromotions[i].upc;
					if (pUPC === upc && aPromotions[i].status === 'A') {
						hasPromotion = true;
					}
				}
			}
			return hasPromotion;
		},
		missingTag: function (weight, size) {
			var missingTag = false;
			if ((!weight || parseFloat(weight) === 0.00) && size && size !== "") {
				missingTag = true;
			}
			return missingTag;
		}
	};

	return formatter;
});