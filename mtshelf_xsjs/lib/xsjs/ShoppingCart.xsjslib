// Get Current Timestamp
var time_query = "SELECT CURRENT_TIMESTAMP FROM DUMMY";
var CSRFToken = "";
var resultSet = null;
var connection = $.hdb.getConnection();
var time = null;
var results = {};
try {
	resultSet = connection.executeQuery(time_query);
	if (resultSet[0] && resultSet[0].CURRENT_TIMESTAMP) {
		time = resultSet[0].CURRENT_TIMESTAMP;
	}
} catch (err) {
	$.trace.debug("Error getting timestamp " + err.toString());
}

function getCSRFToken(dest, client) {
	var req = new $.web.WebRequest(
		$.net.http.GET,
		"/v1/xsrf-token"
	);
	req.headers.set("x-csrf-token", "fetch");
	client.request(req, dest);
	var response = client.getResponse();
	if (response.status === 200) {} else {
		//handleErrors(response);
	}
	return response;
}

function getShoppingCartTax(shoppingCart) {
	var oTotalTax = {};
	var shoppingCartFull = this.getShoppingCart(shoppingCart);
	var body = [];
	var itemAmounts = [];
	for (var i = 0; i < shoppingCartFull.items.length; i++) {
		var record = {};
		record.__type__ = "TAX_STRUCTURE_IN";
		if (shoppingCartFull.items[i].price > 0.0) {
			record.Category = this.extractCategory(this.getStorageInfo(shoppingCartFull.items[i].upc).category);
			body.push(record);
			var amount = shoppingCartFull.items[i].quantity * shoppingCartFull.items[i].price;
			itemAmounts.push(amount);
		} else {
			record.Category = "Tax Plug";
			body.push(record);
			itemAmounts.push(shoppingCartFull.items[i].price);
		}
	}
	var dest = $.net.http.readDestination("ShoppAR_BPMRules");
	var client = new $.net.http.Client();
	var response = this.getCSRFToken(dest, client);
	var CSRF = response.headers.get("x-csrf-token");
	req = new $.web.WebRequest($.net.http.POST, "/v1/rule-services/java/ShopparTax/GetTax");
	req.headers.set("x-csrf-token", CSRF);
	req.headers.set("Content-Type", "application/json");
	for (var j = 0; j < response.cookies.length; j++) {
		req.cookies.set(response.cookies[j].name, response.cookies[j].value);
	}
	req.setBody(JSON.stringify(body));
	client.request(req, dest);
	response = client.getResponse();
	var totalTaxAmount = 0.0;
	if (response.body) {
		body = JSON.parse(response.body.asString());
		for (var j = 0; j < body.length; j++) {
			var oData = body[j];
			var taxAmount = oData.Rate * itemAmounts[j];
			totalTaxAmount += taxAmount;
		}
	}
	return Math.round(totalTaxAmount * 100) / 100;
}

function getUPCData(upc, appKey, shoppingCart, action, source) {
	var UPCdata = this.getUPCCache(upc);
	if (!UPCdata) {
		UPCdata = {};
		UPCdata.item = {};
		UPCdata.item.upc = upc;
		var dest = $.net.http.readDestination("ShoppAR_APIManagement");
		var client = new $.net.http.Client();
		var req = new $.net.http.Request($.net.http.GET, "/items");
		req.contentType = "application/json";
		req.headers.set("Accept", "application/json");
		req.parameters.set("upc", upc);
		req.timeout = 5000;
		client.request(req, dest);
		var response = client.getResponse();
		if (response.body) {
			$.trace.debug("Response Body: " + response.body.asString());
			var body = response.body.asString();
			try {
				UPCdata = JSON.parse(body);
			} catch (err) {
				UPCdata = {};
				UPCdata.errors = [];
				UPCdata.errors.push("Invalid response from Walmart API");
			}
			if (UPCdata.errors) {
				// UPC not found - Add in general structure
				UPCdata = {};
				UPCdata.item = {};
				UPCdata.item.upc = upc;
				UPCdata.item.notAtWalmart = true;
			} else if (!UPCdata.item.msrp) {
				UPCdata.item.upc = upc;
				UPCdata.item.notAtWalmart = true;
			} else {
				UPCdata.item.weight = this.parseWeightInLbs(UPCdata.item.weight);
				UPCdata.item.notAtWalmart = false;
				this.updateUPCCache(UPCdata);
			}
		}
	}
	UPCdata = this.overlayUPCData(UPCdata);
	UPCdata.promotion = this.getPromotionForUPC(UPCdata.item.upc);
	if (UPCdata.promotion.promotion) {
		UPCdata.item.failed = false;
	}
	if (!UPCdata.item.failed) {
		UPCdata.inventory = this.updateStorageInfo(UPCdata.item.upc, this.extractCategory(UPCdata.item.category));
		if (action === "L") {
			// L is just a lookup
		} else {
			var shoppingCartFull = getLatestShoppingCart(appKey, shoppingCart);
			if (!appKey || appKey === "") {
				appKey = shoppingCartFull.header.appKey;
			}
			this.addUPCtoShoppingCart(appKey, shoppingCartFull, UPCdata, shoppingCart);
			this.adjustInventory(upc, true);
			shoppingCartFull = this.getLatestShoppingCart(appKey, shoppingCart);
			UPCdata.shoppingCart = shoppingCartFull;
			this.triggerSCRefresh(source, appKey, shoppingCart);
		}
	}
	return UPCdata;
}

function updateUPCCache(oUPCdata) {
	var query = 'SELECT * FROM "UPCCache" WHERE "upc" = \'' + oUPCdata.item.upc + '\'';
	var resultSet = connection.executeQuery(query);
	var sUPCdata = JSON.stringify(oUPCdata);
	if (resultSet[0] && resultSet[0].cacheObject) {
		// Must update row.
		query = 'UPDATE "UPCCache" WHERE "upc" = \'' + oUPCdata.item.upc + '\' SET "cacheObject" = \'' + sUPCdata + '\'';
		resultSet = connection.executeUpdate(query);
		connection.commit();
	} else {
		query = 'INSERT INTO "UPCCache"("upc", "cacheObject") VALUES (?,?)';
		resultSet = connection.executeUpdate(query, oUPCdata.item.upc, sUPCdata);
		connection.commit();
	}
}

function getUPCCache(upc) {
	var query = 'SELECT * FROM "UPCCache" WHERE "upc" = \'' + upc + '\'';
	var resultSet = connection.executeQuery(query);
	var sUPCdata = null;
	if (resultSet[0] && resultSet[0].cacheObject) {
		sUPCdata = JSON.parse(resultSet[0].cacheObject);
	}
	return sUPCdata;
}

function getPromotions() {
	var query = 'SELECT * FROM "Promotions"';
	var promotionData = {};
	var resultSet = connection.executeQuery(query);
	if (resultSet && resultSet.length > 0) {
		promotionData.promotions = resultSet;
	}
	return promotionData;
}

function getPromotionData(promotion) {
	var query = 'SELECT * FROM "Promotions" WHERE "promotion" = \'' + promotion + '\'';
	var promotionData = {};
	var resultSet = connection.executeQuery(query);
	if (resultSet[0] && resultSet[0].discount) {
		promotionData = resultSet[0];
	}
	return promotionData;
}

function updatePromotionStatus(promotion, status) {
	var update = 'UPDATE "Promotions" SET "status" = \'' + status + '\' WHERE "promotion" = \'' + promotion + '\'';
	var resultSet2 = connection.executeUpdate(update);
	connection.commit();
	// Now send out the updates
	this.triggerPromotionStatusNotify(promotion, status);
	return this.getPromotionData(promotion);
}

function getPromotionForUPC(upc) {
	var query = 'SELECT * FROM "Promotions" WHERE "upc" = \'' + upc + '\' AND "status" = \'A\'';
	var promotionData = {};
	var resultSet = connection.executeQuery(query);
	if (resultSet[0] && resultSet[0].discount) {
		promotionData = resultSet[0];
	}
	return promotionData;
}

function overlayCollectionData(UPCdata, size) {
	if (size && size !== "") {
		var query = 'SELECT * FROM "CollectionOptions" WHERE "upc" = \'' + UPCdata.item.upc + '\' AND "size" = \'' + size + '\'';
		var resultSet = connection.executeQuery(query);
		if (resultSet[0] && resultSet[0].msrp) {
			UPCdata.item.size = size;
			UPCdata.item.msrp = resultSet[0].msrp;
			UPCdata.item.weight = resultSet[0].weight;
		}
	} else {
		UPCdata.item.size = "?";
		UPCdata.item.msrp = 0.00;
		UPCdata.item.weight = 0.00;
	}
	return UPCdata;
}

function updateShoppingCartStatus(appKey, shoppingCart, status) {
	var shoppingCartFull = this.getLatestShoppingCart(appKey, shoppingCart);
	if (!appKey || appKey === "") {
		appKey = shoppingCartFull.header.appKey;
	}
	var update = 'UPDATE "ShoppingCartHeader" SET "status" = \'' + status + '\'';
	var resultSet2 = connection.executeUpdate(update);
	connection.commit();
	if (status === "P") {
		//Notify associate of payment
		this.triggerPaymentFinishedNotify(appKey, shoppingCart);
	}
	return this.getLatestShoppingCart(appKey, "");
}

function overlayUPCData(UPCdata) {
	var query = 'SELECT * FROM "ProductOverride" WHERE "upc" = \'' + UPCdata.item.upc + '\'';
	var resultSet = connection.executeQuery(query);
	if (resultSet[0]) {
		// This means that override data exists
		if (resultSet[0].name && resultSet[0].name !== "") {
			UPCdata.item.name = resultSet[0].name;
		}
		if (resultSet[0].ingredient && resultSet[0].ingredient !== "") {
			UPCdata.item.ingredient = resultSet[0].ingredient;
		}
		if (resultSet[0].shortDescription && resultSet[0].shortDescription !== "") {
			UPCdata.item.shortDescription = resultSet[0].shortDescription;
		}
		if (resultSet[0].msrp && resultSet[0].msrp !== 0.00) {
			UPCdata.item.msrp = resultSet[0].msrp;
		}
		if (resultSet[0].weight && resultSet[0].weight !== 0.00) {
			UPCdata.item.weight = resultSet[0].weight;
		}
		if (resultSet[0].category && resultSet[0].category !== "") {
			UPCdata.item.category = resultSet[0].category;
		}
		if (resultSet[0].size && resultSet[0].size !== "") {
			UPCdata.item.size = resultSet[0].size;
		}
		UPCdata.item.image = "data:image/bmp;base64," + $.util.codec.encodeBase64(this.getImageData(UPCdata.item.upc));
		UPCdata.item.hasCollection = resultSet[0].hasCollection;
		if (resultSet[0].hasCollection) {
			var query2 = 'SELECT * FROM "CollectionOptions" WHERE "upc" = \'' + UPCdata.item.upc + '\'';
			var resultSet2 = connection.executeQuery(query2);
			if (resultSet2[0] && resultSet2[0].upc) {
				UPCdata.item.sizes = resultSet2;
			} else {
				UPCdata.item.sizes = [];
			}
		}
	} else {
		if (UPCdata.item.notAtWalmart) {
			UPCdata.item.failed = true;
		}
		UPCdata.item.hasCollection = false;
		UPCdata.item.sizes = [];
	}
	return UPCdata;
}

function addPromotionToShoppingCart(appKey, shoppingCart, promotionData, shoppingCartNumber) {
	// Check if product already exists
	var query = 'SELECT * FROM "ShoppingCartDetails" WHERE "header" = \'' + shoppingCart.header.autoId + '\' AND "upc" = \'' + promotionData.upc +
		'\'';
	var resultSet = connection.executeQuery(query);
	// For now, we will allow adding a coupon where you don't have the product.  Will be caught at checkout
	//if (resultSet[0] && resultSet[0].quantity) {
	// This means that you can apply the discount
	var query2 = 'SELECT * FROM "ShoppingCartDetails" WHERE "header" = \'' + shoppingCart.header.autoId + '\' AND "upc" = \'' + promotionData
		.promotion +
		'\'';
	var resultSet2 = connection.executeQuery(query2);
	if (resultSet2[0] && resultSet2[0].quantity) {
		// The discount has already been applied.
	} else {
		var insert =
			'INSERT INTO "ShoppingCartDetails"("header", "upc", "description", "ingredient", "size", "quantity", "weight", "price", "image","history.CREATEDBY","history.CREATEDAT","history.CHANGEDBY","history.CHANGEDAT") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)';
		var insertResults = connection.executeUpdate(insert, shoppingCart.header.autoId, promotionData.promotion, promotionData.description, "",
			"",
			1, 0, promotionData.discount, promotionData.image, appKey, time, appKey, time);
		connection.commit();
	}
	//} else {
	// The discount can't be applied
	//}
	this.updateCartTotals(appKey, shoppingCartNumber);
}

function addUPCtoShoppingCart(appKey, shoppingCart, UPCdata, shoppingCartNumber) {
	// Check if product already exists
	var query = 'SELECT * FROM "ShoppingCartDetails" WHERE "header" = \'' + shoppingCart.header.autoId + '\' AND "upc" = \'' + UPCdata.item.upc +
		'\'';
	var resultSet = connection.executeQuery(query);
	if (resultSet[0] && resultSet[0].quantity) {
		// This means that the product already exists just update the quantity by one.
		var newQuantity = resultSet[0].quantity + 1;
		var update = 'UPDATE "ShoppingCartDetails" SET "quantity" = \'' + newQuantity + '\' WHERE "header" = \'' + shoppingCart.header.autoId +
			'\' AND "upc" = \'' + UPCdata.item.upc + '\'';
		var resultSet2 = connection.executeUpdate(update);
		connection.commit();
	} else {
		// Full add of the UPC data
		var insert =
			'INSERT INTO "ShoppingCartDetails"("header", "upc", "description", "ingredient", "size", "quantity", "weight", "price", "image","history.CREATEDBY","history.CREATEDAT","history.CHANGEDBY","history.CHANGEDAT") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)';
		var insertResults = connection.executeUpdate(insert, shoppingCart.header.autoId, UPCdata.item.upc, UPCdata.item.name, UPCdata.item.ingredient,
			UPCdata.item.size,
			1, UPCdata.item.weight, UPCdata.item.msrp, UPCdata.item.image, appKey, time, appKey, time);
		connection.commit();
	}
	this.updateCartTotals(appKey, shoppingCartNumber);
}

function updateUPCinShoppingCart(appKey, shoppingCart, UPCdata, shoppingCartNumber) {
	// Now we need to figure out the UPC being updated
	var query = 'SELECT * FROM "CollectionOptions" WHERE "size_upc" = \'' + UPCdata.item.upc + '\'';
	var resultSet = connection.executeQuery(query);
	if (resultSet[0] && resultSet[0].upc) {
	// Now we need to delete the existing item (without details) and add full object
		query = 'DELETE FROM "ShoppingCartDetails" WHERE "header" = \'' + shoppingCart.header.autoId +
		'\' AND "upc" = \'' + resultSet[0].upc + '\'';
		resultSet = connection.executeUpdate(query);
		connection.commit();
	}
	// Full add of the UPC data
	var insert =
		'INSERT INTO "ShoppingCartDetails"("header", "upc", "description", "ingredient", "size", "quantity", "weight", "price", "image","history.CREATEDBY","history.CREATEDAT","history.CHANGEDBY","history.CHANGEDAT") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)';
	var insertResults = connection.executeUpdate(insert, shoppingCart.header.autoId, UPCdata.item.upc, UPCdata.item.name, UPCdata.item.ingredient,
		UPCdata.item.size,
		1, UPCdata.item.weight, UPCdata.item.msrp, UPCdata.item.image, appKey, time, appKey, time);
	connection.commit();
	this.updateCartTotals(appKey, shoppingCartNumber);
}

function deleteUPCfromShoppingCart(appKey, upc, shoppingCartNumber) {
	// Check if product already exists
	var query = 'DELETE FROM "ShoppingCartDetails" WHERE "header" = ' + shoppingCartNumber + ' AND "upc" = \'' + upc + '\'';
	var resultSet = connection.executeUpdate(query);
	// Also remove any promotion for that UPC
	var promotion = this.getPromotionForUPC(upc);
	if (promotion.promotion) {
		// Remove promotion
		query = 'DELETE FROM "ShoppingCartDetails" WHERE "header" = ' + shoppingCartNumber + ' AND "upc" = \'' + promotion.promotion + '\'';
		resultSet = connection.executeUpdate(query);
	}
	this.updateCartTotals(appKey, shoppingCartNumber);
	this.triggerSCRefresh('A', appKey, shoppingCartNumber);
}

function decrementUPCfromShoppingCart(appKey, upc, shoppingCartNumber) {
	// Check if product already exists
	var query = 'SELECT "quantity" FROM "ShoppingCartDetails" WHERE "header" = ' + shoppingCartNumber + ' AND "upc" = \'' + upc + '\'';
	var resultSet = connection.executeQuery(query);
	var result = {};
	if (resultSet[0] && resultSet[0].quantity > 1) {
		var quantity = resultSet[0].quantity - 1;
		query = 'UPDATE "ShoppingCartDetails" SET "quantity" = ' + quantity + ' WHERE "header" = ' + shoppingCartNumber + ' AND "upc" = \'' + upc +
			'\'';
		resultSet = connection.executeUpdate(query);
		connection.commit();
	} else {
		query = 'DELETE FROM "ShoppingCartDetails" WHERE "header" = ' + shoppingCartNumber + ' AND "upc" = \'' + upc + '\'';
		resultSet = connection.executeUpdate(query);
		connection.commit();
		// Also remove any promotion for that UPC
		var promotion = this.getPromotionForUPC(upc);
		if (promotion.promotion) {
			// Remove promotion
			query = 'DELETE FROM "ShoppingCartDetails" WHERE "header" = ' + shoppingCartNumber + ' AND "upc" = \'' + promotion.promotion + '\'';
			resultSet = connection.executeUpdate(query);
			connection.commit();
		}
	}
	this.updateCartTotals(appKey, shoppingCartNumber);
	this.triggerSCRefresh('S', appKey, shoppingCartNumber);
}

function updateCartTotals(appKey, shoppingCartNumber) {
	var shoppingCart = this.getLatestShoppingCart(appKey, shoppingCartNumber);
	var totalWeight = 0.00;
	var totalCost = 0.00;
	for (var i = 0; i < shoppingCart.items.length; i++) {
		totalWeight += shoppingCart.items[i].weight * shoppingCart.items[i].quantity;
		totalCost += shoppingCart.items[i].price * shoppingCart.items[i].quantity;
	}
	var update = 'UPDATE "ShoppingCartHeader" SET "totalWeight" = \'' + totalWeight + '\', "totalCost" = \'' + totalCost +
		'\' WHERE "autoId" = \'' + shoppingCart.header.autoId + '\'';
	var resultSet2 = connection.executeUpdate(update);
	connection.commit();
}

function parseWeightInLbs(weight) {
	var normalizedWeight = 0.0;
	if (weight && weight !== "") {
		weight = weight.trim();
		var parts = weight.split(" ");
		if (parts.length === 2) {
			if (parts[1] === "oz") {
				normalizedWeight = parts[0] / 16;
			} else if (parts[1] === "lbs" || parts[1] === "lb") {
				normalizedWeight = parts[0];
			} else if (parts[1] === "kgs" || parts[1] === "kg") {
				normalizedWeight = parts[0] * 2.20462;
			} else if (parts[1] === "g") {
				normalizedWeight = parts[0] * 2.20462 / 1000;
			}
		}
	} else {
		normalizedWeight = 0.2;
	}
	return normalizedWeight;
}

function getLatestShoppingCartNumber(appKey) {
	query = 'SELECT MAX( "timestamp" ) FROM "ShoppingCartHeader" WHERE "appKey" = \'' + appKey + '\' AND "status" = \'A\'';
	var resultSet2 = connection.executeQuery(query);
	var shoppingCartNumber = null;
	if (resultSet2[0] && resultSet2[0]['MAX(timestamp)'] !== null) {
		var timestamp = resultSet2[0]['MAX(timestamp)'];
		query = 'SELECT "autoId" FROM "ShoppingCartHeader" WHERE "appKey" = \'' + appKey + '\' AND "timestamp" = \'' +
			timestamp.toISOString() + '\' AND "status" = \'A\'';
		var resultSet = connection.executeQuery(query);
		shoppingCartNumber = resultSet[0].autoId;
	}
	return shoppingCartNumber;
}

function getLatestShoppingCart(appKey, shoppingCart) {
	var query = '';
	if (shoppingCart && shoppingCart !== "") {
		query = 'SELECT "autoId" FROM "ShoppingCartHeader" WHERE "autoId" = \'' +
			shoppingCart + '\' AND "status" = \'A\'';
	} else {
		query = 'SELECT MAX( "timestamp" ) FROM "ShoppingCartHeader" WHERE "appKey" = \'' + appKey + '\' AND "status" = \'A\'';
		var resultSet2 = connection.executeQuery(query);
		if (resultSet2[0] && resultSet2[0]['MAX(timestamp)']) {
			var timestamp = resultSet2[0]['MAX(timestamp)'];
			query = 'SELECT "autoId" FROM "ShoppingCartHeader" WHERE "appKey" = \'' + appKey + '\' AND "timestamp" = \'' +
				timestamp.toISOString() + '\' AND "status" = \'A\'';
		}
	}
	var resultSet = connection.executeQuery(query);
	var result = {};
	if (resultSet[0] && resultSet[0].autoId) {
		var headerQuery = 'SELECT * FROM "ShoppingCartHeader" WHERE "autoId" = \'' + resultSet[0].autoId + '\'';
		var headerResult = connection.executeQuery(headerQuery);
		result.header = headerResult[0];
		var itemQuery = 'SELECT * FROM "ShoppingCartDetails" WHERE "header" = \'' + resultSet[0].autoId + '\'';
		var items = connection.executeQuery(itemQuery);
		result.items = items;
		result.header.len = 0;
		for (var i = 0; i < items.length; i++) {
			result.header.len += items[i].quantity;
		}
	} else if (shoppingCart) {
		result.errors = [];
		result.errors.push("Specified Shopping Cart was not found");
	} else if (appKey && appKey !== "") {
		this.createNewShoppingCart(appKey);
		result = this.getLatestShoppingCart(appKey, "");
		if (shoppingCart) {
			result.errors = [];
			var error = {};
			error.text = 'Shopping Cart ' + shoppingCart + ' does not exist or is the wrong status.  Created new cart.';
			result.errors.push(error);
		}
	}
	return result;
}

function getShoppingCart(shoppingCart) {
	var query = '';
	var result = {};
	if (shoppingCart && shoppingCart !== "") {
		query = 'SELECT "autoId" FROM "ShoppingCartHeader" WHERE "autoId" = \'' +
			shoppingCart + '\'';
		var resultSet = connection.executeQuery(query);
		if (resultSet[0] && resultSet[0].autoId) {
			var headerQuery = 'SELECT * FROM "ShoppingCartHeader" WHERE "autoId" = \'' + resultSet[0].autoId + '\'';
			var headerResult = connection.executeQuery(headerQuery);
			result.header = headerResult[0];
			var itemQuery = 'SELECT * FROM "ShoppingCartDetails" WHERE "header" = \'' + resultSet[0].autoId + '\'';
			var items = connection.executeQuery(itemQuery);
			result.items = items;
			result.header.len = 0;
			for (var i = 0; i < items.length; i++) {
				result.header.len += items[i].quantity;
			}
		} else if (shoppingCart) {
			result.errors = [];
			result.errors.push("Specified Shopping Cart was not found");
		}
	}
	return result;
}

function createNewShoppingCart(appKey) {
	try {
		var query =
			'INSERT INTO "ShoppingCartHeader"("appKey", "timestamp", "totalCost", "totalWeight", "currency", "weightUnit", "status","history.CREATEDBY","history.CREATEDAT","history.CHANGEDBY","history.CHANGEDAT") VALUES (?,?,?,?,?,?,?,?,?,?,?)';
		var result = connection.executeUpdate(query, appKey, time, '0.00', '0.00', "USD", "Lbs.", "A", appKey, time, appKey, time);
		connection.commit();
		return this.getLatestShoppingCart(appKey, "");
	} catch (err) {
		$.trace.debug("Unable to create shopping cart " + err.toString());
	}
}

function updateStorageInfo(upc, category) {
	var storageInfo = this.getStorageInfo(upc);
	if (!storageInfo) {
		// Check if category already exists
		category = category.replace(/'/g, "");
		var query = 'SELECT * FROM "InventoryLocation" WHERE "category" = \'' + category + '\'';
		var resultSet = connection.executeQuery(query);
		query =
			'INSERT INTO "InventoryLocation"("upc", "category", "quantity", "aisle", "area") VALUES (?,?,?,?,?)';
		storageInfo = this.generateStorageLocation();
		storageInfo.upc = upc;
		storageInfo.category = category;
		if (resultSet[0] && resultSet[0].category) {
			storageInfo.aisle = resultSet[0].aisle;
			storageInfo.area = resultSet[0].area;
		}
		var result = connection.executeUpdate(query, upc, storageInfo.category, storageInfo.quantity, storageInfo.aisle, storageInfo.area);
		connection.commit();
	}
	return storageInfo;
}

function executeCycleCount(upc, quantity) {
	var query = 'UPDATE "InventoryLocation" SET "quantity" = \'' + quantity + '\' WHERE "upc" = \'' + upc + '\'';
	var result = connection.executeUpdate(query);
	connection.commit();
	var upcData = this.getUPCData(upc, "", "", "L");
	return upcData;
}

function executeRelocate(upc, aisle, area) {
	var query = 'UPDATE "InventoryLocation" SET "aisle" = \'' + aisle + '\', "area" = \'' + area + '\' WHERE "upc" = \'' + upc + '\'';
	var result = connection.executeUpdate(query);
	connection.commit();
	var upcData = this.getUPCData(upc, "", "", "L");
	return upcData;
}

function extractCategory(categoryPath) {
	var category = "";
	if (categoryPath && categoryPath !== "") {
		var segments = categoryPath.split("/");
		category = segments[segments.length - 1];
		category = category.trim();
	}
	return category;
}

function getStorageInfo(upc) {
	var query =
		'SELECT * FROM "InventoryLocation" WHERE "upc" = \'' + upc + '\'';
	var resultSet = connection.executeQuery(query);
	if (!resultSet[0] || !resultSet[0].quantity) {
		return null;
	}
	return resultSet[0];
}

function adjustInventory(upc, decrement) {
	var storageInfo = this.getStorageInfo(upc);
	if (storageInfo) {
		if (decrement) {
			if (storageInfo.quantity > 1) {
				storageInfo.quantity--;
			}
		} else {
			storageInfo.quantity++;
		}
		var query =
			'UPDATE "InventoryLocation" SET "quantity" = \'' + storageInfo.quantity + '\' WHERE "upc" = \'' + upc + '\'';
		var result = connection.executeUpdate(query);
		connection.commit();
	}
}

function getActivePromotions(body) {
	var query =
		'SELECT * FROM "Promotions" WHERE "status" = \'A\'';
	var resultSet = connection.executeQuery(query);
	var text = "There are no currently active promotions";
	for (var i = 0; i < resultSet.length; i++) {
		if (i === 0) {
			if (resultSet.length === 1) {
				text = "There is currently one active promotion for " + resultSet[i].promotionalDesc;
			} else {
				text = "There are currently " + resultSet.length + " active promotions.  They include a " +
					resultSet[i].promotionalDesc;
			}
		} else {
			text += ",  " + resultSet[i].promotionalDesc;
		}
	}
	text += ".";
	body.replies = [];
	var message = {
		type: "text",
		content: text
	};
	body.replies.push(message);
	return body;
}

function generateStorageLocation() {
	var locationInfo = {};
	var shelfArea = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
	locationInfo.area = shelfArea[Math.floor(Math.random() * shelfArea.length)]
	locationInfo.aisle = Math.floor(Math.random() * 14) + 1;
	locationInfo.quantity = Math.floor(Math.random() * 40) + 1;
	return locationInfo;
}

function chatItemSearch(requestBody) {
	var searchString = requestBody.conversation.memory.query;
	var dest = $.net.http.readDestination("ShoppAR_APIManagement");
	var client = new $.net.http.Client();
	var req = new $.net.http.Request($.net.http.GET, "/query");
	req.contentType = "application/json";
	req.headers.set("Accept", "application/json");
	req.parameters.set("query", searchString);
	client.request(req, dest);
	var response = client.getResponse();
	var queryResults = {};
	var chatResponse = requestBody;
	if (response.body) {
		$.trace.debug("Response Body: " + response.body.asString());
		var body = response.body.asString();
		queryResults = JSON.parse(body);
		if (queryResults.errors) {
			chatResponse.errors = queryResults.errors;
		} else {
			chatResponse.conversation.memory.query = searchString;
			chatResponse.conversation.memory.hits = queryResults.totalResults;
			var botReplyText = {
				type: "text",
				content: ""
			};
			if (chatResponse.conversation.memory.hits > 0) {
				chatResponse.conversation.memory.leadUPC = queryResults.items[0].upc;
				chatResponse.conversation.memory.imageUrl = queryResults.items[0].mediumImage;
				if (!chatResponse.conversation.memory.leadUPC) {
					chatResponse.conversation.memory.leadUPC = queryResults.items[0].itemId;
				}
				chatResponse.conversation.memory.inventory = this.updateStorageInfo(chatResponse.conversation.memory.leadUPC, this.extractCategory(
					queryResults.items[0].categoryPath));
				if (chatResponse.conversation.memory.hits === 1) {
					botReplyText.content = "There is " + chatResponse.conversation.memory.hits +
						" product that matches your request.  It is located in our " + chatResponse.conversation.memory.inventory.category +
						" section.  Aisle " + chatResponse.conversation.memory.inventory.aisle +
						" Shelf Area " + chatResponse.conversation.memory.inventory.area + ".";
				} else if (chatResponse.conversation.memory.hits < 11) {
					botReplyText.content = "There are " + chatResponse.conversation.memory.hits +
						" products matching your request.  They are typically located in our " + chatResponse.conversation.memory.inventory.category +
						" section.  Aisle " + chatResponse.conversation.memory.inventory.aisle +
						" Shelf Area " + chatResponse.conversation.memory.inventory.area + ".";
				} else if (chatResponse.conversation.memory.hits < 20) {
					botReplyText.content = "There are a few products matching your request.  They are typically located in our " + chatResponse.conversation
						.memory.inventory.category + " section.  Aisle " + chatResponse.conversation.memory.inventory.aisle +
						" Shelf Area " + chatResponse.conversation.memory.inventory.area;
				} else if (chatResponse.conversation.memory.hits < 50) {
					botReplyText.content = "There are quite a few products matching your request.  They are typically located in our " + chatResponse.conversation
						.memory.inventory.category + " section.  Aisle " + chatResponse.conversation.memory.inventory.aisle +
						" Shelf Area " + chatResponse.conversation.memory.inventory.area + ".";
				} else {
					botReplyText.content = "There are many products matching your request.  They are typically located in our " + chatResponse.conversation
						.memory.inventory.category + " section.  Aisle " + chatResponse.conversation.memory.inventory.aisle +
						" Shelf Area " + chatResponse.conversation.memory.inventory.area + ".";
				}
			} else {
				botReplyText.content = "Sorry, I couldn't find any products matching your request.  Please try again.";
			}
			chatResponse.replies = [];
			chatResponse.replies.push(botReplyText);
		}
	}
	return chatResponse;
}

function getSCBarcode(shoppingCart) {
	var dest = $.net.http.readDestination("ShoppAR_APIManagement");
	var client = new $.net.http.Client();
	var imageLoc = "/barcode/" + shoppingCart + ".jpg"
	var req = new $.net.http.Request($.net.http.GET, imageLoc);
	req.headers.set("Accept", "image/jpg");
	req.headers.set("Transfer-Encoding", "chunked");
	client.request(req, dest);
	var response = client.getResponse();
	var barcodeResponse = null;
	if (response.body) {
		barcodeResponse = response.body.asArrayBuffer();
	}
	return barcodeResponse;
}

function getImageData(upc) {
	var connection = $.hdb.getConnection();
	var query = 'SELECT "snapshot" FROM "StockPhotoOverride" WHERE "upc" = \'' + upc + '\'';
	var resultSet = null;
	var mostRecent = null;
	var results = {};
	var record = null;
	results.records = [];
	try {
		resultSet = connection.executeQuery(query);
		if (resultSet[0]) {
			record = resultSet[0].snapshot;
		}
	} catch (err) {
		record = "No image found for supplied UPC";
	}
	return record;
}

function triggerSCRefresh(source, shopper, shoppingCart) {
	var dest = $.net.http.readDestination("ShoppAR_WS");
	var client = new $.net.http.Client();
	var req = new $.net.http.Request($.net.http.GET, "/shoppar_node_ws/refreshShoppingCart");
	if (!shopper || shopper === "") {
		var shoppingCartFull = getLatestShoppingCart("", shoppingCart);
		shopper = shoppingCartFull.header.appKey;
	}
	req.contentType = "application/json";
	req.headers.set("Accept", "application/json");
	req.parameters.set("source", source);
	req.parameters.set("shopper", shopper);
	req.parameters.set("shoppingCart", shoppingCart.toString());
	client.request(req, dest);
	var response = client.getResponse();
	var results = {};
	if (response.body) {
		$.trace.debug("Response Body: " + response.body.asString());
		var body = response.body.asString();
		results = JSON.parse(body);
		if (results.errors) {
			response.errors = results.errors;
		}
	}
	return results;
}

function triggerPromotionStatusNotify(promotion, status) {
	var dest = $.net.http.readDestination("ShoppAR_WS");
	var client = new $.net.http.Client();
	var req = new $.net.http.Request($.net.http.GET, "/shoppar_node_ws/promotionStatusNotify");
	req.contentType = "application/json";
	req.headers.set("Accept", "application/json");
	req.parameters.set("promotion", promotion);
	req.parameters.set("status", status);
	client.request(req, dest);
	var response = client.getResponse();
	var results = {};
	if (response.body) {
		$.trace.debug("Response Body: " + response.body.asString());
		var body = response.body.asString();
		results = JSON.parse(body);
		if (results.errors) {
			response.errors = results.errors;
		}
	}
	return results;
}

function triggerPaymentFinishedNotify(appKey, shoppingCart) {
	var dest = $.net.http.readDestination("ShoppAR_WS");
	var client = new $.net.http.Client();
	var req = new $.net.http.Request($.net.http.GET, "/shoppar_node_ws/paymentFinishedNotify");
	req.contentType = "application/json";
	req.headers.set("Accept", "application/json");
	req.parameters.set("shoppingCart", shoppingCart);
	client.request(req, dest);
	var response = client.getResponse();
	var results = {};
	if (response.body) {
		$.trace.debug("Response Body: " + response.body.asString());
		var body = response.body.asString();
		results = JSON.parse(body);
		if (results.errors) {
			response.errors = results.errors;
		}
	}
	return results;
}

function sendUserEmail(to, subject, message) {
	try {
		var from = "gregory.hawkins@gmail.com";
		var mail = {};
		if (!subject) {
			mail = new $.net.Mail({
				sender: {
					address: from
				},
				to: [{
					address: to
				}],
				//subject: "Subject : "+subject+" ",
				subjectEncoding: "UTF-8",
				parts: [new $.net.Mail.Part({
					type: $.net.Mail.Part.TYPE_TEXT,
					contentType: "text/plain",
					text: message,
					encoding: "UTF-8"
				})]
			});
		} else {
			mail = new $.net.Mail({
				sender: {
					address: from
				},
				to: [{
					address: to
				}],
				subject: "Subject : " + subject + " ",
				subjectEncoding: "UTF-8",
				parts: [new $.net.Mail.Part({
					type: $.net.Mail.Part.TYPE_TEXT,
					contentType: "text/plain",
					text: message,
					encoding: "UTF-8"
				})]
			});
		}
		var returnValue = mail.send();
		var response = "MessageId = " + returnValue.messageId + ", final reply = " + returnValue.finalReply;
		return response;
	} catch (e) {
		return e.message + " ";
	}
}