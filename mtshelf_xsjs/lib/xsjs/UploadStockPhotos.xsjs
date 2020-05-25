try {
	var conn = $.hdb.getConnection();
	var query = 'INSERT INTO "StockPhotoOverride"("upc", "snapshot") VALUES (?, ?)'
	$.response.contentType = "text/html";
	if ($.request.entities.length > 0) {
		var csvFile = $.request.entities[0].body.asString();
		var records = csvFile.split(/\r?\n/);
		for (i=0; i<records.length; i++){
			if (i>0) {
				var fields= records[i].split(",");
				conn.executeUpdate(query,fields[0],$.util.codec.decodeBase64(fields[1]));
			}
		}
		conn.commit();
		$.response.setBody("[200]:Upload of override stock photos was successful!");
	} else {
		$.response.setBody("No Entries in request");
	}
} catch (err) {
	$.response.contentType = "text/html";
	$.response
		.setBody("File could not be saved in the database.  Here is the error:" + err.message + " ");
}