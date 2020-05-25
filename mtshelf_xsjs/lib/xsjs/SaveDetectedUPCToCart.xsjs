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
var upc = $.request.parameters.get('upc');
if (upc) {
	upc = upc.replace(/['"]+/g, '');
}
var size = $.request.parameters.get('size');
if (size) {
	size = size.replace(/['"]+/g, '');
}
var source = $.request.parameters.get('source');
if (source) {
	source = source.replace(/['"]+/g, '');
}
var shoppingCartFull = shoppingCartLib.getLatestShoppingCart(appKey, shoppingCart);
var UPCdata = shoppingCartLib.getUPCData(upc, appKey, shoppingCart, "L");
if (UPCdata.item.hasCollection) {
	UPCdata = shoppingCartLib.overlayCollectionData(UPCdata, size);
}
if (!appKey || appKey === "") {
	appKey = shoppingCartFull.header.appKey;
}
shoppingCartLib.updateUPCinShoppingCart(appKey, shoppingCartFull, UPCdata, shoppingCart);
shoppingCartLib.triggerSCRefresh(source,appKey,shoppingCart);                       

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getLatestShoppingCart(appKey, shoppingCart));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while getting latest shopping cart: [" + err.message + "]");
	$.response.returnCode = 200;
}