var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var reqBodyString = $.request.body.asString();
var reqBody = JSON.parse(reqBodyString);

try {
	$.response.contentType = "text/plain";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getActivePromotions(reqBody));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while trying to get active promotions: " + err.message);
	$.response.returnCode = 200;
}