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

function createS4BusinessPartner(registration) {
	try {
		var body = this.buildBusinessPartnerObject(registration);
		var dest = $.net.http.readDestination("MTShelf_S4HANA");
		var clnt2 = new $.net.http.Client();
		var path = "/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner";
		var req = new $.web.WebRequest($.net.http.POST,path);
		req.headers.set("SAP-Connectivity-SCC-Location_ID", "MTShelf");
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
			results.error = "Unable to create an S4 Business Partner.";
			results.techError = response.error;
		} else {
			results = response.d;
		}
		return results;
	} catch (err) {
		$.trace.debug("Unable to create business partner" + err.toString());
	}
}

function buildBusinessPartnerObject(registration) {
	var templateString = '{"BusinessPartnerCategory" : "1", "BusinessPartnerGrouping" :"BP02",'
			+ '"CorrespondenceLanguage" : "EN","FirstName": "Gregory","LastName" : "Hawkins",'
			+ '"to_BusinessPartnerAddress" : [ {"Country" : "US","StreetName" : "17th Street NW",'
			+ '"HouseNumber" : "2420","Region" : "MN", "PostalCode" : "55112","CityName" : "New Brighton",'
			+ '"to_AddressUsage" : [ {"AddressUsage" : "XXDEFAULT" } ],'
			+ '"to_EmailAddress" : [{"EmailAddress" : "gregory.hawkins@sap.com" }]}],'
			+ '"to_BusinessPartnerRole" : [{"BusinessPartnerRole" : "FLCU00"},{"BusinessPartnerRole" : "FLCU01"},{"BusinessPartnerRole" : "UDM000"}],'
			+ '"to_Customer" : {"CustomerName": "Gregory Hawkins","CustomerAccountGroup" : "CUST",'
	        + '"to_CustomerSalesArea": [{"SalesOrganization": "1710","DistributionChannel": "10","Division": "00",'
	        + '"Currency": "USD", "CustomerGroup": "01", "CustomerPricingProcedure": "02", "CustomerAccountGroup": "CUST",'
	        + '"to_PartnerFunction": [{"PartnerFunction": "SP"},{"PartnerFunction": "BP"},'
	        + '{"PartnerFunction": "PY"},{"PartnerFunction": "SH"}]}]}}';
	var template = JSON.parse(templateString);
	template.to_BusinessPartnerAddress[0].to_EmailAddress[0].EmailAddress = registration.email;
	template.FirstName = registration.first_name;
	template.LastName = registration.last_name;
	template.to_BusinessPartnerAddress[0].HouseNumber = registration.house_number;
	template.to_BusinessPartnerAddress[0].StreetName = registration.street_name;
	template.to_BusinessPartnerAddress[0].CityName = registration.city;
	template.to_BusinessPartnerAddress[0].Region = registration.state;
	template.to_BusinessPartnerAddress[0].PostalCode = registration.zip_code;
	template.to_BusinessPartnerAddress[0].Country = registration.country;
	template.to_Customer.CustomerName = registration.first_name + " "
			+ registration.last_name;
	return template;
}

function getS4Registration(email) {
	try {		
		var dest = $.net.http.readDestination("MTShelf_S4HANA");
		var clnt = new $.net.http.Client();
		var path = "/sap/opu/odata/sap/ZGDH_REGISTER_DDL_CDS/ZGDH_REGISTER_DDL('" + email + "')";
		var req = new $.web.WebRequest($.net.http.GET,path);
		req.headers.set("SAP-Connectivity-SCC-Location_ID", "MTShelf");
		var accessToken = this.getOAuthToken();
        req.headers.set("Proxy-Authorization", "Bearer " + accessToken);
		req.parameters.set("$format","json");
		clnt.request(req, dest);
		var resp = clnt.getResponse();
        var body = resp.body.asString();
		var response = JSON.parse(body);
		var results = {};
		if (response.error) {
			results.error = "Unable to find a registration for the entered e-mail "
					+ email;
			results.techError = response.error;
		} else {
			results = response.d;
		}
		return results;
	} catch (err) {
		$.trace.debug("Unable to get S4 registration " + err.toString());
	}
}

function getBusinessPartnerFromEmail(email) {
	results = {};
	// Check if E-Mail is already in table
	var customer = this.getCustomerRecordFromEmail(email);
	if (customer) {
		// Customer exists, return the customer number
		results.customer = customer.customer;
		results.username = customer.username;
		results.firstName = customer.firstName;
		results.lastName = customer.lastName;
		results.email = email;
	} else {
		// If the customer doesn't exist, check if the registration has been
		// done.
		var registration = this.getS4Registration(email);
		if (registration.error) {
			// Provide the error to the caller
			results.error = "Registration not found.  Please register via CoPilot";
			results.techError = registration.error;
		} else {
			// Now you need to create the business partner
			var businessPartner = this.createS4BusinessPartner(registration);
			if (businessPartner.error) {
				results.error = "Unable to create a Business Partner for your registration.";
				results.techError = businessPartner.error;
			} else {
				results.customer = businessPartner.BusinessPartner;
				results.username = registration.uname;
				results.firstName = registration.first_name;
				results.lastName = registration.last_name;
				results.email = email;
				this.createCustomerRecord(results.customer, results.email,
						results.username, results.firstName, results.lastName);
			}
		}
	}
	return results;
}

function getEmailForUsername(username) {
	try {
		var dest = $.net.http.readDestination("MTShelf_S4HANA");
		var client = new $.net.http.Client();
		var req = new $.web.WebRequest(
				$.net.http.GET,
				'/sap/opu/odata/sap/ZGDH_REGISTER_DDL_CDS/ZGDH_REGISTER_DDL');
		var i;
		var customer = null;
		req.headers.set("SAP-Connectivity-SCC-Location_ID", "MTShelf");
		var accessToken = this.getOAuthToken();
        req.headers.set("Proxy-Authorization", "Bearer " + accessToken);
		req.headers.set("Accept", "application/json");
		req.parameters.set("$filter",'uname eq \''
						+ username + "'");
		client.request(req, dest);

		var response = JSON.parse(client.getResponse().body.asString());
		var results = {};
		if (response.error) {
			results.error = "Unable to find a e-mail for the entered username "
					+ username;
			results.techError = response.error;
		} else {
			var finished = false;
			for (i = 0; i < response.d.results.length; i++) {
				customer = this
						.getCustomerRecordFromEmail(response.d.results[i].email);
				if (customer === null) {
					// This means you should use this e-mail.
					results = response.d.results[i].email;
					finished = true;
					i = response.d.results.length;
				}
			}
			if (!finished) {
				// Just pick the first e-mail. There is not a new registration,
				// so any registration would work.
				results = response.d.results[0].email;
			}
		}
		return results;
	} catch (err) {
		$.trace.debug("Unable to get customer from record " + err.toString());
	}
}

function getEmailForEmail(email) {
	try {
		var dest = $.net.http.readDestination("MTShelf_S4HANA");
		var client = new $.net.http.Client();
		var req = new $.web.WebRequest(
				$.net.http.GET,
				'/sap/opu/odata/sap/ZGDH_REGISTER_DDL_CDS/ZGDH_REGISTER_DDL');
		var i;
		var uname = null;
		var returnEmail = email;
		req.headers.set("SAP-Connectivity-SCC-Location_ID", "MTShelf");
		var accessToken = this.getOAuthToken();
        req.headers.set("Proxy-Authorization", "Bearer " + accessToken);
		req.headers.set("Accept", "application/json");
		req.parameters.set("$filter",'email eq \''
						+ email + "'");
		client.request(req, dest);

		var response = JSON.parse(client.getResponse().body.asString());
		var results = {};
		if (response.error) {
			results.error = "Unable to find a username for the entered e-mail "
					+ email;
			results.techError = response.error;
		} else {
			var finished = false;
			for (i = 0; i < response.d.results.length; i++) {
				uname = response.d.results[i].uname;
			}
			if (uname) {
				// Just pick the first e-mail. There is not a new registration,
				// so any registration would work.
				returnEmail = this.getEmailForUsername(uname);
			}
		}
		return returnEmail;
	} catch (err) {
		$.trace.debug("Unable to get email from record " + err.toString());
	}
}

function getCustomerRecordFromEmail(email) {
	try {
		var conn= $.hdb.getConnection();
		var query = 'SELECT * FROM "Customer" WHERE "email" = \''
				+ email + "'";
		var rs = conn.executeQuery(query);
		var result = null;
		if (rs[0]) {
			result = rs[0];
		}
		return result;
	} catch (err) {
		$.trace.debug("Unable to get customer from record " + err.toString());
	}
}

function createCustomerRecord(customer, email, username, firstName, lastName) {
	try {
		var conn = $.hdb.getConnection();
		var query = 'INSERT INTO "Customer"("customer", "email", "username", "firstName", "lastName", "timestamp") VALUES (?,?,?,?,?,?)';
		conn.executeUpdate(query, customer, email, username, firstName, lastName, time);
		conn.commit();
	} catch (err) {
		$.trace.debug("Unable to create customer record " + err.toString());
	}
}

function getCSRFToken(path){
	var dest = $.net.http.readDestination("MTShelf_S4HANA");
	var clnt = new $.net.http.Client();
	var req = new $.web.WebRequest($.net.http.GET,path);
	req.headers.set("SAP-Connectivity-SCC-Location_ID", "MTShelf");
	req.headers.set("X-CSRF-Token", "Fetch");
	req.parameters.set("$format","json");
	clnt.request(req, dest);
	var resp = clnt.getResponse();
	var token = resp.headers.get("X-CSRF-Token");
	return token;
}

function getOAuthToken() {
	//var dest = $.net.http.readDestination("destinations", "AccessToken");
	var dest = $.net.http.readDestination("MTShelf_ConnectivityAccessToken");
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