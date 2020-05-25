var shoppingCartLib = $.import("xsjs", "ShoppingCart");
// var appKey = $.request.parameters.get('appKey');
// if (appKey) {
// 	appKey = appKey.replace(/['"]+/g, '');
// }
// var shoppingCart = $.request.parameters.get('shoppingCart');
// if (shoppingCart) {
// 	shoppingCart = shoppingCart.replace(/['"]+/g, '');
// } else {
// 	shoppingCart = shoppingCartLib.getLatestShoppingCartNumber(appKey);
// }
var i = 0;
var postMethod = false;
var query = "No Query Found";
for (i=0; i<$.request.headers.length; i++) {
	if ($.request.headers[i].name = "~request_method") {
		if ($.request.headers[i].value === "POST") {
			postMethod = true;
			i = $.request.headers.length;
		}
	}
}
var respBody = {}
if (postMethod) {
	var reqBodyString = $.request.body.asString();
	var reqBody = JSON.parse(reqBodyString);
	respBody = shoppingCartLib.chatItemSearch(reqBody);
}

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(respBody);
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while getting latest shopping cart: [" + err.message + "]");
	$.response.returnCode = 200;
}