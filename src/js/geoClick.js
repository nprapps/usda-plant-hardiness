var $ = require("./lib/qsa")

var {
  getName,
  tempRange
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

function locateMeClick(evt,selectedLocation,map) {
  // get the parent container of this
  var target = evt.target.parentNode.parentNode.parentNode.parentNode.parentNode;

  // activate spinner
  $.one(".locator-text").classList.remove("active")
  $.one(".lds-ellipsis").classList.add("active")

  // get lat long
  getUserLocation().then(userLocation => {
    // Do something with userLocation   
    selectedLocation.coords = [userLocation.longitude,userLocation.latitude];
    selectedLocation.type = "findMe"
    selectedLocation.placeName = null;
    selectedLocation.placeState = null;
    // restore "locate me text"
    
    setTimeout(() => $.one(".locator-text").classList.add("active"), 1500);
    setTimeout(() => $.one(".lds-ellipsis").classList.remove("active"), 1500);

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

  // move pointer
  map.getSource('point').setData(makePoint(selectedLocation.coords));

  map.on('moveend', function(e){
    if (rotatorFlying) {
      updateDom(selectedLocation,map)    
      rotatorFlying = false  
    }    
  }); 
}

// function surpriseClick(evt,selectedLocation,map,surpriseMeButton,locations) {
function surpriseClick(locations,evt,selectedLocation,map,surpriseMeButton) {
  // Check if locations is defined and not empty
  if (locations && locations.length > 0) {
    // Display or process the CSV data
    // console.log(locations);
  } else {
    console.error('CSV data is not available.');
  }
  // // get the parent container of this
  var target = evt.target.parentNode.parentNode.parentNode.parentNode;

  // get random place
  var place = locations[Math.floor(Math.random()*locations.length)];

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

  // move pointer
  map.getSource('point').setData(makePoint(selectedLocation.coords));

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
    updateDom(selectedLocation,map)  
    
  }, 1100);

  // change flyto behavior to disable now that you've clicked? 
}

async function updateDom(selectedLocation,map) {
  // Get data under a lat/lon
  var point = map.project(selectedLocation.coords);
  // get marker and use to get data
  const features = map.queryRenderedFeatures(point);
  // console.log(point)
  var zonesData = features.filter(d => {
    return d.source == "usda_zones"
  })

  // console.log(zonesData)
  var zoneInfo = getZone(zonesData)
  var temperatures = await getTemps({
    "lng":selectedLocation.coords[0],
    "lat":selectedLocation.coords[1]
  });  

  // get all items that need to be updated
  $.one(".info-inner").innerHTML = `
  <b>Lng,Lat:</b> ${selectedLocation.coords}<br>
  <b>x,y:</b> ${point.x},${point.y}<br>
  <b>2012 zone:</b> ${zoneInfo.z2012}<br>
  <b>2023 zone:</b> ${zoneInfo.z2023}<br>
  <b>zone Diff:</b> ${zoneInfo.zDiff}<br>  
  <b>Temps:</b> ${formatTemperatures(JSON.stringify(temperatures.data))}<br>
    <b>avg</b>: ${Math.round(temperatures.avg*10)/10}ºF | 
    <b>countBelow</b>: ${temperatures.countBelow} | 
    <b>countAbove</b>: ${temperatures.countAbove}
  `;
  // update DOM

  // change all data items, if possible
  var changeItems = [
    {
      'id':'yourPlace',
      'formula':getName(selectedLocation),
      'classes': 'placeText'
    },
    {
      'id':'yourPlace2',
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
    }
  ]

  console.log(selectedLocation)

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
  var textType = selectedLocation.type;
  $("span.mod span").forEach(d=>d.classList.remove("active"))
  $(`span.mod .${textType}`).forEach(d=>d.classList.add("active"))

  // if is same, hide
  if (zoneInfo.zDiff != 0) {
    $('.isSame').forEach(d=>d.classList.remove('show'))
    $('.notSame').forEach(d=>d.classList.add('show'))
  } else {
    $('.notSame').forEach(d=>d.classList.remove('show'))
    $('.isSame').forEach(d=>d.classList.add('show'))
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
  surpriseClick,
  locateMeClick,
  rotateClick,
  clickButton
}
