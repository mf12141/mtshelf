var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var associates = {};
var associatesToShoppingCart = {};
var shoppers = {};

app.ws("/mtshelf_node_ws/ws/shopper", function (ws, req) {
	var message = {};
	message.type = "init";
	ws.send(JSON.stringify(message));
	ws.on('message', function (msg) {
		var finished = false;
		try {
			var oWS = JSON.parse(msg);
			if (oWS.type === 'init') {
				shoppers[oWS.user] = ws;
				finished = true;
			} else if (oWS.type === 'send') {
				finished = true;
			} else if (oWS.type === 'initShoppingCart') {
				finished = true;
			}
		} catch (err) {
			console.log(`Error message: ` + err.message);
		}
		if (!finished) {
			ws.send("Not a valid message:" + msg);
		}
	});
	ws.on('close', function () {
		// Check to make sure you don't have a connection for this anymore
		Object.keys(shoppers).forEach(function (item) {
			if (shoppers[item] === ws) {
				delete shoppers[item];
			}
		});
	});
});

app.ws("/mtshelf_node_ws/ws/associate", function (ws, req) {
	var message = {};
	message.type = "init";
	ws.send(JSON.stringify(message));
	ws.on('message', function (msg) {
		var finished = false;
		try {
			var oWS = JSON.parse(msg);
			if (oWS.type === 'init') {
				associates[oWS.user] = ws;
				finished = true;
			} else if (oWS.type === 'send') {
				finished = true;
			} else if (oWS.type === 'initShoppingCart') {
				associatesToShoppingCart[oWS.user] = oWS.shoppingCart;
				finished = true;
			} else if (oWS.type === 'dropShoppingCart') {
				delete associatesToShoppingCart[oWS.user];
				finished = true;
			} else if (oWS.type === 'initializePayment') {
				var appKey = oWS.appKey;
				// Send message to shopper for payment
				Object.keys(shoppers).forEach(function (item) {
					if (item === appKey) {
						var oWebSocket = shoppers[item];
						oWebSocket.send(JSON.stringify(oWS));
					}
				});
				finished = true;
			}
		} catch (err) {
			console.log(`Error message: ` + err.message);
		}
		if (!finished) {
			ws.send("Not a valid message:" + msg);
		}
	});
	ws.on('close', function () {
		// Check to make sure you don't have a connection for this anymore
		Object.keys(associates).forEach(function (item) {
			if (associates[item] === ws) {
				delete associates[item];
				// Remove shopping carts
				delete associatesToShoppingCart[item];
			}
		});
	});
});

app.get('/mtshelf_node_ws/sendMessageToAssociate', function (req, res, next) {
	var finished = false;
	var person = "";
	var associate = req.query.associate;
	var shoppingCart = req.query.shoppingCart;
	if (associate) {
		Object.keys(associates).forEach(function (item) {
			if (item === associate) {
				person = associate;
				var ws = associates[item];
				ws.send(req.query.message);
				finished = true;
			}
		});
	} else if (shoppingCart) {
		Object.keys(associatesToShoppingCart).forEach(function (assoc) {
			if (shoppingCart === associatesToShoppingCart[assoc]) {
				Object.keys(associates).forEach(function (item) {
					if (item === assoc) {
						person = assoc;
						var ws = associates[item];
						ws.send(req.query.message);
						finished = true;
					}
				});
			}
		});
	}
	var oRet = {};
	if (!finished) {
		res.statusCode = 400;
		oRet.errors = [];
		oRet.errors.push('{"errors":[{message":"Unable to send message"}]}');
		res.end(JSON.stringify(oRet));
	} else {
		res.statusCode = 200;
		oRet.messages = [];
		oRet.messages.push('Message sent ot Associate' + person);
		res.end(JSON.stringify(oRet));
	}
});

app.get('/mtshelf_node_ws/sendMessageToShopper', function (req, res, next) {
	var finished = false;
	var person = "";
	var shopper = req.query.shopper;
	if (shopper) {
		Object.keys(shoppers).forEach(function (item) {
			if (item === shopper) {
				person = shopper;
				var ws = shoppers[item];
				ws.send(req.query.message);
				finished = true;
			}
		});
	}
	var oRet = {};
	if (!finished) {
		res.statusCode = 400;
		oRet.errors = [];
		oRet.errors.push('Unable to send message');
		res.end(JSON.stringify(oRet));
	} else {
		res.statusCode = 200;
		oRet.messages = [];
		oRet.messages.push('Message sent to Shopper' + person);
		res.end(JSON.stringify(oRet));
	}
});

app.get('/mtshelf_node_ws/refreshShoppingCart', function (req, res, next) {
	var finished = false;
	var source = req.query.source;
	var oMessage = {};
	oMessage.type = "refreshSC";
	if (source === 'A') {
		var shopper = req.query.shopper;
		// Send message to shopper to refresh cart
		Object.keys(shoppers).forEach(function (item) {
			if (item === shopper) {
				var ws = shoppers[item];
				ws.send(JSON.stringify(oMessage));
				finished = true;
			}
		});
	} else if (source === 'S') {
		var shoppingCart = req.query.shoppingCart;
		Object.keys(associatesToShoppingCart).forEach(function (assoc) {
			if (shoppingCart === associatesToShoppingCart[assoc]) {
				Object.keys(associates).forEach(function (item) {
					if (item === assoc) {
						var ws = associates[item];
						ws.send(JSON.stringify(oMessage));
						finished = true;
					}
				});
			}
		});
	}
	var oRet = {};
	if (!finished) {
		res.statusCode = 400;
		oRet.errors = [];
		oRet.errors.push('Unable to send message');
		res.end(JSON.stringify(oRet));
	} else {
		res.statusCode = 200;
		oRet.messages = [];
		oRet.messages.push('Refresh request sent');
		res.end(JSON.stringify(oRet));
	}
});

app.get('/mtshelf_node_ws/promotionStatusNotify', function (req, res, next) {
	var oMessage = {};
	oMessage.type = "promotionStatus";
	oMessage.promotion = req.query.promotion;
	oMessage.status = req.query.status;
	// Send message to shoppers to update promotion status
	Object.keys(shoppers).forEach(function (item) {
		var ws = shoppers[item];
		ws.send(JSON.stringify(oMessage));
	});
	var oRet = {};
	oRet.messages = [];
	oRet.messages.push('Refresh request sent');
	res.statusCode = 200;
	res.end(JSON.stringify(oRet));
});

app.get('/mtshelf_node_ws/paymentFinishedNotify', function (req, res, next) {
	var oMessage = {};
	oMessage.type = "paymentFinished";
	var shoppingCart = req.query.shoppingCart;
	oMessage.shoppingCart = shoppingCart;
	// Send message to associates that shopper has finished payment
	Object.keys(associatesToShoppingCart).forEach(function (assoc) {
		if (shoppingCart === associatesToShoppingCart[assoc]) {
			Object.keys(associates).forEach(function (item) {
				if (item === assoc) {
					var ws = associates[item];
					ws.send(JSON.stringify(oMessage));
					delete associatesToShoppingCart[item];
				}
			});
		}
	});
	var oRet = {};
	oRet.messages = [];
	oRet.messages.push('Associate notified of payment');
	res.statusCode = 200;
	res.end(JSON.stringify(oRet));
});

app.get('/mtshelf_node_ws', (req, res) => {
	res.send('Hello from Web Socket Engine!');
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});