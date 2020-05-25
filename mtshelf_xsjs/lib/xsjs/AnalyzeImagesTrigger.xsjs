var analyzeImages = $.import("xsjs", "AnalyzeImages");
var appKey = $.request.parameters.get('appKey');
function doGet() {   
	try{
		// Strip quotes off
		var input = {
				'appKey': appKey.replace(/'/g,'')
		};
		analyzeImages.processClassifications(input);
		$.response.returnCode = 200;
		$.response.contentType = "text/plain";
		$.response.setBody("Successfully processed images");
	}
	catch(err){
		$.response.contentType = "text/plain";
		$.response.setBody("Error while executing query: [" + err.message + "]");
		$.response.returnCode = 200;
	}
}
doGet();