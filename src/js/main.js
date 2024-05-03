var $ = require("./lib/qsa")
var debounce = require("./lib/debounce"); //ruth had in sea level rise...not sure if we need
var track = require("./lib/tracking");
require("@nprapps/autocomplete-input");
var { isMobile } = require("./lib/breakpoints");

var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");
var pmtiles = require("pmtiles/dist");

var mapView = require("./views/mapView");
var imageView = require("./views/imageView");
var textView = require("./views/textView");
var chartView = require("./views/chartView");

// var {logDataTransfer} = require("./stats") // Call the function to start logging data transfer

require("./video");
require("./analytics");

var {
      getUserLocation,
      compileLegendStyle,
      compileZoneLabelStyle,
      compileTempDiffStyle,
      makePoint,
      checkTilesLoaded,
      getZone,
      getStartingCoords
    } = require("./helpers/mapHelpers");

var {
  getTemps,
  getData,
  formatTemperatures
} = require("./helpers/temperatureUtils");

var {
  fetchCSV
} = require("./helpers/csvUtils");

var { getTooltip } = require('./helpers/textUtils')

var {
  updateLocation,
  clickButton,
  updateDom
} = require("./geoClick");

var slides = $(".sequence .slide").reverse();
var autoplayWrapper = $.one(".a11y-controls");

var waterfallSlide = $.one(".waterfall.slide");
var waterfallItems = $(".waterfall.slide .headline-item");

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

var completion = 0;
var map;
let locations;
let locations_url = "https://apps.npr.org/plant-hardiness-garden-map/assets/synced/csv/GAZETTEER.csv";


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

  // if url params, set default selectedLocation to that place

  // Get current URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('lat') && urlParams.has('lng')) {
    const params = {};

    for (const [key, value] of urlParams.entries()) {
        params[key] = value;
    }  

    selectedLocation.coords = [params.lng,params.lat];
    selectedLocation.placeName = params.name;
    selectedLocation.placeState = params.state;
  
  }

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

  // override default styles
  // https://stackoverflow.com/questions/47625017/override-styles-in-a-shadow-root-element/56706888#56706888
  var searchInput = document.querySelector("autocomplete-input");
  var searchStyle = searchInput.shadowRoot.styleSheets[0];
  searchStyle.insertRule("input { font-family: 'NPRSans', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; border: none; border-shadow: none; font-size: 16px; padding: 12px; }", 0);
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
  
  const PMTILES_URL = 'https://apps.npr.org/plant-hardiness-garden-map/assets/synced/pmtiles/usda_zones.pmtiles'
  const tempDiffURL =  'https://apps.npr.org/plant-hardiness-garden-map/assets/synced/pmtiles/temp_diff.pmtiles'  

  const p = new pmtiles.PMTiles(PMTILES_URL);

  // this is so we share one instance across the JS code and the map renderer
  protocol.add(p);

  p.getHeader().then(h => {
    
    
    let startingCoords = [-98.04, 39.507];
    
    // optionally, get timezone if mobile, to pick which quarter of country to show
    if (isMobile.matches) {
      console.log('is mobile')
      console.log($.one("#intro-1"))
      console.log($.one("#intro-1").dataset)
      
      startingCoords = getStartingCoords();
      $.one("#intro-1").dataset.center = JSON.stringify(startingCoords);
    };

    map = new maplibregl.Map({
      container: container,
      style: './assets/style.json',
      center: startingCoords,
      zoom: 3.8,
      minZoom:2.5,
      maxZoom:12.5
    });


    map.addControl(new maplibregl.NavigationControl({
      visualizePitch:false,
      showCompass:false
    }));
  

    map.on('load', () => {
      // map.addSource('userPoint', {
      //     'type': 'geojson',
      //     'data': makePoint([0,0])
      // });

      map.addSource('usda_zones', {
        type: 'vector',
        url: `pmtiles://${PMTILES_URL}`,
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
      })

      map.addSource('hillshade', {
        type: 'raster-dem',
        url: `pmtiles://https://r2-public.protomaps.com/protomaps-sample-datasets/terrarium_z9.pmtiles`,
        attribution: 'United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.',
        encoding: 'terrarium'
      })

      // map.addLayer({
      //   'id': 'userPoint',
      //   'type': 'circle',
      //   'source': 'userPoint',
      //   'paint': {
      //       'circle-radius': 8,
      //       'circle-color': 'transparent',
      //       'circle-stroke-color':'#fff',
      //       'circle-stroke-width':3
      //   }
      // },"Place labels"); 

      map.addLayer({
        'id': 'hillshade_',
        'source': 'hillshade',        
        'type': 'hillshade',
        'minzoom':8,
        'maxzoom':15
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
          "fill-opacity":[
            'interpolate',
            ['linear'],
            ['zoom'],
              0, 1, // Fill opacity of 1 for zoom levels 0 through 7
              7, 1, // Fill opacity of 1 for zoom levels 0 through 7
              8, 0.78, // Fill opacity of 0.5 from zoom level 8 onwards
              22, 0.78 // Fill opacity of 0.5 from zoom level 8 through 22
          ]
        }      
      },
      // This line is the id of the layer this layer should be immediately below
      "Water")

      map.addLayer({
        'id': '2012_zones_labels',
        'source': 'usda_zones',
        'source-layer': '2012_zones',
        'type': 'fill',
        "minzoom": 8,
        'paint': {
          "fill-color": "rgba(255, 255, 0, 1)",
          "fill-pattern": compileZoneLabelStyle("2012_zone"),
          "fill-opacity": 0.5,
          
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
        "minzoom": 8,
        'paint': {
          "fill-color": "rgba(255, 255, 0, 1)",
          "fill-pattern": compileZoneLabelStyle("2023_zone"),
          "fill-opacity": 0
        }      
      },"Water")

      map.addSource('temp_diff', {
        type: 'vector',
        url: `pmtiles://${tempDiffURL}`
      })
      map.addLayer({
        'id': 'temp_diff_layer',
        'source': 'temp_diff',
        'source-layer': 'temp_diffgeojsonl',
        'minZoom':8,
        'type': 'fill',
        'paint': {
          "fill-color": [
          "case",
          ["==", ["get", "temp_diff"], null],
          "#aaffff",compileTempDiffStyle()         
          ],
          "fill-opacity": 0,
          "fill-outline-color":"rgba(255,255,255,0)"
        }      
      },
      // This line is the id of the layer this layer should be immediately below
      "Water")
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

    $.one("#sticky-nav .whereTo").addEventListener('click',() => {
      $.one("#base-map").classList.toggle('explore-mode');
      $.one("#info").classList.toggle('explore-mode');
      $("#sticky-nav .whereTo div").forEach(d => d.classList.toggle("active"))
    });

    $.one("#end-explore").addEventListener('click',() => {
      $.one("#base-map").classList.toggle('explore-mode');
      $.one("#info").classList.toggle('explore-mode');
      $("#sticky-nav .whereTo div").forEach(d => d.classList.toggle("active"))
    })

    $.one("#sticky-nav .dropdown").addEventListener('click',() => {
      // scroll back up to geolocation box
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
      const geoSlide = $.one("#intro-1");
      geoSlide.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    $.one(".surpriseMe").addEventListener('click',(evt) => { 
      // Check if locations is defined and not empty
      if (locations && locations.length > 0) {
        // Display or process the CSV data
        // console.log(locations);
      } else {
        console.error('CSV data is not available.');
      }

      // // get the parent container of this
      // var target = evt.target.parentNode.parentNode.parentNode.parentNode.parentNode;
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

      if (locations[idx]) {
        searchNone.classList.add("is-hidden");

        // // get the parent container of this
        // var target = evt.target.parentNode.parentNode.parentNode.parentNode.parentNode;
        var target = evt.target.closest("section");
        var place = locations[idx];        
  
        updateLocation(place,target,selectedLocation,map)

      } else {
        searchNone.classList.remove("is-hidden");
      }
    });  

    map.on('mousemove', async function(e) {
      // get features under point
      var features = map.queryRenderedFeatures(e.point);
      
      var zonesData = features.filter(d => {
        return d.source == "usda_zones";
      });
      var zoneInfo = getZone(zonesData);

      var temperatures = await getTemps(e.lngLat);

      try {
        $.one(".info-inner").innerHTML = getTooltip({zoneInfo,temperatures})
        
        } catch(err) {
          console.log(err)
        }
    });
  })
}

var handler;

var handlers = {
  map: new mapView(map),
  chart: new chartView(selectedLocation),
  image: new imageView(),
  video: new imageView(),
  text: new textView(),
  waterfall: new textView(),
  multiple: new imageView(),
};

var active = null;

var activateSlide = function(slide, slideNumber) {  
  handlers.map.map = map;
  handlers.chart.selectedLocation = selectedLocation;

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
  neighbors.forEach(function(offset,i) {
    var neighbor = all[index + offset];
    if (!neighbor) return;
    var nextType = neighbor.dataset.type || "image";
    var neighborHandler = handlers[nextType];
    console.log(neighbor)
    console.log(neighborHandler)
    neighborHandler.preload(
      neighbor,
      handler != neighborHandler && offset == 1,
      offset
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

        // chart triggers
        if (slide.id == "temperature-chart" || slide.id == "temperature-chart-return") {          
          var textBlocks = $(`#${slide.id} > .text`);

          var chartWrapper = $.one("#dot-chart");
          // var line2 = document.getElementsByClassName("line2");
          // var annot = document.getElementsByClassName("annotations");
          
          textBlocks.forEach(function(frame, n) {
            var bounds = frame.getBoundingClientRect();
            if (bounds.top < window.innerHeight * .9 && bounds.bottom > 0) {
              frame.classList.add("active");
              chartWrapper.dataset.frame = frame.id;              
            }
          else {
              frame.classList.remove("active");
          }
          });
        }

        // trigger waterfall blocks
        if (slide == waterfallSlide && waterfallItems.length && !reducedMotion.matches) {
          waterfallItems = waterfallItems.filter(function(item, n) {
            var bounds = item.getBoundingClientRect();
            if (bounds.top < window.innerHeight  * .8) {
              setTimeout(function(){ 
                item.classList.add('pubbed'); 
                item.classList.add(`headline-${ n }`); 
              }, n == 0 ? 100 : n * 600);
              // item.classList.add("pubbed");
              return false;
            }
            return true;
          });
        } else if (slide == waterfallSlide && waterfallItems.length && reducedMotion.matches) {
            waterfallItems = waterfallItems.filter(function(item, n) {
            item.classList.add('pubbed'); 
            return true;
          });
        }

        var complete = ((slides.length - i) / slides.length * 100) | 0;
        if (complete > completion) {
          completion = complete;
          track("completion", completion + "%");
        }
        var slideNumber = slides.length - 1 - i;
        // console.log(`slide ${slideNumber}, id: ${slide.id}`);
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