var appKey = $.request.parameters.get('appKey');
var appTime = $.request.parameters.get('time');
if (appKey) {
	appKey = appKey.replace(/['"]+/g, '');
}
if (appTime) {
	appTime = appTime.replace(/['"]+/g, '');
}
var query = null;
if (appTime !== null) {
	query = 'SELECT MAX( "timestamp" ) FROM "AnalysisRequest" WHERE "appKey" = \'' + appKey + '\' AND "imageType" = \'P\'';
} else {
	query = 'SELECT MAX( "timestamp" ) FROM "AnalysisRequest" WHERE "appKey" = \'' + appKey + '\' AND "timestamp" = \'' + appTime +
		'\' AND "imageType" = \'P\'';
}

function getImageData() {
	var connection = $.hdb.getConnection();
	var resultSet = null;
	var mostRecent = null;
	var results = {};
	var record = null;
	results.records = [];
	try {
		resultSet = connection.executeQuery(query);
		if (resultSet[0]) {
			mostRecent = resultSet[0]["MAX(timestamp)"];
			if (mostRecent === null) {
				mostRecent = new Date();
			}
			var query2 = 'SELECT  "appKey", "timestamp", "upc", "match" FROM "AnalysisResults"' + ' WHERE "appKey" = \'' + appKey +
				'\' AND "timestamp" = \'' + mostRecent.toISOString() + '\' ORDER BY "match" DESC';
			var resultSet2 = null;
			var resultSet3 = null;
			var query3 = null;
			var upc = null;
			try {
				resultSet2 = connection.executeQuery(query2);
				var loopCount = 0;
				if (resultSet2[0]) {
					upc = resultSet2[0].upc;
					query3 = 'SELECT "snapshot" FROM "StockPhotoOverride" WHERE "upc" = \'' + upc + "'";
					resultSet3 = connection.executeQuery(query3);
					if (resultSet3[0]) {
						record = resultSet3[0].snapshot;
					}
				}
			} catch (err) {
				$.trace.debug("Error getting image " + err.toString());
			}
		}
	} catch (err) {
		$.trace.debug("Error getting image " + err.toString());
	}
	return record;
}

function doGet() {

	try {
		$.response.contentType = "image/jpeg";
		$.response.setBody(getImageData());
	} catch (err) {
		$.response.contentType = "text/plain";
		$.response.setBody("Error while executing query: [" + err.message + "]");
		$.response.returnCode = 200;
	}
}

doGet();