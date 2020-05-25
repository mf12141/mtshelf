var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var upc = $.request.parameters.get('upc');
if (upc) {
	upc = upc.replace(/['"]+/g, '');
}

var quantity = $.request.parameters.get('quantity');
if (quantity) {
	quantity = quantity.replace(/['"]+/g, '');
}

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.executeCycleCount(upc, quantity));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while updating the location: [" + err.message + "]");
	$.response.returnCode = 200;
}