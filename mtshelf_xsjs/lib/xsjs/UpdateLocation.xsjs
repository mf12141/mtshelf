var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var upc = $.request.parameters.get('upc');
if (upc) {
	upc = upc.replace(/['"]+/g, '');
}

var aisle = $.request.parameters.get('aisle');
if (aisle) {
	aisle = aisle.replace(/['"]+/g, '');
}

var area = $.request.parameters.get('area');
if (area) {
	area = area.replace(/['"]+/g, '');
}

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.executeRelocate(upc, aisle, area));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while updating the location: [" + err.message + "]");
	$.response.returnCode = 200;
}