var $ = require("./lib/qsa")

var {getUserLocation} = require("./mapHelpers");
var {
  getTemps,
  formatTemperatures,
  temp2zone} = require("./temperatureUtil");

export function locateMeClick(evt,selectedLocation,map) {
  // get the parent container of this
  var target = evt.target.parentNode.parentNode.parentNode.parentNode.parentNode;

  // activate spinner
  $.one(".locator-text").classList.remove("active")
  $.one(".lds-ellipsis").classList.add("active")

  // get lat long
  getUserLocation().then(userLocation => {
    // Do something with userLocation   
    selectedLocation.coords = [userLocation.longitude,userLocation.latitude];
    
    // restore "locate me text"
    
    setTimeout(() => $.one(".locator-text").classList.add("active"), 1500);
    setTimeout(() => $.one(".lds-ellipsis").classList.remove("active"), 1500);

    return geoClick(selectedLocation,target,map);    
  });

}

export function surpriseClick(evt,selectedLocation,map) {

  // get the parent container of this
  var target = evt.target.parentNode.parentNode.parentNode.parentNode;

  // get random place
  var randomLngLat = [
    -80.5 + (Math.random() - 0.5) * 10,
    40 + (Math.random() - 0.5) * 10
  ]

  // Get place name from coords?

  // update master data
  selectedLocation.coords = randomLngLat;

  return geoClick(selectedLocation,target,map);
}


var geoClick = function(selectedLocation,target,map) {
  target.dataset.clicked = true;

  // Set the next slide's dataset to the new place
  var nextSlide = target.nextElementSibling;
  nextSlide.dataset.center = JSON.stringify(selectedLocation.coords);

  // Change the zoom level
  nextSlide.dataset.zoom = 10.5;

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
  $.one("#info").innerHTML = `
  <b>Lng,Lat:</b> ${selectedLocation.coords}<br>
  <b>x,y:</b> ${point.x},${point.y}<br>
  <b>2012 zone:</b> ${zoneInfo.d2012}<br>
  <b>2023 zone:</b> ${zoneInfo.d2023}<br>
  <b>zone Diff:</b> ${zoneInfo.zDiff}<br>  
  <b>Temps:</b> ${formatTemperatures(JSON.stringify(temperatures.data))}<br>
    <b>avg</b>: ${Math.round(temperatures.avg*10)/10}ºF | 
    <b>countBelow</b>: ${temperatures.countBelow} | 
    <b>countAbove</b>: ${temperatures.countAbove}
  `;
  // update DOM
  //TKTKTKTK
}

function getZone(zonesData) {
  var temp2012 = zonesData.filter(d=>d.sourceLayer=="2012_zones")[0].properties["2012_zone"];
  var temp2023 = zonesData.filter(d=>d.sourceLayer=="2023_zones")[0].properties["2023_zone"];

  var obj = {
    "d2012":temp2zone(temp2012),
    "d2023":temp2zone(temp2023),
    "zDiff":((temp2023 - temp2012)/5)
  }
  return obj
}

