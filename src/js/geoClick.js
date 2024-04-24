var $ = require("./lib/qsa")

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

function locateMeClick(target,selectedLocation,map) {

  // get lat long
  getUserLocation().then(userLocation => {
    // Do something with userLocation   
    selectedLocation.coords = [userLocation.longitude,userLocation.latitude];
    selectedLocation.type = "findMe"
    selectedLocation.placeName = null;
    selectedLocation.placeState = null;
      
    // restore "locate me text"
    setTimeout(() => $.one(".locator-text").classList.add("active"), 2000);
    setTimeout(() => $.one(".locateMe .lds-ellipsis").classList.remove("active"), 2000);
    return geoClick(selectedLocation,target,map);    
  });

}

async function rotateClick(evt,selectedLocation,map) {
  // get random place
  var randomLngLat = [
    -85.04 + (Math.random() - 0.5) * 10,
    39 + (Math.random() - 0.4) * 10
  ]

  // Get place name from coords?

  // update master data
  selectedLocation.coords = randomLngLat;
  
  var rotatorFlying = true;
  map.flyTo({
    center: randomLngLat,
    speed:0.7,
    essential: true 
  })



  map.on('moveend', function(e){
    if (rotatorFlying) {
      updateDom(selectedLocation,map)    
      rotatorFlying = false  
    }    
  }); 
}

function updateLocation(place,target,selectedLocation,map) {

  // update master data
  selectedLocation.coords = [place.lng,place.lat];
  selectedLocation.placeName = place.name;
  selectedLocation.placeState = place.state;
  selectedLocation.type = 'custom'

  return geoClick(selectedLocation,target,map);
}


var geoClick = function(selectedLocation,target,map) {
  target.dataset.clicked = true;

  // Set the next slide's dataset to the new place
  var nextSlide = target.nextElementSibling;
  nextSlide.dataset.center = JSON.stringify(selectedLocation.coords);

  // Change the zoom level
  nextSlide.dataset.zoom = 8.5; 

  // deactivate the buttons?
  // var qBtns = target.querySelectorAll("button");
  // qBtns.forEach(function(btn) {
  //   btn.removeEventListener("click", onQuizButtonClicked);
  //   btn.disabled = true;
  // });

  // track click to GA????
  // track("quiz", target.id, this.dataset.status == "true" ? 1 : 0);

  // smoothscroll to the next slide AND flyto (this happens in the mapView)
  var nextSlide = document.getElementById(target.nextElementSibling.id);
  setTimeout(() => {
    nextSlide.scrollIntoView({ behavior: "smooth" })
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
  // Get data under a lat/lon
  var point = map.project(selectedLocation.coords);
  // get marker and use to get data
  const features = map.queryRenderedFeatures(point);

  selectedLocation.zonesData = features.filter(d => {
    return d.source == "usda_zones";
  });

  selectedLocation.tempDiffData = features.filter(d => {
    return d.source == "temp_diff";
  });

  console.log("p000000000")
  console.log(selectedLocation)

  try {
    selectedLocation.zoneInfo = getZone(selectedLocation.zonesData)  
  } catch(err) {
    console.log(err)
  }
  
  
  if (selectedLocation.placeState != "AK" && selectedLocation.placeState != "HI") {
    selectedLocation.temperatures = await getTemps({
      "lng":selectedLocation.coords[0],
      "lat":selectedLocation.coords[1]
    });    
  }
  

  var {
    zoneInfo,
    temperatures
  } = selectedLocation;

  setupChart(selectedLocation);

  // change all data items, if possible
  var changeItems = [
    {
      'id':'yourPlace',
      'formula':(selectedLocation.placeName ? getName(selectedLocation) : "your area"),
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
      'formula':`${Math.round(temperatures.avg*10)/10}ºF`,
      'classes':''
    }
  ]

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

  // // $("div.mod div").forEach(d=>d.classList.remove("active"))
  // if (textType) {}
  // $(`div.mod div.${textType}`).forEach(d=>d.classList.add("active"))

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
  locateMeClick,
  rotateClick,
  clickButton,
  updateDom
}
