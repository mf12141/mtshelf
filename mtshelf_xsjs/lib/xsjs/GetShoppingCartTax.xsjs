var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var shoppingCartNumber = $.request.parameters.get('shoppingCart');
if (shoppingCartNumber) {
	shoppingCartNumber = shoppingCartNumber.replace(/['"]+/g, '');
} else {
	shoppingCartNumber = "";
}

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	var body = {};
	body.taxAmount = shoppingCartLib.getShoppingCartTax(shoppingCartNumber);
	$.response.setBody(body);
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while getting tax for shopping cart: [" + err.message + "]");
	$.response.returnCode = 200;
}