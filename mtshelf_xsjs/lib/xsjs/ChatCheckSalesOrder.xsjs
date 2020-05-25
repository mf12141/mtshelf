var reqBodyString = $.request.body.asString();
var reqBody = JSON.parse(reqBodyString);
var customer = reqBody.conversation.memory.customer;

var botReply = this.checkSalesOrderRecord(customer, reqBody.conversation.memory);
var returnBody = {};
var replies = [];
replies.push(botReply);
returnBody.replies = replies;
returnBody.conversation = reqBody.conversation;

$.response.contentType = "application/json";
$.response.setBody(JSON.stringify(returnBody));

function checkSalesOrderRecord(customer, memory) {
	var botReply = {
		type: "text",
		content: ""
	};
	try {
		var conn = $.hdb.getConnection();
		var query = 'SELECT MAX( "timestamp" ), "orderNumber", "partNumber" FROM "SalesOrder" WHERE "customer" = \'' + customer + 
		            '\' GROUP BY "orderNumber", "partNumber"';

		var resultSet = conn.executeUpdate(query);
		if (resultSet[0]) {
			memory.orderNumber = resultSet[0].orderNumber;
			memory.partNumber = resultSet[0].partNumber;
			memory.orderTimestamp = resultSet[0].timestamp;
			botReply.content = "You have already created a sales order in the system.  It is SO Number: " + memory.orderNumber + ".";
		} else {
            botReply.content = "I cannot find a sales order for customer " + customer + ".";
		}
		return botReply;
	} catch (err) {
		$.trace.debug("Unable to check order record " + err.toString());
	}
}