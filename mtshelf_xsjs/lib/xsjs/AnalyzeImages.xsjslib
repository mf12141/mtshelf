function processImages(input) {
	if (this.getLock('IMAGES')) {
		var appKey = null;
		appKey = input.appKey;
		// First determine how many images need to be processed
		var connection = $.db.getConnection();
		var query = null;

		if (appKey === 'None') {
			query = "SELECT \"appKey\" \"timestamp\" FROM \"AnalysisRequest\" WHERE \"imageType\"='O' AND \"status\" = 'N'";
		} else {
			query = "SELECT \"appKey\" \"timestamp\" FROM \"AnalysisRequest\" WHERE \"appKey\" = '" + appKey +
				"' AND \"imageType\" ='O' AND \"status\" = 'N'";
		}
		var statement = null;
		var resultSet = null;
		var updateStatement = null;
		var updateResult = null;
		var image = null;
		$.trace.debug("First Query: " + query);
		try {
			statement = connection.prepareStatement(query);
			resultSet = statement.executeQuery();
			var statusUpdate = null;
			var mostRecent = null;
			var accessToken = null;
			var query2 = null;
			var statement2 = null;
			var resultSet2 = null;
			var connection2 = null;
			var notDone = true;
			while (resultSet.next()) {
				if (notDone) {
					accessToken = this.getOAuthToken();
					notDone = false;
				}
				appKey = resultSet.getString(1);
				mostRecent = resultSet.getTimestamp(2);
				query2 = "SELECT \"snapshot\" FROM \"AnalysisRequest\" WHERE \"appKey\" = '" + appKey +
					"' AND \"imageType\" ='O' AND \"timestamp\" = '" + mostRecent.toISOString() + "'";
				statement2 = null;
				resultSet2 = null;
				image = null;
				try {
					statement2 = connection.prepareStatement(query2);
					resultSet2 = statement2.executeQuery();
					if (resultSet2.next()) {
						image = resultSet2.getBlob(1);
					}
				} catch (err) {
					statement2 = null;
				} finally {
					if (resultSet2) {
						resultSet2.close();
					}
					if (statement2) {
						statement2.close();
					}
				}
				this.processImage(image, accessToken, mostRecent, appKey);
				try {
					connection2 = $.db.getConnection();
					statusUpdate = "UPDATE \"AnalysisRequest\" SET \"status\" = 'P' WHERE \"appKey\" = '" + appKey +
						"' AND \"imageType\" = 'O' AND \"timestamp\" = '" + mostRecent.toISOString() + "'";
					updateStatement = connection2.prepareStatement(statusUpdate);
					updateResult = updateStatement.executeQuery();
					connection2.commit();
				} catch (err) {
					connection2 = null;
				} finally {
					if (updateResult) {
						updateResult.close();
					}
					if (updateStatement) {
						updateStatement.close();
					}
					if (connection2) {
						connection2.close();
					}

				}
			}
		} catch (err) {
			image = null;
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
		this.releaseLock('IMAGES');
	}
}

function getOAuthToken() {
	//var dest = $.net.http.readDestination("destinations", "AccessToken");
	var dest = $.net.http.readDestination("MTShelf_AccessToken");
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

function processImage(image, accessToken, mostRecent, appKey) {
	var dest = $.net.http.readDestination("destinations", "AnalyzeImages");
	var client = new $.net.http.Client();
	var req = new $.net.http.Request($.net.http.POST, "");
	req.contentType = "multipart/form-data";
	req.headers.set("Authorization", "Bearer " + accessToken);
	var entity = req.entities.create();
	entity.headers.set("Content-Disposition", "form-data; name=\"files\"; filename=\"product.jpg\"");
	entity.contentType = "image/jpeg";
	entity.setBody(image);
	entity = req.entities.create();
	entity.headers.set("Content-Disposition", "form-data; name=\"modelName\"");
	entity.setBody("dc");
	entity = req.entities.create();
	entity.headers.set("Content-Disposition", "form-data; name=\"modelVersion\"");
	entity.setBody("7");
	client.request(req, dest);
	var response = client.getResponse();
	var results = null;
	if (response.body) {
		results = JSON.parse(response.body.asString().replace(/\n/g, ''));
		var length = results.detection_boxes.length;
		var conn = null;
		var i = null;
		var pstmt = null;
		for (i = 0; i < length; i++) {
			try {
				conn = $.db.getConnection();
				pstmt = conn
					.prepareStatement(
						'INSERT INTO "AnalysisResults"("appKey", "timestamp", "imageType", "class", "match", "xMin", "yMin", "xMax", "yMax") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
					);
				pstmt.setString(1, appKey);
				pstmt.setTimestamp(2, mostRecent);
				pstmt.setString(3, 'O');
				pstmt.setString(4, results.detection_classes[i]);
				pstmt.setFloat(5, results.detection_scores[i]);
				pstmt.setFloat(6, results.detection_boxes[i][1]);
				pstmt.setFloat(7, results.detection_boxes[i][0]);
				pstmt.setFloat(8, results.detection_boxes[i][3]);
				pstmt.setFloat(9, results.detection_boxes[i][2]);
				pstmt.execute();
			} catch (err) {
				pstmt = null;
				conn = null;
			} finally {
				if (pstmt) {
					pstmt.close();
				}
				if (conn) {
					conn.commit();
					conn.close();
				}
			}
		}
	}
}

function getLock(scenario) {
	var lockSuccessful = false;
	var connection = $.db.getConnection();
	// Get Current Timestamp
	var time_query = "SELECT CURRENT_TIMESTAMP FROM DUMMY";
	var statement = null;
	var resultSet = null;
	var time = null;
	try {
		statement = connection.prepareStatement(time_query);
		resultSet = statement.executeQuery();
		if (resultSet.next()) {
			time = resultSet.getString(1);
		}
	} catch (err) {
		time = null;
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
	// Attempt to create lock
	var conn = $.db.getConnection();
	var pstmt = null;
	try {
		pstmt = conn.prepareStatement('INSERT INTO "Locks"("scenario", "time") VALUES (?, ?)');
		pstmt.setString(1, scenario); // Set the scenario
		pstmt.setTimestamp(2, time);
		pstmt.execute();
		pstmt.close();
		conn.commit();
		conn.close();
		lockSuccessful = true;
	} catch (err) {
		lockSuccessful = false;
		if (pstmt !== null) {
			pstmt.close();
		}
		if (conn !== null) {
			conn.close();
		}
	}
	return lockSuccessful;
}

function releaseLock(scenario) {
	// Attempt to create lock
	var connection = $.db.getConnection();
	var query = "DELETE FROM \"Locks\" WHERE \"scenario\" = '" + scenario + "'";
	var statement = null;
	var resultSet = null;
	try {
		statement = connection.prepareStatement(query);
		resultSet = statement.executeQuery();
		if (resultSet) {
			resultSet.close();
		}
		if (statement) {
			statement.close();
		}
		if (connection) {
			connection.commit();
			connection.close();
		}
	} catch (err) {
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
}

function processClassifications(input) {
	if (this.getLock('CLASSIF')) {
		var appKey = null;
		appKey = input.appKey;
		// First determine how many images need to be processed
		var connection = $.db.getConnection();
		var query = null;
		if (appKey === 'None') {
			query = "SELECT * FROM \"AnalysisRequest\" WHERE \"imageType\"='P' AND \"status\" = 'N'";
		} else {
			query = "SELECT * FROM \"AnalysisRequest\" WHERE \"appKey\" = '" + appKey + "' AND \"imageType\" ='P' AND \"status\" = 'N'";
		}
		var statement = null;
		var resultSet = null;
		var updateStatement = null;
		var updateResult = null;
		var image = null;
		$.trace.debug("First Query: " + query);
		try {
			statement = connection.prepareStatement(query);
			resultSet = statement.executeQuery();
			var statusUpdate = null;
			var mostRecent = null;
			var accessToken = null;
			//			var query2 =null;
			//			var statement2 = null;
			//			var resultSet2 = null;
			var connection2 = null;
			var notDone = true;
			while (resultSet.next()) {
				if (notDone) {
					accessToken = this.getOAuthToken();
					notDone = false;
				}
				appKey = resultSet.getString(2);
				mostRecent = resultSet.getTimestamp(3);
				image = resultSet.getBlob(5);
				//				query2 = "SELECT SNAPSHOT FROM \"INTELLIGENT_ENTERPRISE\".\"IMAGE_ANALYSIS_REQUEST\" WHERE APP_KEY = '" + appKey + "' AND IMAGE_TYPE = 'P' AND TIME = '" + mostRecent.toISOString() + "'";
				//				statement2 = null;
				//				resultSet2 = null;
				//				image = null;
				//				try {
				//					statement2 = connection.prepareStatement(query2);
				//					resultSet2 = statement2.executeQuery();
				//					if (resultSet2.next()) {
				//						image = resultSet2.getBlob(1);
				//					}
				//				} catch (err) {
				//					statement2 = null;
				//				} finally {
				//					if (resultSet2) {
				//						resultSet2.close();
				//					}
				//					if (statement2) {
				//						statement2.close();
				//					}
				//				}
				this.processClassification(image, accessToken, mostRecent, appKey);
				try {
					connection2 = $.db.getConnection();
					statusUpdate = "UPDATE \"AnalysisRequest\" SET \"status\" = 'P' WHERE \"appKey\" = '" + appKey +
						"' AND \"imageType\" = 'P' AND \"timestamp\" = '" + mostRecent.toISOString() + "'";
					updateStatement = connection2.prepareStatement(statusUpdate);
					updateResult = updateStatement.executeQuery();
					connection2.commit();
				} catch (err) {
					connection2 = null;
				} finally {
					if (updateResult) {
						updateResult.close();
					}
					if (updateStatement) {
						updateStatement.close();
					}
					if (connection2) {
						connection2.close();
					}

				}
			}
		} catch (err) {
			image = null;
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
		this.releaseLock('CLASSIF');
	}
}

function processClassification(image, accessToken, mostRecent, appKey) {
	var dest = $.net.http.readDestination("MTShelf_AnalyzeClassificationImages");
	var client = new $.net.http.Client();
	var req = new $.net.http.Request($.net.http.POST, "");
	//var WebEntityRequest = $.require('@sap/xsjs/lib/xsjs/web/WebEntityRequest');
	//var entity = new WebEntityRequest();
	var boundary = "nVenJ7H4puv";
	req.headers.set("Authorization", "Bearer " + accessToken);
	req.contentType = "multipart/form-data; boundary=" + boundary;
	var body = "--" + boundary + 
	         "\r\nContent-Disposition: form-data; name=\"files\"; filename=\"classification.jpg\"" +
	        "\r\nContent-type: image/jpeg" +
//	        "\r\nContent-Transfer-Encoding: binary\r\n" +
//            "\r\n" + image.toString('utf8');
            "\r\nContent-Transfer-Encoding: base64\r\n\r\n" +
             $.util.codec.encodeBase64(image);
	body += "\r\n--" + boundary + "--\r\n";
	req.setBody(body);
	client.request(req, dest);
	var response = client.getResponse();
	var results = null;
	if (response.body) {
		results = JSON.parse(response.body.asString().replace(/\n/g, ''));
		var length = results.predictions[0].results.length;
		var conn = null;
		var i = null;
		var pstmt = null;
		for (i = 0; i < length; i++) {
			try {
				conn = $.db.getConnection();
				pstmt = conn
					.prepareStatement(
						'INSERT INTO "AnalysisResults"("appKey", "timestamp", "imageType", "upc", "match", "xMin", "yMin", "xMax", "yMax") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
					);
				pstmt.setString(1, appKey);
				pstmt.setTimestamp(2, mostRecent);
				pstmt.setString(3, 'P');
				pstmt.setString(4, results.predictions[0].results[i].label);
				pstmt.setFloat(5, results.predictions[0].results[i].score);
				pstmt.setFloat(6, 0.0);
				pstmt.setFloat(7, 0.0);
				pstmt.setFloat(8, 0.0);
				pstmt.setFloat(9, 0.0);
				pstmt.execute();
			} catch (err) {
				pstmt = null;
				conn = null;
			} finally {
				if (pstmt) {
					pstmt.close();
				}
				if (conn) {
					conn.commit();
					conn.close();
				}
			}
		}
	}
}

function getLock(scenario) {
	var lockSuccessful = false;
	var connection = $.db.getConnection();
	// Get Current Timestamp
	var time_query = "SELECT CURRENT_TIMESTAMP FROM DUMMY";
	var statement = null;
	var resultSet = null;
	var time = null;
	try {
		statement = connection.prepareStatement(time_query);
		resultSet = statement.executeQuery();
		if (resultSet.next()) {
			time = resultSet.getString(1);
		}
	} catch (err) {
		time = null;
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
	// Attempt to create lock
	var conn = $.db.getConnection();
	var pstmt = null;
	try {
		pstmt = conn.prepareStatement('INSERT INTO "Locks"("scenario", "time") VALUES (?, ?)');
		pstmt.setString(1, scenario); // Set the scenario
		pstmt.setTimestamp(2, time);
		pstmt.execute();
		pstmt.close();
		conn.commit();
		conn.close();
		lockSuccessful = true;
	} catch (err) {
		lockSuccessful = false;
		if (pstmt !== null) {
			pstmt.close();
		}
		if (conn !== null) {
			conn.close();
		}
	}
	return lockSuccessful;
}