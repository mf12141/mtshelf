try {
	var conn = $.hdb.getConnection();
	var query = 'DELETE FROM "UPCCache" WHERE "upc" > \'0\'';
	var resultSet = conn.executeUpdate(query);
	conn.commit();
	query = 'INSERT INTO "UPCCache"("upc", "cacheObject") VALUES (?, ?)'
	$.response.contentType = "text/html";
	if ($.request.entities.length > 0) {
		var csvFile = $.request.entities[0].body.asString();
		var records = csvFile.split(/\r?\n/);
		for (i = 0; i < records.length; i++) {
			if (i > 0) {
				var fields = records[i].split(",");
				var record = {};
				record.apiVersion = "1.0";
				record.item = {};
				record.item.upc = fields[0];
				record.item.name = fields[1];
				record.item.shortDescription = fields[2];
				record.item.category = fields[3];
				record.item.msrp = fields[4];
				record.item.weight = fields[5];
				record.item.size = fields[6];
				if (fields[7].startsWith("https://")) {
					record.item.image = fields[7]
				} else {
					record.item.image = "data:image/bmp;base64," + fields[7];
				}
				if (fields[8] === "") {
					record.item.largeImage = record.item.image;
				} else {
					if (fields[7].startsWith("https://")) {
						record.item.largeImage = fields[8]
					} else {
						record.item.largeImage = "data:image/bmp;base64," + fields[8];
					}
				}
				var cacheObject = JSON.stringify(record);
				conn.executeUpdate(query, fields[0], cacheObject);
			}
		}
		conn.commit();
		$.response.setBody("[200]:Upload of UPC Cache was successful!");
	} else {
		$.response.setBody("No Entries in request");
	}
} catch (err) {
	$.response.contentType = "text/html";
	$.response
		.setBody("File could not be saved in the database.  Here is the error:" + err.message + " ");
}