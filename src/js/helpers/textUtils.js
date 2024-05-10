var $ = require("../lib/qsa")

var {temp2zone,zone2temp} = require("./temperatureUtils");

var USPS_TO_AP_STATE = {
	'AL': 'Ala.',
	'AK': 'Alaska',
	'AR': 'Ark.',
	'AZ': 'Ariz.',
	'CA': 'Calif.',
	'CO': 'Colo.',
	'CT': 'Conn.',
	'DC': 'D.C.',
	'DE': 'Del.',
	'FL': 'Fla.',
	'GA': 'Ga.',
	'HI': 'Hawaii',
	'IA': 'Iowa',
	'ID': 'Idaho',
	'IL': 'Ill.',
	'IN': 'Ind.',
	'KS': 'Kan.',
	'KY': 'Ky.',
	'LA': 'La.',
	'MA': 'Mass.',
	'MD': 'Md.',
	'ME': 'Maine',
	'MI': 'Mich.',
	'MN': 'Minn.',
	'MO': 'Mo.',
	'MS': 'Miss.',
	'MT': 'Mont.',
	'NC': 'N.C.',
	'ND': 'N.D.',
	'NE': 'Neb.',
	'NH': 'N.H.',
	'NJ': 'N.J.',
	'NM': 'N.M.',
	'NV': 'Nev.',
	'NY': 'N.Y.',
	'OH': 'Ohio',
	'OK': 'Okla.',
	'OR': 'Ore.',
	'PA': 'Pa.',
    'PR': 'P.R.',
	'RI': 'R.I.',
	'SC': 'S.C.',
	'SD': 'S.D.',
	'TN': 'Tenn.',
	'TX': 'Texas',
	'UT': 'Utah',
	'VA': 'Va.',
	'VT': 'Vt.',
	'WA': 'Wash.',
	'WI': 'Wis.',
	'WV': 'W.Va.',
	'WY': 'Wyo.'
}

function ap_state(usps) {
	return USPS_TO_AP_STATE[usps]
}

function getName(data) {
	return `${data.placeName}, ${ap_state(data.placeState)}`
}

function tempRange(min) {
	let minText;
	if (min == "Loading") {
		minText = `Loading`
	} else if (min == 65) {
    minText = "above 65"  
  } else if (min == -60) {
    minText = 'lower than -55'
  } else {
    minText = `between ${min} and ${min+5}`
  }
  return minText
}

function getLegendPointer(selectedLocation) {

	var {
		zoneInfo,
		temperatures
	}	= selectedLocation;	

	$('.zone-after').forEach(d => {
		d.classList.remove("warmest");
		d.classList.remove("coldest");
		d.innerHTML = ""
	});

	if (zoneInfo.z2012 != zoneInfo.z2023) {
		$.one(`#sticky-legend .zone.z${zoneInfo.z2012} .zone-after`).innerHTML = `<span>Old zone</span>`;
		$.one(`#sticky-legend .zone.z${zoneInfo.z2023} .zone-after`).innerHTML = `<span>New zone</span>`;	
	} else {
		$.one(`#sticky-legend .zone.z${zoneInfo.z2012} .zone-after`).innerHTML = `<span>New and old zone</span>`;
	}

	if (temperatures) {
		var min = Math.min(...temperatures.data);
		var max = Math.max(...temperatures.data);
		var reversedTemps = JSON.parse(JSON.stringify(temperatures.data)).reverse();

		// only display the min if it is the same as zone or on the wrong side of zone. 
		if (
			Math.floor(min/5)*5 < zone2temp(zoneInfo.z2012) && Math.floor(min/5)*5 < zone2temp(zoneInfo.z2023)) {
			$.one(`#sticky-legend .zone.z${temp2zone(min)} .zone-after`).innerHTML = `<span>Coldest temperature: ${min}º F (${2020 - reversedTemps.indexOf(min)})</span>`;
			$.one(`#sticky-legend .zone.z${temp2zone(min)} .zone-after`).classList.add("coldest")	
		}
	}
}

function tempDiff(selectedLocation) {

	// if temp diff exists, else LOADING
	if (selectedLocation.tempDiffData.length > 0) {
		var diffAmount = selectedLocation.tempDiffData[0].properties.temp_diff;		
	} else {
		var diffAmount = "LOADING";	
	}
	
	if (diffAmount === "LOADING") {		
		return `<span class="loading">Loading</span>`			
	}
	else if (diffAmount === 0) {
		console.log("EXACTLY 0!")
		return "0º F warmer"
	} else {
		var upDown = diffAmount > 0 ? "warmer" : "cooler";	

		var tDiff = `tDiff${Math.round(diffAmount)}`;	

		return `<span class="zoneText ${upDown} ${tDiff}">${Math.abs(diffAmount)}º F ${upDown}</span>`
	}	
}
function loadingTextUtil(mods) {
	  mods.forEach(d => {
	    d.innerHTML = "Loading"
	    d.className = "loading"
	  })	
}
  


module.exports = {
	ap_state,
	getName,
	tempRange,
	tempDiff,
	loadingTextUtil,
	getLegendPointer
}