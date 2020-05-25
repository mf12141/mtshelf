var checkCustomer = $.import("xsjs", "CheckCustomer");
var username = $.request.parameters.get('username');
var email = $.request.parameters.get('email');

if (email) {
	email = email.replace(/['"]+/g, '');
	// Check if E-Mail is already in table
	var targetEmail = checkCustomer.getEmailForEmail(email);
	results = checkCustomer.getBusinessPartnerFromEmail(targetEmail);
} else if (username) {
	username = username.replace(/['"]+/g, '');
	var query = "";
	// For this username, find the most recent registration
	email = checkCustomer.getEmailForUsername(username);
	results = checkCustomer.getBusinessPartnerFromEmail(email);
}
$.response.contentType = "application/json";
$.response.setBody(JSON.stringify(results));
