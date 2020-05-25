var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var to = $.request.parameters.get('email');
if (to) {
	to = to .replace(/['"]+/g, '');
}
var subject = $.request.parameters.get('subject');
if (subject) {
	subject = subject.replace(/['"]+/g, '');
}
var message = $.request.parameters.get('message');
if (message) {
	message = message.replace(/['"]+/g, '');
}

try {
	$.response.contentType = "application/json";
	$.response.returnCode = 200;
	$.response.setBody(shoppingCartLib.sendUserEmail(to,subject,message));
} catch (err) {
	$.response.contentType = "text/plain";
	$.response.setBody("Error while emailing: [" + err.message + "]");
	$.response.returnCode = 200;
}