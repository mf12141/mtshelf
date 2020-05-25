var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var appKey = $.request.parameters.get('appKey');
if (appKey) {
	appKey = appKey.replace(/['"]+/g, '');
}
var shoppingCartNumber = $.request.parameters.get('shoppingCart');
if (shoppingCartNumber) {
	shoppingCartNumber = shoppingCartNumber.replace(/['"]+/g, '');
} else {
	shoppingCartNumber = shoppingCartLib.getLatestShoppingCartNumber(appKey);
}
var shoppingCart = shoppingCartLib.getLatestShoppingCart(appKey, shoppingCartNumber);
var action = $.request.parameters.get('action');
if (action) {
	action = action.replace(/['"]+/g, '');
}
var promotion = $.request.parameters.get('promotion');
var promotionData = {};
if (promotion) {
	promotion = promotion.replace(/['"]+/g, '');
	promotionData = shoppingCartLib.getPromotionData(promotion);
}
shoppingCartLib.addPromotionToShoppingCart(appKey, shoppingCart, promotionData, shoppingCartNumber)
 

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getLatestShoppingCart(appKey, shoppingCartNumber));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while adding promotion to shopping cart: [" + err.message + "]");
	$.response.returnCode = 200;
}