var $ = require("./lib/qsa")

// for optimization purposes;
var tileCount = 0;
var tileData = 0;
var startTime = new Date();
var now = startTime;

var debounce = require("./lib/debounce"); 
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

var box = $.one(".waterfall.slide .slides-container"); 
var next = $.one(".waterfall.slide .next"); 
var prev = $.one(".waterfall.slide .prev"); 
var items = $(".waterfall.slide .headline-item"); 
var dots = $(".waterfall.slide .dot"); 
var counter = 0; 
var amount = items.length; 
var current = items[0]; 

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

var completion = 0;
var map;
let locations;
var startingSlide;
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

  next.addEventListener("click", function(ev) {
    navigate(1);
  }); 

  prev.addEventListener("click", function(ev) {
    navigate(-1); 
  }); 

  navigate(0); 
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
    let startingZoom = 3.8;

    
    // optionally, get timezone if mobile, to pick which quarter of country to show
    if (isMobile.matches) {
      startingCoords = getStartingCoords();
      $.one("#intro-1").dataset.center = JSON.stringify(startingCoords);
    };
    
    // if reload or midjourney, starting coordinates and zoom set to mid journey
    if (startingSlide != 'titlecard' && startingSlide != 'intro-1' && startingSlide != 'explore') {
      startingCoords = selectedLocation.coords;
      startingZoom = 8.5      
    }

    map = new maplibregl.Map({
      container: container,
      style: './assets/style.json',
      center: startingCoords,
      zoom: startingZoom,
      minZoom:2.5,
      maxZoom:12.5
    });

    map.addControl(new maplibregl.NavigationControl({
      visualizePitch:false,
      showCompass:false
    }));
    
    map.attributionControl = false;
  
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

    $.one("#hidden-button").addEventListener('click',() => {
      $.one("#speed-shit").classList.toggle('active')
      if (map.showTileBoundaries) {
        map.showTileBoundaries = false;        
      } else {
        map.showTileBoundaries = true;  
      }
      
    })

    map.on('style.load', () => {
      if (selectedLocation.loadIterations == 0) {
        now = new Date();
        $.one("#Speedfortransfer").innerHTML = (new Date() - startTime)/1000;
      }
    });

    // map.on('render',() => {
    //   console.log(map)
    // })
    map.on('data',event => {    
      if (event.tile) {
        tileCount++;
      } 
    })

    // Listen for end of paint
    map.on('idle', () => {      
      console.log('is idle')
    
      // optimization analytics
      if (selectedLocation.loadIterations == 0) {
        $.one("#initTiles").innerHTML = tileCount;  
        $.one("#Speedforpaint").innerHTML = (new Date() - now)/1000;
        $.one("#loadSpeed").innerHTML = (new Date() - startTime)/1000;
      }
      
      $.one("#Totaltilesrequested").innerHTML = tileCount;

      $.one(".geo-buttons").classList.remove("disabled")
      updateDom(selectedLocation,map)
      selectedLocation.loadIterations+=1;
    })
    

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
      $("#sticky-nav .whereTo div").forEach(d => d.classList.toggle("active"));
      track("explore mode button clicked", "sticky-nav");
    });
    
    $.one("#sticky-nav .dropdown").addEventListener('click',() => {
      // scroll back up to geolocation box
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
      const geoSlide = $.one("#intro-1");
      $.one('#base-map').classList.remove("explore-mode");
      $.one("#info").classList.remove('explore-mode');
      $.one("#back-to-story").classList.remove('active');
      $.one("#explore-map").classList.add('active');

      geoSlide.scrollIntoView({ behavior: "smooth", block: "center" });

      track("switch location button clicked", "sticky-nav");
    });

    $.one("#end-explore").addEventListener('click',() => {
      $.one("#base-map").classList.toggle('explore-mode');
      $.one("#info").classList.toggle('explore-mode');
      $("#sticky-nav .whereTo div").forEach(d => d.classList.toggle("active"))

      track("return to story button clicked", "sticky-nav");
    })

    $.one("#restart.button").addEventListener('click',() => {
      // scroll back up to geolocation box
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
      const geoSlide = $.one("#intro-1");
      geoSlide.scrollIntoView({ behavior: "smooth", block: "center" });

      track("switch location button clicked", "final");
    });


    

    $.one(".surpriseMe").addEventListener('click',(evt) => { 
      // Check if locations is defined and not empty
      if (locations && locations.length > 0) {
        // Display or process the CSV data
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

      track("surprise me button clicked", `${ selectedLocation.placeName }, ${ selectedLocation.placeState }`);
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

        track("location lookup", `${ selectedLocation.placeName }, ${ selectedLocation.placeState }`);
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
        

        var complete = ((slides.length - i) / slides.length * 100) | 0; 
        if (complete > completion) {  
          completion = complete;  
          track("completion", completion + "%");  
        } 
        var slideNumber = slides.length - 1 - i;  
        startingSlide = slide.id;
        console.log(`slide ${slideNumber}, id: ${slide.id}`); 
        return activateSlide(slide, slideNumber);
    }
  }
}

document.body.classList.add("boot-complete");
window.addEventListener("scroll", debounce(onScroll, 50)); //ruth
onScroll();
window.addEventListener("load", onWindowLoaded);

// extension office write-ups
// highlight dots as you go through
var changeDots = function(n) {
  console.log("changeDots", n);
    for (var d = 0; d < dots.length; d++) {
    dots[d].classList.remove("active"); 

    if (d == n) {
      dots[d].classList.add("active"); 
    }
  }

  track("extension detail button clicked", n);
}

// prev + next btns
var navigate = function(d) {
  current.classList.remove("current"); 
  counter = counter + d; 

  if (d === -1 && counter < 0) {
    counter = amount - 1; 
  }

  if (d === 1 && !items[counter]) {
    counter = 0; 
  }

  current = items[counter]; 
  current.classList.add("current"); 
  changeDots(counter); 
} 

// link tracking
var trackLink = function() {
  var action = this.dataset.track;
  var label = this.dataset.label;
  track(action, label);
};
$("[data-track]").forEach(el => el.addEventListener("click", trackLink));