var appKey = $.request.parameters.get('appKey');
appKey = appKey.replace(/'/g,'');
var query = 'SELECT "timestamp" FROM "AnalysisRequest" WHERE "appKey" = \'' + appKey + '\' ORDER BY "timestamp" DESC';

function close(closables) {
	var closable;
	var i;
	for (i = 0; i < closables.length; i++) {
		closable = closables[i];
		if(closable) {
			closable.close();
		}
	}
}
function deleteRecords(){
	var connection = $.db.getConnection();
	var statement = null;
	var resultSet = null;
	var mostRecent = null;
	var query2 = null;
	var statement2 = null;
	var resultSet2 = null;
	try {
		statement = connection.prepareStatement(query);
		resultSet = statement.executeQuery();
		var skip = true;
		while (resultSet.next()) {
			if (!skip) {
				mostRecent = resultSet.getTimestamp(1);
				query2 = 'DELETE FROM "AnalysisResults" WHERE "appKey" = \'' + appKey + "' AND \"timestamp\" = '" + mostRecent.toISOString() + "'";
				statement2 = null;
				resultSet2 = null;
				try {
					statement2 = connection.prepareStatement(query2);
					resultSet2 = statement2.executeQuery();
				} finally {
					if (resultSet2) {
						resultSet2.close();
					}
					if (statement2) {
						statement2.close();
					}
					connection.commit();
				}
				query2 = 'DELETE FROM "AnalysisRequest" WHERE "appKey" = \'' + appKey + "' AND \"timestamp\" = '" + mostRecent.toISOString() + "'";
				try {
					statement2 = connection.prepareStatement(query2);
					resultSet2 = statement2.executeQuery();
				} finally {
					if (resultSet2) {
						resultSet2.close();
					}
					if (statement2) {
						statement2.close();
					}
					connection.commit();
				}
				
			} else {
				skip = false;
			}

		}
	} finally {
		if (resultSet) {
			resultSet.close();
		}
		if (statement) {
			statement.close();
		}
		if (connection) {
			connection.close();
		}
	}
	return "Old records were successfully deleted";
}
function doDelete() {

	try{
		$.response.contentType = "text/plain";
		$.response.setBody(deleteRecords());
	}
	catch(err){
		$.response.contentType = "text/plain";
		$.response.setBody("Error while deleting records: [" + err.message + "]");
		$.response.returnCode = 200;
	}
}
doDelete();