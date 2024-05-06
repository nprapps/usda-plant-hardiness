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
	if (min == 65) {
    minText = "above 65"  
  } else if (min == -60) {
    minText = 'Lower than -55'
  } else {
    minText = `between ${min} and ${min+5}`
  }
  return minText
}

function getTooltip(selectedLocation) {
	var {
		zoneInfo,
		temperatures
	}	= selectedLocation;

	if (!temperatures) {
		temperatures.data = 'No data'
	}

	return `
  <b>2012 zone:</b> ${zoneInfo.z2012}<br>
  <b>2023 zone:</b> ${zoneInfo.z2023}<br>
  <b>Half zones changed</b> ${zoneInfo.zDiff}<br>
    <b>Average low temperature (1991-2020)</b>: ${Math.round(temperatures.avg*10)/10}ºF <br>
    <b>Years with lows below zone</b>: ${temperatures.countBelow} <br>
    <b>Years with lows above zone</b>: ${temperatures.countAbove}
  `;  
}

function tempDiff(selectedLocation) {
	try	{
		var diffAmount = selectedLocation.tempDiffData[0].properties.temp_diff;		
	} catch(err) {
		console.log(err)
		var diffAmount = "ERROR";	
	}
	
	if (diffAmount === "ERROR") {
		if (selectedLocation.zoneInfo.t2012 > selectedLocation.zoneInfo.t2023) {
			return `<span class="zoneText cooler tDiff-4">cooler</span>`	
		} else {
			return `<span class="zoneText warmer tDiff4">warmer</span>`
		}
		
	}
	else if (diffAmount === 0) {
		console.log("EXACTLY 0!")
		return "0ºF warmer"
	} else {
		var upDown = diffAmount > 0 ? "warmer" : "cooler";	

		var tDiff = `tDiff${Math.round(diffAmount)}`;	

		return `<span class="zoneText ${upDown} ${tDiff}">${Math.abs(diffAmount)}ºF ${upDown}</span>`
	}	
}

module.exports = {
	ap_state,
	getName,
	tempRange,
	tempDiff,
	getTooltip
}