var $ = require("./lib/qsa")
iii = 0;
var {
  getName,
  tempRange,
  tempDiff,
  getTooltip
} = require("./helpers/textUtils")

var {
  getUserLocation,
  makePoint,
  getZone
} = require("./helpers/mapHelpers");

var {
  getTemps,
  formatTemperatures,
  temp2zone} = require("./helpers/temperatureUtils");

var {setupChart} = require("./chart");

// Start functions to export
function updateLocation(place,target,selectedLocation,map) {

  // update master data
  selectedLocation.coords = [place.lng,place.lat];
  selectedLocation.placeName = place.name;
  selectedLocation.placeState = place.state;
  selectedLocation.type = 'custom'

  // update url params
  const urlParams = new URLSearchParams(window.location.search);

  urlParams.set('lng', place.lng);
  urlParams.set('lat', place.lat);
  urlParams.set('name', place.name);
  urlParams.set('state', place.state);

  // Update URL without refreshing
  const newUrl = window.location.pathname + '?' + urlParams.toString();
  window.history.pushState({ path: newUrl }, '', newUrl);

  return geoClick(selectedLocation,target,map);
}


var geoClick = function(selectedLocation,target,map) {
  target.dataset.clicked = true;

  // Set the next slide's dataset to the new place
  var nextSlide = target.nextElementSibling;
  nextSlide.dataset.center = JSON.stringify(selectedLocation.coords);

  // Change the zoom level
  nextSlide.dataset.zoom = 8.5; 

  // track click to GA????
  // track("quiz", target.id, this.dataset.status == "true" ? 1 : 0);

  // smoothscroll to the next slide AND flyto (this happens in the mapView)
  var nextSlide = document.getElementById(target.nextElementSibling.id);
  setTimeout(() => {
    nextSlide.scrollIntoView({ block:"center",behavior: "smooth" })
    // update the DOM

    if (selectedLocation.placeState) {
      if (selectedLocation.placeState != "AK" && selectedLocation.placeState != "HI") {
        // only update dom immidately if item is in view
        updateDom(selectedLocation,map)      
      } else {
        $("div.mod div").forEach(d=>d.classList.remove("active"))  
      }
    }  

    var rotatorFlying = true;

    map.on('moveend', function(e){
      if (rotatorFlying) {
        updateDom(selectedLocation,map)    
        rotatorFlying = false  
      }    
    }); 
  }, 100);

  // change flyto behavior to disable now that you've clicked? 
}

async function updateDom(selectedLocation,map) {
  iii++;
  console.log("-------------------")
  console.log('update dom function ' + iii)
  console.log("-------------------")


  // Get data under a lat/lon
  var point = map.project(selectedLocation.coords);
  // get marker and use to get data
  const features = map.queryRenderedFeatures(point);

  selectedLocation.zonesData = features.filter(d => {
    return d.source == "usda_zones";
  });

  console.log(features)

  selectedLocation.tempDiffData = features.filter(d => {
    return d.source == "temp_diff";
  });

  console.log(selectedLocation.tempDiffData)

  try {
    selectedLocation.zoneInfo = getZone(selectedLocation.zonesData)  
  } catch(err) {
    console.log(err)
  }
  
  var atlLocation = {};

  // get temps for chart
  if (selectedLocation.placeState != "AK" && selectedLocation.placeState != "HI") {
    selectedLocation.temperatures = await getTemps({
      "lng":selectedLocation.coords[0],
      "lat":selectedLocation.coords[1]
    });    
  } else if (selectedLocation.placeState == "AK") {
    var AKArr = [-16,-22,-14,-15,-14,-21,-11,-28,-10,2,-15,-2,-18,-8,-11,-17,-15,-24,-8,-12,-15,-12,-11,-5,-8,-15,-2,-7,-11,-3];

    selectedLocation.temperatures =  {
      "data":AKArr,
      "avg": -12.26,
      "zone": "5b",
      "countBelow": "TK",
      "countAbove": "TK",
      "placeName":"Anchorage, Alaska"
    }

    atlLocation.temperatures = selectedLocation.temperatures;

    var temp2012 = -20;
    var temp2023 = -15;

    atlLocation.zoneInfo = {
      "t2012":temp2012,
      "t2023":temp2023,
      "z2012":temp2zone(temp2012),
      "z2023":temp2zone(temp2023),
      "zDiff":((temp2023 - temp2012)/5)
    }

    selectedLocation.alt = {
      "state":"AK",
      "zoneInfo":atlLocation.zoneInfo
    }
  } else if (selectedLocation.placeState == "HI") {    
    var HIArr = [58,54,56,56,56,57,53,60,59,59,60,57,60,58,60,57,62,58,61,59,60,59,61,57,59,60,62,61,59,64];

    selectedLocation.temperatures =  {
      "data":HIArr,
      "avg": 58.7,
      "zone": "12b",
      "countBelow": "TK",
      "countAbove": "TK",
      "placeName":"Honolulu, Hawaii"
    }

    atlLocation.temperatures = selectedLocation.temperatures;

    var temp2012 = 50;
    var temp2023 = 55;

    atlLocation.zoneInfo = {
      "t2012":temp2012,
      "t2023":temp2023,
      "z2012":temp2zone(temp2012),
      "z2023":temp2zone(temp2023),
      "zDiff":((temp2023 - temp2012)/5)
    }

    selectedLocation.alt = {
      "state":"HI",
      "zoneInfo":atlLocation.zoneInfo
    }
  }
  
  var {
    zoneInfo,
    temperatures
  } = selectedLocation;

  var chartPlace = function(selectedLocation) {
    if (selectedLocation.placeName) {
      if (selectedLocation.placeState == "AK") {
        return "Anchorage, Alaska"
      } else if (selectedLocation.placeState == "HI") {
        return "Honolulu, Hawaii"
      } else {
        return getName(selectedLocation);          
      }          
    } else {
      return "your area"
    }
  };

  // change all data items, if possible
  var changeItems = [
    {
      'id':'yourPlace',
      'formula':(selectedLocation.placeName ? getName(selectedLocation) : "your area"),
      'classes': 'placeText'
    },
    {
      'id':'yourPlaceShort',
      'formula':(selectedLocation.placeName ? selectedLocation.placeName : "your area"),
      'classes': ''
    },
    {
      'id':'chartPlace',
      'formula':chartPlace(selectedLocation),
      'classes': 'placeText'
    },
    {
      'id':'oldZone',
      'formula':zoneInfo.z2012,
      'classes':`z${zoneInfo.z2012} zoneText` 
    },
    {
      'id':'newZone',
      'formula':zoneInfo.z2023,
      'classes':`z${zoneInfo.z2023} zoneText` 
    },
    {
      'id':'chartNewZone',
      'formula':(selectedLocation.placeState != "AK" && selectedLocation.placeState != "HI") ? zoneInfo.z2023 : temp2zone(Math.floor(temperatures.avg/5)*5),
      'classes':`z${(selectedLocation.placeState != "AK" && selectedLocation.placeState != "HI") ? zoneInfo.z2023 : temp2zone(Math.floor(temperatures.avg/5)*5)} zoneText` 
    },
    {
      'id':'tempRange-2012',
      'formula':tempRange(zoneInfo.t2012),
      'classes':`z${zoneInfo.z2012} zoneText`
    },
    {
      'id':'tempRange-2023',
      'formula':tempRange(zoneInfo.t2023),
      'classes':`z${zoneInfo.z2023} zoneText`
    },
    {
      'id':'tempDiff',
      'formula':tempDiff(selectedLocation),
      'classes':''
    },
    {
      'id':'avg',
      'formula':`${Math.round(temperatures.avg)}ºF`,
      'classes':''
    },
    {
      'id':'wrongZone',
      'formula':temp2zone(Math.floor(temperatures.avg/5)*5),
      'classes':''
    }
  ];

  changeItems.forEach(d=> {
    var items = $(`[data-item='${d.id}']`);        
    items.forEach(item => {
      item.innerHTML = d.formula;
      if (d.classes) {
        item.className = `${d.classes}`
      }
      ;
    })
  })
  

  // pick which of the three to show
  if (selectedLocation.type == "default") {
    // if default, show any default    
    // pre-define default location as active     
    $("div.mod div.default").forEach(d=>d.classList.add("active"))
  } else {
      $("div.mod div.default").forEach(d=>d.classList.remove("active"))
  }
  // var textType = selectedLocation.type == "default" ? "default" : "custom";

  // if avg is NOT wrong OR if it is within 1/2 degree
  // OR if it is AK or HI
  if (
    selectedLocation.placeState == "AK" || 
    selectedLocation.placeState == "HI" || 
    Math.floor(temperatures.avg/5)*5 == zoneInfo.t2023 || 
    Math.round(temperatures.avg) == zoneInfo.t2023+5 ||  
    Math.round(temperatures.avg) == zoneInfo.t2023
  ) {   
    $('.isDiff').forEach(d=>d.classList.remove('show'))
    $('.notDiff').forEach(d=>d.classList.add('show'))      
  } else {
    $('.isDiff').forEach(d=>d.classList.add('show'))
    $('.notDiff').forEach(d=>d.classList.remove('show'))
  }

  // if is same, hide...right now this will only work for the one place where this is likely (2023 slide)
  if (zoneInfo.zDiff != 0) {
    $('.isSame').forEach(d=>d.classList.remove('show'))
    $('.notSame').forEach(d=>d.classList.add('show'))
  } else {
    $('.notSame').forEach(d=>d.classList.remove('show'))
    $('.isSame').forEach(d=>d.classList.add('show'))
  }

  // get all items that need to be updated for tooltip

  $.one(".info-inner").innerHTML = getTooltip(selectedLocation)

  if (selectedLocation.placeState == "AK" || selectedLocation.placeState == "HI") {    
    setupChart(atlLocation)
  } else {
    setupChart(selectedLocation);
  }
  
}

function clickButton(csvData) {
  // Check if csvData is defined and not empty
  if (csvData && csvData.length > 0) {
    // Display or process the CSV data
  } else {
    console.error('CSV data is not available.');
  }
}

module.exports = {
  updateLocation,  
  clickButton,
  updateDom
}
