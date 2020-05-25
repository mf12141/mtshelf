var express = require('express');
var passport = require('passport');
var xsenv = require('@sap/xsenv');
var JWTStrategy = require('@sap/xssec').JWTStrategy;
var cfenv = require("cfenv");
var request = require("request-promise");
var FormData = require("form-data");

var app = express();

var uaa_service = cfenv.getAppEnv().getService(/uaa.*mtshelf/);
var dest_service = cfenv.getAppEnv().getService(/dest.*mtshelf/);
var sUaaCredentials = dest_service.credentials.clientid + ':' + dest_service.credentials.clientsecret;

var sDestinationName = "OAuth";
var sEndpoint = "/oauth/token?grant_type=client_credentials";

var post_options = {
	url: uaa_service.credentials.url + "/oauth/token",
	method: 'POST',
	headers: {
		'Authorization': 'Basic ' + Buffer.from(sUaaCredentials).toString("base64"),
		'Content-type': 'application/x-www-form-urlencoded'
	},
	form: {
		'client_id': dest_service.credentials.clientid,
		'grant_type': 'client_credentials'
	}
};

passport.use(new JWTStrategy(xsenv.getServices({
	uaa: {
		tag: 'xsuaa'
	}
}).uaa));
app.use(passport.initialize());
app.use(passport.authenticate('JWT', {
	session: false
}));

app.get('/mtshelf_node/getUserInfo', function (req, res, next) {
	if (!req.user) {
		res.statusCode = 403;
		res.end(`Missing JWT Token`);
	} else {
		res.statusCode = 200;
		res.end(JSON.stringify(req.user));
	}
});

app.get("/mtshelf_node/getAccessToken", function (req, res, next) {

	let finalResponse = "This is my initial value...";

	let accessTokenPromise = new Promise(function (resolve, reject) {

		request(post_options, (err1, res1, data1) => {

			if (res1.statusCode === 200) {

				finalResponse = "Modified 1: Request a JWT token to access the destination service";
				console.log(finalResponse);

				var token = JSON.parse(data1).access_token;
				console.log("JWT Token is " + token);

				var get_options = {
					url: dest_service.credentials.uri + '/destination-configuration/v1/destinations/' + sDestinationName,
					headers: {
						'Authorization': 'Bearer ' + token
					}
				};

				request(get_options, (err2, res2, data2) => {

					finalResponse = "Modified 2:  Search your destination in the destination service";
					console.log(finalResponse);

					var oDestination = JSON.parse(data2);
					var token = oDestination.authTokens[0];

					console.log("Search destination is " + oDestination.destinationConfiguration.URL + sEndpoint);

					var options = {
						method: 'GET',
						url: oDestination.destinationConfiguration.URL + sEndpoint,
						headers: {
							'Authorization': `${token.type} ${token.value}`
						}
					};
					console.log("URL is " + oDestination.destinationConfiguration.URL + sEndpoint);
					request(options, (err3, res3, data3) => {

						finalResponse = "Modified 3: Access the destination securely";
						console.log(finalResponse);

						res.end(data3.toString());
						resolve();

					});

				});

			} else {
				reject();
			}
		});
	});
	return accessTokenPromise;
});

app.get('/mtshelf_node', (req, res) => {
	res.send('Hello from App Engine!');
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});