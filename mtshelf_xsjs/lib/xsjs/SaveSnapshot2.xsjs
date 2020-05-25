var connection = $.hdb.getConnection();
var analyzeImages = $.import("xsjs", "AnalyzeImages");
// Get Current Timestamp
var time_query = "SELECT CURRENT_TIMESTAMP FROM DUMMY";
var statement = null;
var resultSet = null;
var time = null;
try {
	resultSet = connection.executeQuery(time_query);
	if (resultSet[0]) {
		time = resultSet[0].CURRENT_TIMESTAMP;
	}
} catch (err) {
	$.trace.debug("Error getting current timestamp " + err.toString());
}

var i = 0;
var postMethod = false;
for (i = 0; i < $.request.headers.length; i++) {
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
	try {
		var query =
			'INSERT INTO "AnalysisRequest"("appKey", "timestamp", "imageType", "snapshot", "status", "history.CREATEDBY", "history.CREATEDAT", "history.CHANGEDBY", "history.CHANGEDAT") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
		$.response.contentType = "text/html";
		var appKey = reqBody.appKey;
		var appTime = reqBody.appTime;
		var imageType = reqBody.imageType;
		// Read in the posted image or binary data as an Array Buffer - you
		// can use this to save as a BLOB
		var snapshot = $.util.codec.decodeBase64(reqBody.snapshot);
		var timeString = time.toISOString();
		var resultSet2 = connection.executeUpdate(query, appKey, appTime, imageType, snapshot, 'N', appKey, timeString, appKey, timeString);
		$.response.setBody("[200]:Upload of snapshot was successful!");
		connection.commit();
		var input = {
			'appKey': appKey
		};
		analyzeImages.processClassifications(input);
	} catch (err) {
		$.response.contentType = "text/html";
		$.response
			.setBody("File could not be saved in the database.  Here is the error:" + err.message + " " + appTime + " " + time);
	}
}