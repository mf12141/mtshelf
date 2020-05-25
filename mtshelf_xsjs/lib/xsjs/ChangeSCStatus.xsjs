var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var appKey = $.request.parameters.get('appKey');
if (appKey) {
	appKey = appKey.replace(/['"]+/g, '');
}

var status = $.request.parameters.get('status');
if (status) {
	status = status.replace(/['"]+/g, '');
}

var shoppingCart = $.request.parameters.get('shoppingCart');
if (shoppingCart) {
	shoppingCart = shoppingCart.replace(/['"]+/g, '');
} else {
	shoppingCart = shoppingCartLib.getLatestShoppingCartNumber(appKey);
}

var source = $.request.parameters.get('source');
if (source) {
	source = source.replace(/['"]+/g, '');
}

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.updateShoppingCartStatus(appKey,shoppingCart,status));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while updating shopping cart status: [" + err.message + "]");
	$.response.returnCode = 200;
}