var shoppingCartLib = $.import("xsjs", "ShoppingCart");
var appKey = $.request.parameters.get('appKey');
var appTime = $.request.parameters.get('time');
if (appKey) {
	appKey = appKey.replace(/['"]+/g, '');
}
if (appTime) {
	appTime = appTime.replace(/['"]+/g, '');
}
var shoppingCart = $.request.parameters.get('shoppingCart');
if (shoppingCart) {
	shoppingCart = shoppingCart.replace(/['"]+/g, '');
}
var query = null;
if (appTime !== null) {
	query = 'SELECT MAX( "timestamp" ) FROM \"AnalysisRequest\" WHERE "appKey" = \'' + appKey + '\' AND "imageType" = \'P\'';
} else {
	query = 'SELECT MAX( "timestamp" ) FROM \"AnalysisRequest\" WHERE "appKey" = \'' + appKey + '\' AND "timestamp" = \'' + appTime +
		'\' AND "imageType" = \'P\'';
}

function getODData() {
	var connection = $.hdb.getConnection();
	var resultSet = null;
	var mostRecent = null;
	var UPCdata = {};
	try {
		resultSet = connection.executeQuery(query);
		for (i = 0; i < resultSet.length; i++) {
			mostRecent = resultSet[0]["MAX(timestamp)"];
			if (mostRecent === null) {
				mostRecent = new Date();
			}
			var query2 = 'SELECT  "appKey", "timestamp", "upc", "match" FROM "AnalysisResults"' + ' WHERE "appKey" = \'' + appKey +
				'\' AND "timestamp" = \'' + mostRecent.toISOString() + '\' ORDER BY "match" DESC';
			var resultSet2 = null;
			var resultSet3 = null;
			var query3 = null;
			try {
				resultSet2 = connection.executeQuery(query2);
				var shoppingCartFull = {};
				if (!shoppingCart){
					shoppingCartFull = shoppingCartLib.getLatestShoppingCart(appKey,null);
					shoppingCart = shoppingCartFull.header.autoId;
				}
                UPCdata = shoppingCartLib.getUPCData(resultSet2[0].upc,appKey,shoppingCart,"L");                        
			} catch (err) {
				$.trace.debug("Error getting image " + err.toString());
			}
		}
	} catch (err) {
		$.trace.debug("Error getting image " + err.toString());
	}
	return UPCdata;
}

function doGet() {
	try {
		$.response.contentType = "application/json";
		$.response.setBody(JSON.stringify(getODData()));
	} catch (err) {
		$.response.contentType = "text/plain";
		$.response
			.setBody("Error while executing query: [" + err.message + "]");
		$.response.returnCode = 200;
	}
}

doGet();