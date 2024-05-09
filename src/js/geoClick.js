var $ = require("./lib/qsa")

var {
  getName,
  tempRange,
  tempDiff,
  getTooltip
} = require("./helpers/textUtils")

var {
  makePoint,
  getZone
} = require("./helpers/mapHelpers");

var {temp2zone} = require("./helpers/temperatureUtils");

// var {setupChart} = require("./chart");

// Start functions to export
function updateLocation(place,target,selectedLocation,map,slide) {

  // update master data
  selectedLocation.coords = [place.lng,place.lat];
  selectedLocation.placeName = place.name;
  selectedLocation.placeState = place.state;
  selectedLocation.type = 'custom'

  // update url params
  const urlParams = new URLSearchParams(window.location.search);

  urlParams.set('name', place.name);
  urlParams.set('state', place.state);
  urlParams.set('lng', place.lng);
  urlParams.set('lat', place.lat);
  

  // Update URL without refreshing
  const newUrl = window.location.pathname + '?' + urlParams.toString();
  window.history.pushState({ path: newUrl }, '', newUrl);

  return geoClick(selectedLocation,target,map,slide);
}


var geoClick = function(selectedLocation,target,map,slide) {
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
    
    // update the DOM

    if (selectedLocation.placeState) {
      if (selectedLocation.placeState != "AK" && selectedLocation.placeState != "HI") {
        // only update dom immidately if item is in view
        updateDom(selectedLocation,map,nextSlide)      
      } else {
        $("div.mod div").forEach(d=>d.classList.remove("active"))  
      }
    }  

    nextSlide.scrollIntoView({ block:"center",behavior: "smooth" })
    var rotatorFlying = true;

    map.on('moveend', function(e){
      if (rotatorFlying) {
        updateDom(selectedLocation,map,nextSlide)    
        rotatorFlying = false  
      }    
    }); 
  }, 100);

  // change flyto behavior to disable now that you've clicked? 
}

async function updateDom(selectedLocation,map,slide) {
  // Get data under a lat/lon
  var point = map.project(selectedLocation.coords);
  // get marker and use to get data
  const features = map.queryRenderedFeatures(point);

  var newZoneData = features.filter(d => {
    return d.source == "usda_zones";
  });  

  // if it doesn't exist get it
  if (selectedLocation.zonesData == undefined || selectedLocation.zonesData.length == 0) {
    selectedLocation.zonesData = newZoneData;
  } else if (
      selectedLocation.zonesData.filter(d=>d.sourceLayer=="2012_zones").length == 0 &&
      newZoneData.filter(d=>d.sourceLayer=="2012_zones").length > 0
    ) {

    // if missing one, add it
    selectedLocation.zonesData.push(newZoneData.filter(d=>d.sourceLayer=="2012_zones")[0])
  } else if (
    selectedLocation.zonesData.filter(d=>d.sourceLayer=="2023_zones").length == 0 &&
    newZoneData.filter(d=>d.sourceLayer=="2023_zones").length > 0
    ) {
    // if missing one, add it
    selectedLocation.zonesData.push(newZoneData.filter(d=>d.sourceLayer=="2023_zones")[0])
  }
  
  if (selectedLocation.tempDiffData == undefined || selectedLocation.tempDiffData.length == 0) {
    selectedLocation.tempDiffData = features.filter(d => {
      return d.source == "temp_diff";
    });  
  }
    
  // console.log(selectedLocation)
  try {
    selectedLocation.zoneInfo = getZone(selectedLocation.zonesData)  
  } catch(err) {
    console.log(err)
  }
    
  // Only update the slide in interest. 
  var changeItems = [
    {
      'id':'yourPlace',
      'formula':function(s) {
        return {
          'value':(s.placeName ? getName(s) : "your area"),
          'classes': 'placeText'
        }
      }      
    },
    {
      'id':'yourPlaceShort',
      'formula':function(s) {
        return {
          'value':(s.placeName ? s.placeName : "your area"),
          'classes': ''
        }
      }      
    },
    {
      'id':'yourPlaceShortPoss',
      'formula':function(s) {
        return {
          'value':(!s.placeName.endsWith('s') ? `${s.placeName}’s` : `${s.placeName}’`),
          'classes': ''
        }
      }      
    },
    {
      'id':'chartPlace',
      'formula':function(s) {
        return {
          'value':chartPlace(s),
          'classes': 'placeText'
        }
      }      
    },
    {
      'id':'chartPlaceShort',
      'formula':function(s) {
        var o = chartPlace(s);
        var lastIndex = o.lastIndexOf(',');
        if (lastIndex !== -1) {
            o = o.substring(0, lastIndex);
        }
        return {
          'value':o,
          'classes': 'placeText'
        }
      }      
    },
    {
      'id':'oldZone',
      'formula':function(s) {
        return {
          'value':s.zoneInfo.z2012,
          'classes':`z${s.zoneInfo.z2012} zoneText` 
        }
      }      
    },
    {
      'id':'newZone',
      'formula':function(s) {
        return {
          'value':s.zoneInfo.z2023,
          'classes':`z${s.zoneInfo.z2023} zoneText` 
        }
      }      
    },
    {
      'id':'chartNewZone',
      'formula':function(s) {
        return {
          'value':(s.placeState != "AK" && s.placeState != "HI") ? s.zoneInfo.z2023 : temp2zone(Math.floor(s.temperatures.avg/5)*5),
          'classes':`z${(s.placeState != "AK" && s.placeState != "HI") ? s.zoneInfo.z2023 : temp2zone(Math.floor(s.temperatures.avg/5)*5)} zoneText` 
        }
      }      
    },
    {
      'id':'tempRange-2012',
      'formula':function(s) {
        return {
          'value':tempRange(s.zoneInfo.t2012),
          'classes':`z${s.zoneInfo.z2012} zoneText`
        }
      }      
    },
    {
      'id':'tempRange-2023',
      'formula':function(s) {
        return {
          'value':tempRange(s.zoneInfo.t2023),
          'classes':`z${s.zoneInfo.z2023} zoneText`
        }
      }      
    },
    {
      'id':'tempDiff',
      'formula':function(s) {
        return {
          'value':tempDiff(s),
          'classes':''
        }
      }      
    },
    {
      'id':'avg',
      'formula':function(s) {
        return {
          'value':`${Math.round(s.temperatures.avg)}ºF`,
          'classes':''
        }
      }      
    },
    {
      'id':'wrongZone',
      'formula':function(s) {
        return {
          'value':temp2zone(Math.floor(s.temperatures.avg/5)*5),
          'classes':''
        }
      }      
    }
  ];

  var modsToUpdate = $(`#${slide.id} .mod span[data-item]`)
  
  // console.log(slide.id)
  // console.log(modsToUpdate)
  modsToUpdate.forEach(mod => {   
    var changeSet = changeItems.filter(d=> d.id == mod.dataset.item)[0].formula(selectedLocation);
    mod.innerHTML = changeSet.value;
    if (changeSet.value.includes("Loading")) {
      changeSet.classes += " loading"
    }
    mod.className = changeSet.classes;    
  })

  var {
    zoneInfo,
    temperatures
  } = selectedLocation;

  // pick which of the three to show
  if (selectedLocation.type == "default") {
    // if default, show any default    
    // pre-define default location as active     
    $("div.mod div.default").forEach(d=>d.classList.add("active"))
  } else {
    $("div.mod div.default").forEach(d=>d.classList.remove("active"))
  }

  // if is same, hide...right now this will only work for the one place where this is likely (2023 slide)
  if (zoneInfo.zDiff != 0) {
    $('.isSame').forEach(d=>d.classList.remove('show'))
    $('.notSame').forEach(d=>d.classList.add('show'))
  } else {
    $('.notSame').forEach(d=>d.classList.remove('show'))
    $('.isSame').forEach(d=>d.classList.add('show'))
  }

  if (temperatures) {
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
  }
  // get all items that need to be updated for tooltip

  // $.one(".info-inner").innerHTML = getTooltip(selectedLocation)  
}

function clickButton(csvData) {
  // Check if csvData is defined and not empty
  if (csvData && csvData.length > 0) {
    // Display or process the CSV data
  } else {
    console.error('CSV data is not available.');
  }
}

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

module.exports = {
  updateLocation,  
  clickButton,
  updateDom
}
