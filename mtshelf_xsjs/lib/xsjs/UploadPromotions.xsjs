try {
	var conn = $.hdb.getConnection();
	var query = 'DELETE FROM "Promotions" WHERE "promotion" > \'0\'';
	var resultSet = conn.executeUpdate(query);
	conn.commit();
	query = 'INSERT INTO "Promotions"("promotion","status","discount","upc","image","description","promotionalDesc") VALUES (?, ?, ?, ?, ?, ?, ?)'
	$.response.contentType = "text/html";
	if ($.request.entities.length > 0) {
		var csvFile = $.request.entities[0].body.asString();
		var records = csvFile.split(/\r?\n/);
		for (i=0; i<records.length; i++){
			if (i>0) {
				var fields= records[i].split(",");
				conn.executeUpdate(query,fields[0],fields[1],fields[2],fields[3],fields[4],fields[5],fields[6]);
			}
		}
		conn.commit();
		$.response.setBody("[200]:Upload of Promotions was successful!");
	} else {
		$.response.setBody("No Entries in request");
	}
} catch (err) {
	$.response.contentType = "text/html";
	$.response
		.setBody("File could not be saved in the database.  Here is the error:" + err.message + " ");
}