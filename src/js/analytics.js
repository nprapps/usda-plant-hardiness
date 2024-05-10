

var DataConsent = require('./lib/data-consent');
var googleAnalyticsAlreadyInitialized = false;

var setupGoogleAnalytics = function() {
  	// Bail early if opted out of Performance and Analytics consent groups
  	if (!DataConsent.hasConsentedTo(DataConsent.PERFORMANCE_AND_ANALYTICS)) return;

	  var docHead = document.head;

	  var firstTag = docHead.getElementsByTagName("meta")[0]
	  
	  var script = document.createElement("script");

	  script.text = "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],	  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=	  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-MVD397M');"

	  docHead.insertBefore(script,firstTag);

	  var docBody = document.body;

	  var firstBodyTag = docBody.getElementsByTagName("main")[0]

	  var bodyScript = document.createElement("noscript")

	  var bodyScriptContent = document.createElement("iframe")

	  bodyScriptContent.src = "https://www.googletagmanager.com/ns.html?id=GTM-MVD397M"

	  bodyScriptContent.height = "0"
	  bodyScriptContent.width = "0"
	  bodyScriptContent.style = "display:none;visibility:hidden"

	  bodyScript.appendChild(bodyScriptContent)
	 
	  docBody.insertBefore(bodyScript,firstBodyTag);

	(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

	if (window.top !== window) { 

		ga("create", "UA-5828686-75", "auto");
		// By default Google tracks the query string, but we want to ignore it.
		var here = new URL(window.location);

		ga("set", "location", here.protocol + "//" + here.hostname + here.pathname);
		ga("set", "page", here.pathname);

		// Custom dimensions & metrics
		var parentUrl = here.searchParams.has("parentUrl") ? new URL(here.searchParams.get("parentUrl")) : "";
		var parentHostname = "";

		if (parentUrl) {
		    parentHostname = parentUrl.hostname;
		}

		var initialWidth = here.searchParams.get("initialWidth") || "";

		ga("set", {
		  dimension1: parentUrl,
		  dimension2: parentHostname,
		  dimension3: initialWidth
		});
	} else { 

		// Secondary topics
		var dim6 = "";
		// Topic IDs
		var dim2 = "";

		// Google analytics doesn't accept arrays anymore, these must be strings.

		try {
		  dim6 = window.PROJECT_ANALYTICS.secondaryTopics.join(", ");
		} catch (error) {
		  console.log("PROJECT_ANALYTICS.secondaryTopics is not an array, check project.json");
		}

		try {
		  dim2 = window.PROJECT_ANALYTICS.topicIDs.join(", ");
		} catch (error) {
		  console.log("PROJECT_ANALYTICS.topicIDs is not an array, check project.json");
		}

		ga("create", "UA-5828686-4", "auto");
		ga("set", {
		  dimension2:  dim2,
		  dimension3:  window.PROJECT_ANALYTICS.primaryTopic || "News",
		  dimension6:  dim6,
		  dimension22: document.title
		});
	} 
	ga("send", "pageview");
	googleAnalyticsAlreadyInitialized = true;
};


// Add GA initialization to window.onload
var oldOnload = window.onload;
window.onload = (typeof window.onload != 'function') ? setupGoogleAnalytics : function() { oldOnload(); setupGoogleAnalytics(); };

// Listen for DataConsentChanged event 
document.addEventListener('npr:DataConsentChanged', () => {

  // Bail early if it's already been set up 
  if (googleAnalyticsAlreadyInitialized) return;

  // When a user opts into performance and analytics cookies, initialize GA
  if (DataConsent.hasConsentedTo(DataConsent.PERFORMANCE_AND_ANALYTICS)) {
    setupGoogleAnalytics();
  }  
});