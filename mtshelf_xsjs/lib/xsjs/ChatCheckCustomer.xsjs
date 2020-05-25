var checkCustomer = $.import("xsjs","CheckCustomer");
//if the request is a post with a body
var i = 0;
var postMethod = false;
for (i=0; i<$.request.headers.length; i++) {
	if ($.request.headers[i].name = "~request_method") {
		if ($.request.headers[i].value === "POST") {
			postMethod = true;
		}
		// request_method is used more than once - i = $.request.headers.length;
	}
}
if (postMethod) {
	var reqBodyString = $.request.body.asString();

	var reqBody = JSON.parse(reqBodyString);
	var username = reqBody.conversation.memory.checkusername;
	var email = reqBody.conversation.memory.customeremail;
	var connection = $.hdb.getConnection();
	// Get Current Timestamp
	var time_query = "SELECT CURRENT_TIMESTAMP FROM DUMMY";
	var CSRFToken = "";
	var resultSet = null;
	var time = null;
	var results = {
		test: "ok"
	};
	$.trace.debug("GGA top 2");
	try {
		resultSet = connection.executeQuery(time_query);
		if (resultSet[0]) {
			time = resultSet[0].CURRENT_TIMESTAMP;
		}
	} catch (err) {
		$.trace.debug("Error getting timestamp " + err.toString());
	}
	$.trace.debug("gga email: " + email); 
	if (email) {
	    $.trace.debug("gga 1"); 
		email = email.replace(/['"]+/g, '');
		// Check if E-Mail is already in table
		results = checkCustomer.getBusinessPartnerFromEmail(email);
	} else if (username) {
	    $.trace.debug("gga 2"); 
		username = username.replace(/['"]+/g, '');
		var query = "";
		// For this username, find the most recent registration
		email = checkCustomer.getEmailForUsername(username);
		results = checkCustomer.getBusinessPartnerFromEmail(email);
	}
	$.trace.debug("gga results 3: " + JSON.stringify(results));
	var returnBody = {};
	var replies = [];
	//setup the bot return message
	var botReplyText = {
		type: "text",
		content: "Your user name is: " + results.username + "\nEmail: " + results.email + "\nCustomer: " + results.customer
	};
	//setup the return memory starting with the request memory
	var returnConversation = reqBody.conversation;
	returnConversation.memory.username = results.username;
	returnConversation.memory.email = results.email;
	returnConversation.memory.customer = results.customer;
	replies.push(botReplyText);
	returnBody.replies = replies;
	returnBody.conversation = returnConversation;

	$.response.contentType = "application/json";
	$.response.setBody(JSON.stringify(returnBody));

} else {

	var body = {
	
		conversation: {
			language: "en",
			memory: {
				
			}
		}
	};

	$.response.contentType = "application/json";

	//	var memoryToSendBack = reqBody.conversation.memory;
	var memoryToSendBack = {};
	memoryToSendBack.valFromHANA = "from Hana";
	body.conversation.memory = memoryToSendBack;

	//get is for getting the CSRF token
	//iterate through the response headers to find the CSRF token so we can put it in memory
	for (var i = 0; i < $.response.headers.length; i++) {
		if ($.response.headers[i].name === "x-csrf-token") {
			body.conversation.memory.csrf = {
				"value": $.response.headers[i].value,
				"raw": $.response.headers[i].value,
				"confidence": 0.99
			};
			break;
		}
	}

	$.response.setBody(JSON.stringify(body));

	/*
	$.trace.debug("Use POST with the chat conversion in the body.");
	var results = {
		message: "Use POST with the chat conversion in the body."
	};
	$.response.contentType = "application/json";
	$.response.setBody(JSON.stringify(results));
	*/
}