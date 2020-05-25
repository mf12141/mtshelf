var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var appKey = $.request.parameters.get('appKey');
if (appKey) {
	appKey = appKey.replace(/['"]+/g, '');
}
var shoppingCartNumber = $.request.parameters.get('shoppingCart');
if (shoppingCartNumber) {
	shoppingCartNumber = shoppingCartNumber.replace(/['"]+/g, '');
}
var action = $.request.parameters.get('action');
if (action) {
	action = action.replace(/['"]+/g, '');
}
var upc = $.request.parameters.get('upc');
if (upc) {
	upc = upc.replace(/['"]+/g, '');
}
var UPCdata = {};
if ($.request.body) {
	UPCdata = JSON.parse($.request.body.asString().replace(/\n/g, ''));
}

var shoppingCart = shoppingCartLib.getLatestShoppingCart(appKey, shoppingCartNumber);
shoppingCartLib.addUPCtoShoppingCart(appKey, shoppingCart, UPCdata, shoppingCartNumber);

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getLatestShoppingCart(appKey, shoppingCartNumber));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while getting latest shopping cart: [" + err.message + "]");
	$.response.returnCode = 200;
}