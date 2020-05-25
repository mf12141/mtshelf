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

try {
	var query =
		'INSERT INTO "AnalysisRequest"("appKey", "timestamp", "imageType", "snapshot", "status", "history.CREATEDBY", "history.CREATEDAT", "history.CHANGEDBY", "history.CHANGEDAT") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
	$.response.contentType = "text/html";
	if ($.request.entities.length > 0) {
		var appKey = $.request.entities[0].body.asString();
		var appTime = $.request.entities[1].body.asString();
		//appTime = appTime.substr(5); // Why are there 5 extra characters at the beginning of the string?
		var imageType = $.request.entities[2].body.asString();
		// Read in the posted image or binary data as an Array Buffer - you
		// can use this to save as a BLOB
		var snapshot = $.request.entities[3].body.asArrayBuffer();
		var timeString = time.toISOString();
		var resultSet2 = connection.executeUpdate(query, appKey, appTime, imageType, snapshot, 'N', appKey, timeString, appKey, timeString);
		$.response.setBody("[200]:Upload of snapshot was successful!");
	} else {
		$.response.setBody("No Entries in request");
	}
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