var shoppingCartLib = $.import("xsjs", "ShoppingCart");

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getPromotions());
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while getting promotions: [" + err.message + "]");
	$.response.returnCode = 200;
}