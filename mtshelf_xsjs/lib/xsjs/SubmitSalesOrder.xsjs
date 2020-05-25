var customer = $.request.parameters.get('customer');
var partNumber = $.request.parameters.get('partNumber');
var connection = $.hdb.getConnection();
// Get Current Timestamp
var time_query = "SELECT CURRENT_TIMESTAMP FROM DUMMY";
var CSRFToken = "";
var resultSet = null;
var time = null;
var results = {};
try {
	resultSet = connection.executeQuery(time_query);
	if (resultSet[0]) {
		time = resultSet[0].CURRENT_TIMESTAMP;
	}
} catch (err) {
	$.trace.debug("Error getting timestamp " + err.toString());
}
// Create Sales Order
if (customer) {
	customer = customer.replace(/['"]+/g, '');
}
if (partNumber) {
	partNumber = partNumber.replace(/['"]+/g, '');
}
var parameters = {};
parameters.customer = customer;
parameters.partNumber = partNumber;
parameters.timestamp = time;

results = this.createS4SalesOrder(parameters);
$.response.contentType = "application/json";
$.response.setBody(JSON.stringify(results));

function createS4SalesOrder(parameters) {
	try {
		var body = this.buildSalesOrderObject(parameters);
		var dest = $.net.http.readDestination("ShoppAR_S4HANA");
		var clnt2 = new $.net.http.Client();
		var path = "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder";
		var req = new $.web.WebRequest($.net.http.POST,path);
		req.headers.set("SAP-Connectivity-SCC-Location_ID", "IET");
		var accessToken = this.getOAuthToken();
        req.headers.set("Proxy-Authorization", "Bearer " + accessToken);
		//var token = this.getCSRFToken(path); // Worked to return CSRF
		//req.headers.set("X-CSRF-Token", token); // Working for CSRF
		req.headers.set("Content-Type","application/json; charset=utf-8");
		req.headers.set("Accept", "application/json");
		req.headers.set("X-Requested-With", "X"); // Added because of disabled CSRF due to errors
		req.setBody(JSON.stringify(body));
		clnt2.request(req, dest);
		var resp = clnt2.getResponse();
		var response = JSON.parse(resp.body.asString());
		var results = {};
		if (response.error) {
			results.error = "Unable to create a S4 Sales Order.";
			results.techError = response.error;
		} else {
			results.message = "Sales order " + response.d.SalesOrder + " was successfully created";
			parameters.salesOrder = response.d.SalesOrder;
			this.createSalesOrderRecord(parameters);
		}
		return results;
	} catch (err) {
		$.trace.debug("Unable to create business partner" + err.toString());
	}
}

function buildSalesOrderObject(parameters) {
	var templateString = 
	'{"SalesOrderType": "OR",' +
    '"SalesOrganization": "1710",' +
    '"DistributionChannel": "10",' +
	'"OrganizationDivision": "00",' +
	'"SoldToParty": "1000054",' +
	'"to_Item": [ {' +
    '"SalesOrderItem": "10",' +
	'"Material": "LEGO303926",' +
	'"RequestedQuantity": "1",' +
	'"RequestedQuantityUnit": "PC"}],' +
	'"to_Partner": [{' +
	'"PartnerFunction": "SH",' +
    '"Customer": "1000054"}]}';	
	var template = JSON.parse(templateString);
	template.SoldToParty = parameters.customer;
	template.to_Item[0].Material = parameters.partNumber;
	template.to_Partner[0].Customer = parameters.customer;
	return template;
}

function createSalesOrderRecord(parameters) {
	try {
		var conn = $.hdb.getConnection();
		var query = 'INSERT INTO "SalesOrder"("orderNumber", "customer", "partNumber", "timestamp") VALUES (?,?,?,?)';
		var result = conn.executeUpdate(query, parameters.salesOrder, parameters.customer, parameters.partNumber, parameters.timestamp);
		parameters.result = result;
		conn.commit();
		return parameters.salesOrder;
	} catch (err) {
		$.trace.debug("Unable to create customer record " + err.toString());
	}
}

function getCSRFToken(path){
	var dest = $.net.http.readDestination("ShoppAR_S4HANA");
	var clnt = new $.net.http.Client();
	var req = new $.web.WebRequest($.net.http.GET,path);
	req.headers.set("SAP-Connectivity-SCC-Location_ID", "IET");
	req.headers.set("X-CSRF-Token", "Fetch");
	req.parameters.set("$format","json");
	clnt.request(req, dest);
	var resp = clnt.getResponse();
	var token = resp.headers.get("X-CSRF-Token");
	return token;
}

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