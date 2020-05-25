var appKey = $.request.parameters.get('appKey');
var imageType = $.request.parameters.get('imageType');
var query = 'SELECT MAX( "timestamp" ) FROM \"AnalysisRequest\" WHERE "appKey" = ' + appKey + ' AND "imageType" = ' + imageType;

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
function getImageData(){
	var connection = $.db.getConnection();
	var statement = null;
	var resultSet = null;
	var image = null;
	var mostRecent = null;
	try {
		statement = connection.prepareStatement(query);
		resultSet = statement.executeQuery();
		if (resultSet.next()) {
			mostRecent = resultSet.getTimestamp(1);
			var query2 = 'SELECT "snapshot" FROM "AnalysisRequest" WHERE "appKey" = ' + appKey + ' AND "imageType" = ' + imageType + " AND \"timestamp\" = '" + mostRecent.toISOString() + "'";
			var statement2 = null;
			var resultSet2 = null;
			try {
				statement2 = connection.prepareStatement(query2);
				resultSet2 = statement2.executeQuery();
				if (resultSet2.next()) {
					image = resultSet2.getBlob(1);
				}
			} finally {
				if (resultSet2) {
					resultSet2.close();
				}
				if (statement2) {
					statement2.close();
				}
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
	return image;
}
function doGet() {
    
          try{
                    $.response.contentType = "image/jpeg";
                    $.response.setBody(getImageData());
          }
          catch(err){
                    $.response.contentType = "text/plain";
                    $.response.setBody("Error while executing query: [" + err.message + "]");
                    $.response.returnCode = 200;
          }
}
doGet();