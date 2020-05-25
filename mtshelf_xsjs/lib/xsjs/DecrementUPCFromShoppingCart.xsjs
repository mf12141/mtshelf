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
}

shoppingCartLib.decrementUPCfromShoppingCart(appKey,upc,shoppingCartNumber);
shoppingCartLib.triggerSCRefresh(source,appKey,shoppingCartNumber);  
try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getLatestShoppingCart(appKey, shoppingCartNumber));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while getting latest shopping cart: [" + err.message + "]");
	$.response.returnCode = 200;
}