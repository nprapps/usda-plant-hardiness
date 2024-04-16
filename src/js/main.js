var $ = require("./lib/qsa")
var debounce = require("./lib/debounce"); //ruth had in sea level rise...not sure if we need
var track = require("./lib/tracking");
// var { isMobile } = require("./lib/breakpoints");

var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");
var pmtiles = require("pmtiles/dist");

var mapView = require("./views/mapView");
var imageView = require("./views/imageView");
var textView = require("./views/textView");
var chartView = require("./views/chartView");

var {
      getUserLocation,
      compileLegendStyle,
      compileZoneLabelStyle,
      compileTempDiffStyle,
      makePoint
    } = require("./helpers/mapHelpers");

var {
  getTemps,
  getData,
  formatTemperatures
} = require("./helpers/temperatureUtils");

var {
  fetchCSV
} = require("./helpers/csvUtils");

require("./video");
require("./analytics");

var {
  surpriseClick,
  locateMeClick,
  rotateClick,
  clickButton
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

// global place variable
var selectedLocation = {
  coords:[],
  placeName: null,
  placeState: null
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
  fetchCSV(locations_url).then(data => {
    locations = data;
  }).catch(error => console.error('Error fetching CSV:', error));

  renderMap();
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
      map.addSource('point', {
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

      map.addLayer({
        'id': 'point',
        'type': 'circle',
        'source': 'point',
        'paint': {
            'circle-radius': 8,
            'circle-color': 'transparent',
            'circle-stroke-color':'#fff',
            'circle-stroke-width':2
        }
      });                         

      // map.addLayer({
      //   'id': 'water-pattern',
      //   'source': "maptiler_planet",
      //   'source-layer': 'water',
      //   'type': 'fill',
      //   "paint": {
      //     "fill-color": "rgba(255, 255, 0, 1)",
      //     "fill-opacity":0.05,
      //     "fill-pattern": [
      //       "case",
      //       ["==", ["get", "class"], "ocean"],
      //       "zones:wave",
      //       ["==", ["get", "class"], "lake"],
      //       "zones:wave",
      //       "zones:wave"
      //     ]
      //   }      
      // },"River")

      console.log(map.getStyle().layers)
    })

    // what to do when you click LocateClick  
    var locatorButton = $.one(".locateMe");
    var surpriseMeButton = $.one(".surpriseMe");

    $.one("#explore-button").addEventListener('click',() => {
      // console.log()
      $.one("#base-map").classList.toggle('explore-mode');
      $.one("#info").classList.toggle('explore-mode');

    })    

    $.one(".rotateLocation").addEventListener('click',(evt) => {      
      rotateClick(evt,selectedLocation,map)
    })    

    locatorButton.addEventListener('click',(evt) => {      
      locateMeClick(evt,selectedLocation,map)
    })    

    surpriseMeButton.addEventListener('click',(evt) => {  
      surpriseClick(locations,evt,selectedLocation,map)
    })

    map.on('mousemove', async function(e) {
      // get features under point
      const features = map.queryRenderedFeatures(e.point);

      var temperatures = await getTemps(e.lngLat);

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