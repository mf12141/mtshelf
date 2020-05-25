var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var promotion = $.request.parameters.get('promotion');
if (promotion) {
	promotion = promotion.replace(/['"]+/g, '');
}

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getPromotionData(promotion));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while getting promotion data: [" + err.message + "]");
	$.response.returnCode = 200;
}