$.response.contentType = "text/html";
var dest = $.net.http.readDestination("ShoppAR_S4HANA");

var client = new $.net.http.Client();
// Get Access Token
var accessToken = this.getOAuthToken();
var req = new $.web.WebRequest($.net.http.GET, "/sap/opu/odata/sap/SECATT_PING_SERVICE/?$metadata");
req.headers.set("SAP-Connectivity-SCC-Location_ID", "IET");
req.headers.set("Proxy-Authorization", "Bearer " + accessToken);

client.request(req, dest);

var response = client.getResponse().body.asString();
$.response.setBody(response);

function getOAuthToken() {
	//var dest = $.net.http.readDestination("destinations", "AccessToken");
	var dest = $.net.http.readDestination("ShoppAR_ConnectivityAccessToken");
	var client = new $.net.http.Client();
	var req = new $.net.http.Request($.net.http.GET, "/oauth/token?grant_type=client_credentials");
	req.contentType = "application/json";
	client.request(req, dest);
	var response = client.getResponse();
	var results = null;
	var accessToken = null;
	if (response.body) {
		$.trace.debug("Response Body: " + response.body.asString());
		var body = response.body.asString();
		results = JSON.parse(body);
		// Now update results table with values that were retrieved.
		accessToken = results.access_token;
	}
	return accessToken;
}