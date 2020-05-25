var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var appKey = $.request.parameters.get('appKey');
if (appKey) {
	appKey = appKey.replace(/['"]+/g, '');
}
var shoppingCartNumber = $.request.parameters.get('shoppingCart');
if (shoppingCartNumber) {
	shoppingCartNumber = shoppingCartNumber.replace(/['"]+/g, '');
} else {
	shoppingCartNumber = "";
}

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getLatestShoppingCart(appKey, shoppingCartNumber));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while getting latest shopping cart: [" + err.message + "]");
	$.response.returnCode = 200;
}