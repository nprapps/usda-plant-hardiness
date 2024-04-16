var $ = require("./lib/qsa")

var d3 = {
  ...require("d3-dsv/dist/d3-dsv.min"),
};

var csv_url = "http://stage-apps.npr.org/enlivened-latitude/assets/synced/csv/2023_GAZEETER.csv";

var {
  getUserLocation,
  makePoint,
  getZone
} = require("./helpers/mapHelpers");

var {
  getTemps,
  formatTemperatures,
  temp2zone} = require("./helpers/temperatureUtil");

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

export async function rotateClick(evt,selectedLocation,map) {
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

export function surpriseClick(evt,selectedLocation,map) {

  // get the parent container of this
  var target = evt.target.parentNode.parentNode.parentNode.parentNode;

  // get random place
  var randomLngLat = [
    -85.04 + (Math.random() - 0.4) * 10,
    39 + (Math.random() - 0.4) * 10
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
  <b>2012 zone:</b> ${zoneInfo.d2012}<br>
  <b>2023 zone:</b> ${zoneInfo.d2023}<br>
  <b>zone Diff:</b> ${zoneInfo.zDiff}<br>  
  <b>Temps:</b> ${formatTemperatures(JSON.stringify(temperatures.data))}<br>
    <b>avg</b>: ${Math.round(temperatures.avg*10)/10}ºF | 
    <b>countBelow</b>: ${temperatures.countBelow} | 
    <b>countAbove</b>: ${temperatures.countAbove}
  `;
  // update DOM
  // get all spans inside 
  var spans = $(".content p span.mod")
  console.log(spans)
  console.log(zoneInfo)

  spans.forEach(d => {
    // update 2012 zone
    if (d.classList.value.includes("oldZone")) {
      d.innerHTML = zoneInfo.d2012;
      d.className = "";

      d.classList.add(`mod`)
      d.classList.add(`t${zoneInfo.d2012}`)
      d.classList.add(`zoneText`)
      d.classList.add('oldZone')
      
    }

    // update 2023 zone
    if (d.classList.value.includes("newZone")) {

      d.innerHTML = zoneInfo.d2023;
      d.className = "";
      d.classList.add(`mod`)    
      d.classList.add(`t${zoneInfo.d2023}`)
      d.classList.add("zoneText")
      d.classList.add('newZone')
    }

    // change temp ranges
    if (d.classList.value.includes("tempRange")) {
      if (d.classList.value.includes("t2012")) {
        var min = zoneInfo.t2012;
      } else {
        var min = zoneInfo.t2023;
      }
      if (min == 65) {
        d.innerHTML = "above 65"  
      } else if (min == -60) {
        d.innerHTML = 'Lower than -55'
      } else {
        d.innerHTML = `between ${min} and ${min+5}`
      }
      
    }
  })
  //TKTKTKTK
}