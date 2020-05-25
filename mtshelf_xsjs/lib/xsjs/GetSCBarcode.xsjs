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

try {
	$.response.contentType = "image/jpeg";
	$.response.contentTransferEncoding = "binary";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getSCBarcode(shoppingCart));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while getting the SC Barcode: [" + err.message + "]");
	$.response.returnCode = 200;
}