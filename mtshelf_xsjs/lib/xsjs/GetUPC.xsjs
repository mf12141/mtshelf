var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var appKey = $.request.parameters.get('appKey');
if (appKey) {
	appKey = appKey.replace(/['"]+/g, '');
}
var shoppingCart = $.request.parameters.get('shoppingCart');
if (shoppingCart) {
	shoppingCart = shoppingCart.replace(/['"]+/g, '');
} else {
	shoppingCart = shoppingCartLib.getLatestShoppingCartNumber(appKey);
}
var action = $.request.parameters.get('action');
if (action) {
	action = action.replace(/['"]+/g, '');
}
var upc = $.request.parameters.get('upc');
if (upc) {
	upc = upc.replace(/['"]+/g, '');
}

var source = $.request.parameters.get('source');
if (source) {
	source = source.replace(/['"]+/g, '');
} else {
	source = "S";
}

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getUPCData(upc,appKey,shoppingCart,action,source));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while getting UPC data: [" + err.message + "]");
	$.response.returnCode = 200;
}