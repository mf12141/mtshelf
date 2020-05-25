/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"sap/challenge/mtshelf/mtshelf_associate/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});