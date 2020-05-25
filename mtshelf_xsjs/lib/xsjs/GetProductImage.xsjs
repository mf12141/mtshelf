var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var upc = $.request.parameters.get('upc');

function doGet() {

	try {
		$.response.contentType = "image/jpeg";
		$.response.setBody(shoppingCartLib.getImageData(upc));
	} catch (err) {
		$.response.contentType = "text/plain";
		$.response.setBody("Error while executing query: [" + err.message + "]");
		$.response.returnCode = 200;
	}
}

doGet();