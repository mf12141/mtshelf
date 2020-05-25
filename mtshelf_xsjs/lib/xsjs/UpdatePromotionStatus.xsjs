var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var status = $.request.parameters.get('status');
if (status) {
	status = status.replace(/['"]+/g, '');
} else {
	status = 'A';
}
var promotion = $.request.parameters.get('promotion');
var body = {};
if (promotion) {
	promotion = promotion.replace(/['"]+/g, '');
	shoppingCartLib.updatePromotionStatus(promotion,status);
}


try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.getPromotions());
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while trying to update status: [" + err.message + "]");
	$.response.returnCode = 200;
}