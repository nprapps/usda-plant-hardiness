var $ = require("./lib/qsa")
var debounce = require("./lib/debounce"); //ruth had in sea level rise...not sure if we need
var track = require("./lib/tracking");
require("@nprapps/autocomplete-input");
// var { isMobile } = require("./lib/breakpoints");

var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");
var pmtiles = require("pmtiles/dist");

var mapView = require("./views/mapView");
var imageView = require("./views/imageView");
var textView = require("./views/textView");
var chartView = require("./views/chartView");

require("./video");
require("./analytics");
var {setupChart} = require("./chart");

var {
      getUserLocation,
      compileLegendStyle,
      compileZoneLabelStyle,
      compileTempDiffStyle,
      makePoint,
      checkTilesLoaded
    } = require("./helpers/mapHelpers");

var {
  getTemps,
  getData,
  formatTemperatures
} = require("./helpers/temperatureUtils");

var {
  fetchCSV
} = require("./helpers/csvUtils");

var {
  updateLocation,
  locateMeClick,
  rotateClick,
  clickButton,
  updateDom
} = require("./geoClick");

var slides = $(".sequence .slide").reverse();
var autoplayWrapper = $.one(".a11y-controls");

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

var completion = 0;
var map;
let locations;
let locations_url = "http://stage-apps.npr.org/enlivened-latitude/assets/synced/csv/2023_GAZEETER.csv";


// global variable for active map layer
var activeMap = "2012_zone";

// global place variable...default to Raleigh
var selectedLocation = {
  coords:[-78.6399539,35.7915083],
  placeName: "Raleigh",
  placeState: "NC",
  type: "default",
  loadIterations: 0
};

if (false) "play canplay canplaythrough ended stalled waiting suspend".split(" ").forEach(e => {
  $("video").forEach(v => v.addEventListener(e, console.log));
});

// handle NPR One
var here = new URL(window.location.href);
var renderPlatform = here.searchParams.get("renderPlatform");
var isOne = renderPlatform && renderPlatform.match(/nprone/i);
if (isOne) {
  document.body.classList.add("nprone");
}

// Initialize map here
var onWindowLoaded = async function() {

  // Preset the second slides' data to default place

  // Set the next slide's dataset to the new place
  var zoomSlide = $.one("#zoomIn");
  zoomSlide.dataset.center = JSON.stringify(selectedLocation.coords);

  // Change the zoom level
  zoomSlide.dataset.zoom = 8.5;  

  // Load up all the 30k locations
  fetchCSV(locations_url).then(data => {
    locations = data;
    initializeLookup();    
  }).catch(error => console.error('Error fetching CSV:', error));

  // load the map
  renderMap();
}

var initializeLookup = function() {
  // append locations to searchbox
  var searchDatalist = $.one("#lookupLocations");
  locations.forEach(function(loc, i) {
    var opt = document.createElement("option");
    opt.value = i;
    var optLabel = document.createTextNode(`${ loc.name }, ${ loc.state }`);
    opt.append(optLabel);
    searchDatalist.append(opt);
  });
}

var renderMap = async function() {
  var container = "base-map";
  var element = document.querySelector(`#${container}`);
  var width = element.offsetWidth;

  // add the PMTiles plugin to the maplibregl global.
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol('pmtiles', (request) => {
      return new Promise((resolve, reject) => {
          const callback = (err, data) => {
              if (err) {
                  reject(err);
              } else {
                  resolve({data});
              }
          };
          protocol.tile(request, callback);
      });
  });
  
  const PMTILES_URL = 'http://stage-apps.npr.org/enlivened-latitude/assets/synced/pmtiles/usda_zones.pmtiles'
  const tempDiffURL =  'http://stage-apps.npr.org/enlivened-latitude/assets/synced/pmtiles/temp_diff.pmtiles'  

  const p = new pmtiles.PMTiles(PMTILES_URL);

  // this is so we share one instance across the JS code and the map renderer
  protocol.add(p);

  p.getHeader().then(h => {
    
    // optionally, get timezone if mobile, to pick which 3rd of country to show

    map = new maplibregl.Map({
      container: container,
      style: './assets/style.json',
      center: [-98.04, 39.507],
      zoom: 3.8
    });
    
    // maybe include some conditional about sprite urls, if one fails, try another

    // map.scrollZoom.disable();
    // disable map rotation using right click + drag
    // map.dragRotate.disable();
    // disable map rotation using touch rotation gesture
    // map.touchZoomRotate.disableRotation();

    // Add geolocate control to the map.
    // map.addControl(
    //   new maplibregl.GeolocateControl({
    //       positionOptions: {
    //           enableHighAccuracy: true
    //       },
    //       // trackUserLocation: true,
    //       showUserLocation:false
    //   })
    // )

    // let bbox = [[-127.958450,24.367739], [-65.545807,49.979709]];
    // map.fitBounds(bbox, {
    //   padding: {top: 10, bottom:10, left: 10, right: 10}
    // });    

    map.on('load', () => {
      map.addSource('userPoint', {
          'type': 'geojson',
          'data': makePoint([0,0])
      });

      map.addSource('usda_zones', {
        type: 'vector',
        url: `pmtiles://${PMTILES_URL}`,
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
      })

      map.addSource('temp_diff', {
        type: 'vector',
        url: `pmtiles://${tempDiffURL}`
      })

      map.addLayer({
        'id': 'userPoint',
        'type': 'circle',
        'source': 'userPoint',
        'paint': {
            'circle-radius': 8,
            'circle-color': 'transparent',
            'circle-stroke-color':'#fff',
            'circle-stroke-width':3
        }
      },"Place labels"); 

      map.addLayer({
        'id': 'temp_diff_layer',
        'source': 'temp_diff',
        'source-layer': 'temp_diffgeojsonl',
        'type': 'fill',
        'paint': {
          "fill-color": [
          'interpolate',
          ['linear'],
          ['get', 'temp_diff'],
          -10, '#3F4E6F', // Low population density (transparent)
          0, '#fff', // Medium population density (semi-transparent red)
          10, '#C73800' // High population density (semi-transparent blue)
        ],
          "fill-opacity": 0
        }      
      },
      // This line is the id of the layer this layer should be immediately below
      "Water")

      map.addLayer({
        'id': '2012_zones',
        'source': 'usda_zones',
        'source-layer': '2012_zones',
        'type': 'fill',
        'paint': {
          "fill-color": [
          "case",
          ["==", ["get", "2012_zone"], null],
          "#aaffff",compileLegendStyle("2012_zone")          
          ],
          "fill-opacity": 1
        }      
      },
      // This line is the id of the layer this layer should be immediately below
      "Water")

      map.addLayer({
        'id': '2012_zones_labels',
        'source': 'usda_zones',
        'source-layer': '2012_zones',
        'type': 'fill',
        "minzoom": 7,
        'paint': {
          "fill-color": "rgba(255, 255, 0, 1)",
          "fill-pattern": compileZoneLabelStyle("2012_zone"),
          "fill-opacity": 0.4
        }      
      },"Water") 

      map.addLayer({
        'id': '2023_zones',
        'source': 'usda_zones',
        'source-layer': '2023_zones',
        'type': 'fill',
        'paint': {
          "fill-color": [
          "case",
          ["==", ["get", "2023_zone"], null],
          "#aaffff",compileLegendStyle("2023_zone")
          ],
          "fill-opacity": 0
        }      
      },"Water")       

      map.addLayer({
        'id': '2023_zones_labels',
        'source': 'usda_zones',
        'source-layer': '2023_zones',
        'type': 'fill',
        "minzoom": 7,
        'paint': {
          "fill-color": "rgba(255, 255, 0, 1)",
          "fill-pattern": compileZoneLabelStyle("2023_zone"),
          "fill-opacity": 0
        }      
      },"Water")

      // console.log(map.getStyle().layers)
    })

    // Lots of listeners
    map.on('render', () => {
      // don't let the buttons be clicked until all things have been clicked
      var isLoaded = checkTilesLoaded(map,selectedLocation);
      if (isLoaded && selectedLocation.loadIterations == 0) {
        updateDom(selectedLocation,map)
        selectedLocation.loadIterations+=1;
      }
      
      
    });

    // disable ability to interact with buttons
    map.on('movestart', () =>{
      $.one(".geo-buttons").classList.add("disabled")
    })

    // restore ability to interact with buttons
    map.on('moveend', () => {
      $.one(".geo-buttons").classList.remove("disabled")
    });

    // what to do when you click LocateClick  
    var locatorButton = $.one(".locateMe");
    var surpriseMeButton = $.one(".surpriseMe");

    $.one("#explore-button").addEventListener('click',() => {
      $.one("#base-map").classList.toggle('explore-mode');
      $.one("#info").classList.toggle('explore-mode');

    })    

    $.one(".rotateLocation").addEventListener('click',(evt) => {      
      rotateClick(evt,selectedLocation,map)
    })    

    locatorButton.addEventListener('click',(evt) => {      

      // get the parent container of this
      var target = evt.target.parentNode.parentNode.parentNode.parentNode.parentNode;

        // activate spinner
      $.one(".locator-text").classList.remove("active")
      $.one(".locateMe .lds-ellipsis").classList.add("active")

      locateMeClick(target,selectedLocation,map)    
    })    

    surpriseMeButton.addEventListener('click',(evt) => {  
      // Check if locations is defined and not empty
      if (locations && locations.length > 0) {
        // Display or process the CSV data
        // console.log(locations);
      } else {
        console.error('CSV data is not available.');
      }

      // // get the parent container of this
      // var target = evt.target.parentNode.parentNode.parentNode.parentNode.parentNode;
      // console.log("CLOSEST -> ", evt.target.closest("section"), "CHAIN OF PARENTNODES -> ", evt.target.parentNode.parentNode.parentNode.parentNode.parentNode);
      var target = evt.target.closest("section.map");

      // get random place
      var place = locations[Math.floor(Math.random()*locations.length)];

      // activate spinner
      $.one(".surprise-text").classList.remove("active")
      $.one(".surpriseMe .lds-ellipsis").classList.add("active")

      updateLocation(place,target,selectedLocation,map)

      // restore "surprise me!" text
      setTimeout(() => $.one(".surprise-text").classList.add("active"), 1500);
      setTimeout(() => $.one(".surpriseMe .lds-ellipsis").classList.remove("active"), 1500);
    });

    // Setup search box listeners
    var searchBox = $.one("#search-input");
    var searchNone = $.one("#search .no-data-msg");
    searchBox.addEventListener("change", function(evt) {
      var idx = evt.target.entries[evt.target.selectedIndex].value;
      console.log(locations[idx]);

      if (locations[idx]) {
        searchNone.classList.add("is-hidden");

        // // get the parent container of this
        // var target = evt.target.parentNode.parentNode.parentNode.parentNode.parentNode;
        var target = evt.target.closest("section");
        var place = locations[idx];

        console.log("place:", place);
        console.log("target:", target);
        console.log("selectedLocation:", selectedLocation);
        console.log("map:", map);
  
        updateLocation(place,target,selectedLocation,map)

      } else {
        searchNone.classList.remove("is-hidden");
      }
    });  

    map.on('mousemove', async function(e) {
      // get features under point
      const features = map.queryRenderedFeatures(e.point);

      var temperatures = await getTemps(e.lngLat);

      try {
        document.getElementById('info').innerHTML =
        // e.point is the x, y coordinates of the mousemove event relative
        // to the top-left corner of the map
        `${
          // e.lngLat is the longitude, latitude geographical position of the event
          JSON.stringify(e.lngLat.wrap())}<br>
          Temps: ${formatTemperatures(JSON.stringify(temperatures.data))}<br>
            <b>avg</b>: ${Math.round(temperatures.avg*10)/10}ºF | 
            <b>zone</b>: ${temperatures.zone} | 
            <b>countBelow</b>: ${temperatures.countBelow} | 
            <b>countAbove</b>: ${temperatures.countAbove} | 
          `;
        } catch(err) {
          // console.log(err)
        }
      
    });
  })
}

var handler;

var handlers = {
  map: new mapView(map),
  chart: new chartView(),
  image: new imageView(),
  video: new imageView(),
  text: new textView(),
  multiple: new imageView(),
};

var active = null;

var activateSlide = function(slide, slideNumber) {  
  handlers.map.map = map;

  // skip if already in the slide
  if (active == slide) return;

  // If we changed block type, let the previous director leave
  if (handler) {
    handler.exit(active);
  }

  var currType = slide.dataset.type || "image";
  handler = handlers[currType];
  handler.enter(slide);

  active = slide;

  // force video playback
  if (!isOne) $("video[autoplay]", slide).forEach(v => {
    v.currentTime = 1;
    v.play();
  });

  // lazy-load neighboring slides
  var neighbors = [-1, 0, 1, 2];
  var all = $(".sequence .slide");
  var index = all.indexOf(slide);
  neighbors.forEach(function(offset) {
    var neighbor = all[index + offset];
    if (!neighbor) return;
    var nextType = neighbor.dataset.type || "image";
    var neighborHandler = handlers[nextType];
    neighborHandler.preload(
      neighbor,
      handler != neighborHandler && offset == 1
    );
    // var images = $("[data-src]", neighbor);
    // images.forEach(function(img) {
    //   img.src = img.dataset.src;
    //   img.removeAttribute("data-src");
    //   if (img.dataset.poster) {
    //     img.poster = img.dataset.poster;
    //     img.removeAttribute("data-poster");
    //   }
    // })
  });
  

  // Uncomment if the first slide is a video
  // if (slide.dataset.type === "video") {
  //   autoplayWrapper.classList.remove("hidden");
  // } else {
  //   autoplayWrapper.classList.add("hidden");
  // }
}

var onScroll = function() {
  for (var i = 0; i < slides.length; i++) {
    var slide = slides[i];
    var postTitle = i <= 1 ? null : slides[i + 1];
    var isAfterTitleCard = (postTitle && postTitle.classList.contains("titlecard")) ? true : false;
    var bounds = slide.getBoundingClientRect();

    // tweaking slide toggle tolerances if this is the first card after a titlecard
    if (
      (isAfterTitleCard && (bounds.top < window.innerHeight && bounds.bottom > 0)) ||
      (!isAfterTitleCard && (bounds.top < window.innerHeight * .9 && bounds.bottom > 0))
      ) {

        var complete = ((slides.length - i) / slides.length * 100) | 0;
        if (complete > completion) {
          completion = complete;
          track("completion", completion + "%");
        }
        var slideNumber = slides.length - 1 - i;
        console.log(`slide ${slideNumber}, id: ${slide.id}`);
        return activateSlide(slide, slideNumber);
    }
  }
}

document.body.classList.add("boot-complete");
window.addEventListener("scroll", debounce(onScroll, 50)); //ruth
onScroll();
window.addEventListener("load", onWindowLoaded);


// link tracking
var trackLink = function() {
  var action = this.dataset.track;
  var label = this.dataset.label;
  track(action, label);
};
$("[data-track]").forEach(el => el.addEventListener("click", trackLink));