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
    getZone,
    getStartingCoords,
    addLayerFunction
  } = require("./helpers/mapHelpers");

var {
  getTemps,
  formatTemperatures,
  getAndParseTemps
} = require("./helpers/temperatureUtils");

var { fetchCSV } = require("./helpers/csvUtils");

var {loadingTextUtil, getLegendPointer } = require('./helpers/textUtils')

var {
  updateLocation,
  clickButton,
  updateDom
} = require("./geoClick");

// slides at end
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
var slideActive = {'id':'intro-1','dataset':{'maplayer':'2012_zones'}};

var standardOpacity = ['interpolate',['linear'],['zoom'],0, 1, 7, 1, 8, 0.78, 22, 0.78 ]

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

  // Preset all text to Loading
  loadingTextUtil($("span[data-item"))
  
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

  if (urlParams.has('debug')) {
    $.one("#debugger").classList.add('active')
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
    
    map.touchZoomRotate.disableRotation();
    map.dragRotate.disable();

    map.addControl(new maplibregl.NavigationControl({
      visualizePitch:false,
      showCompass:false
    }));
    
    // clone the +/-
    var clone = $.one(".maplibregl-ctrl.maplibregl-ctrl-group").cloneNode(true);
    clone.setAttribute("id","zoomerButtons")    

    // add another button to cloned +/-
    var clone2 = $("button", clone)[0].cloneNode(true);
    clone.append(clone2)    

    var places = [
      {"name":"usa","center":[-98, 39],"zoom":3.8,"zoomMobile":3.3},
      {"name":"alaska","center":[-149,63],"zoom":3.8,"zoomMobile":3.5},
      {"name":"hawaii","center":[-157.67,20.59],"zoom":6.5,"zoomMobile":5.59},
      ]
    // bind the listeners for each
    $("button", clone).forEach((el,i) => {

      // remove the class of each and add another class or id
      el.className = places[i].name;

      // bind the listener
      el.addEventListener("click",() => {

        map.flyTo({
          center: places[i].center,
          zoom: isMobile.matches ? places[i].zoomMobile : places[i].zoom,
          speed:0.9,
          essential: true 
        })
      })
    });

    $.one(".maplibregl-ctrl.maplibregl-ctrl-group").parentNode.append(clone);
    
    
    
    map.attributionControl = false;
  
    map.on('load', () => {

      map.addSource('usda_zones', {
        type: 'vector',
        url: `pmtiles://${PMTILES_URL}`,
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
      })
      
      map.addSource('temp_diff', {
        type: 'vector',
        url: `pmtiles://${tempDiffURL}`
      })

      map.addSource('hillshade', {
        type: 'raster-dem',
        url: `pmtiles://https://apps.npr.org/plant-hardiness-garden-map/assets/hillshade.pmtiles`,
        encoding: 'terrarium'
      })

      map.addLayer({
        'id': 'hillshade_',
        'source': 'hillshade',        
        'type': 'hillshade',
        'layout':{
          'visibility':'visible'
        },
        'minzoom':8,
        'maxzoom':15
      },
      // This line is the id of the layer this layer should be immediately below
      "Water")    
      
      if (slideActive.dataset.type == "map") {         
        // add layer and style
        addLayerFunction(map,slideActive.dataset.maplayer,true)
        updateDom(selectedLocation,map,slideActive)
      }

      // If load during or right before/after a chart, load 2012 and 2023
      if (
        slideActive.dataset.type == "chart" ||
        slideActive.id == "transition-1" || 
        slideActive.id == "how-to" || 
        slideActive.id == "limits-of-hardiness" || 
        slideActive.id == "explore"
        ) {
        console.log('loading 2012 and 2023')
        addLayerFunction(map,"2012_zones",false)
        addLayerFunction(map,"2023_zones",true)
      }

    })

    // used for speed analytics
    // url param

    // used for speed analytics
    map.on('style.load', () => {
      if (selectedLocation.loadIterations == 0) {
        console.log('all data transfered')

        now = new Date();
        $.one("#Speedfortransfer").innerHTML = (new Date() - startTime)/1000;
      }
    });
    // used for speed analytics
    map.on('data',event => {    
      if (event.tile) {
        tileCount++;
      } 
    })

    // Listen for end of paint
    map.on('idle', async () => {
      // optimization analytics
      if (selectedLocation.loadIterations == 0) {
        $.one("#initTiles").innerHTML = tileCount;  
        $.one("#Speedforpaint").innerHTML = (new Date() - now)/1000;
        $.one("#loadSpeed").innerHTML = (new Date() - startTime)/1000;
      }
      
      $.one("#Totaltilesrequested").innerHTML = tileCount;

      var layersLoaded = function() {
        var layers = map.getStyle().layers.filter(a=> (a.source == "usda_zones" || a.source == "temp_diff"))
        var text;

        layers.forEach(d=> {
          text += `<p>${d.id}: ${d.layout.visibility}</p>`          
        })
        return text;
      };

      try {
        $.one("#slideID").innerHTML = slideActive.id;  
      } catch(err) {
        console.log(err)
      }

      
      $.one("#layers-loaded").innerHTML = layersLoaded();

      $.one(".geo-buttons").classList.remove("disabled");

      try {
        selectedLocation = await getAndParseTemps(selectedLocation);
        updateDom(selectedLocation,map,slideActive)
      } catch(err) {
        console.log(err)
      }
      selectedLocation.loadIterations+=1;
    })
    
    // disable ability to interact with buttons
    map.on('movestart', () =>{
      $.one(".geo-buttons").classList.add("disabled")
              
    })

    // restore ability to interact with buttons
    map.on('moveend', () => {
      // actually should wait for end 
      const waiting = () => {
        if (!map.isStyleLoaded()) {
          setTimeout(waiting, 200);
        } else {
          $.one(".geo-buttons").classList.remove("disabled")
        }
      };
      waiting();      
    });

    $.one("#sticky-nav .whereTo").addEventListener('click',() => {
      $.one("#base-map").classList.toggle('explore-mode');
      $("#sticky-nav .whereTo div").forEach(d => d.classList.toggle("active"));

      // listener for "explore map button"
      if ($.one("#back-to-story").classList.contains('active')) {
        track("explore mode button clicked", "sticky-nav");

        console.log('here hello world????????????')

        map.setLayoutProperty('2012_zones','visibility','visible')
        map.setLayoutProperty('2012_zones_labels','visibility','visible')
        map.setPaintProperty('2012_zones','fill-opacity',0)
        map.setPaintProperty('2012_zones_labels','fill-opacity',0)

        // default to 2023 when you enter 
        map.setPaintProperty('2023_zones','fill-opacity',standardOpacity);
        map.setPaintProperty('2023_zones_labels','fill-opacity',0.5);


        $.one("#layer-2012.inner-nav").classList.remove("active");
        $.one("#layer-2023.inner-nav").classList.add("active");

        $.one("#layer-button-nav").classList.add("active");

        $.one("#sticky-nav .inner-nav.dropdown").classList.add("disabled")

      } else if ($.one("#explore-map").classList.contains('active')) {
        track("back to story button clicked", "sticky-nav");
        
        $('#sticky-legend .zone').forEach(d => {
          d.classList.remove("active");
        })  

        $('.zone-after').forEach(d => {
          d.classList.remove("coldest");
          d.innerHTML = ""
        });

        $.one("#sticky-nav .inner-nav.dropdown").classList.remove("disabled")
        $.one("#layer-button-nav").classList.remove("active");

        // go back to url
        map.flyTo({
          center: selectedLocation.coords,
          zoom: 8.5,
          speed:0.9,
          essential: true 
        })
      }
    });
    
    $.one("#sticky-nav .dropdown").addEventListener('click',() => {
      // scroll back up to geolocation box
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
      const geoSlide = $.one("#intro-1");
      $.one('#base-map').classList.remove("explore-mode");
      $.one("#back-to-story").classList.remove('active');
      $.one("#explore-map").classList.add('active');

      geoSlide.scrollIntoView({ behavior: "smooth", block: "center" });

      track("switch location button clicked", "sticky-nav");
    });

    $.one("#end-explore").addEventListener('click',() => {
      map.setLayoutProperty('2012_zones','visibility','visible')
      map.setLayoutProperty('2012_zones_labels','visibility','visible')
      map.setPaintProperty('2012_zones','fill-opacity',0)
      map.setPaintProperty('2012_zones_labels','fill-opacity',0)

      // default to 2023 when you enter 
      map.setPaintProperty('2023_zones','fill-opacity',standardOpacity);
      map.setPaintProperty('2023_zones_labels','fill-opacity',0.5);
      $.one("#layer-2012.inner-nav").classList.remove("active");
      $.one("#layer-2023.inner-nav").classList.add("active");

      $.one("#base-map").classList.toggle('explore-mode');
      $("#sticky-nav .whereTo div").forEach(d => d.classList.toggle("active"));
      $.one("#sticky-nav .inner-nav.dropdown").classList.add("disabled");

      $.one("#layer-button-nav").classList.add("active");

      track("explore mode button clicked", "final");
      
    })

    $.one("#restart.button").addEventListener('click',() => {
      // scroll back up to geolocation box
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
      $.one("#layer-button-nav").classList.remove("active");

      const geoSlide = $.one("#intro-1");
      geoSlide.scrollIntoView({ behavior: "smooth", block: "center" });

      track("switch location button clicked", "final");
    });

    
    // event listeners for 2012 vs. 2023 map
    $(".inner-nav.layer").forEach(el => el.addEventListener('click',(evt)=>{
      $(".inner-nav.layer").forEach(d => d.classList.remove('active'));
      evt.target.classList.add('active');
      addLayerFunction(map,"2012_zones",true)
      addLayerFunction(map,"2023_zones",true)

      if (evt.target.id == "layer-2012") {        
        map.setPaintProperty('2012_zones','fill-opacity',standardOpacity)
        map.setPaintProperty('2012_zones_labels','fill-opacity',0.5)
        map.setPaintProperty('2023_zones','fill-opacity',0)
        map.setPaintProperty('2023_zones_labels','fill-opacity',0)
      }

      if (evt.target.id == "layer-2023") {
        map.setPaintProperty('2023_zones','fill-opacity',standardOpacity)
        map.setPaintProperty('2023_zones_labels','fill-opacity',0.5)
        map.setPaintProperty('2012_zones','fill-opacity',0)
        map.setPaintProperty('2012_zones_labels','fill-opacity',0)
      }
    }));

    $.one(".surpriseMe").addEventListener('click',(evt) => { 
      // Check if locations is defined and not empty
      if (locations && locations.length > 0) {
        // Display or process the CSV data
      } else {
        console.error('CSV data is not available.');
      }

      // clear out the existing data
      selectedLocation.zonesData = [];

      // interstitial loads
      loadingTextUtil($("span[data-item"));

      // // get the parent container of this
      // var target = evt.target.parentNode.parentNode.parentNode.parentNode.parentNode;
      var target = evt.target.closest("section.map");

      // get random place
      var place = locations[Math.floor(Math.random()*locations.length)];

      // activate spinner
      $.one(".surprise-text").classList.remove("active")
      $.one(".surpriseMe .lds-ellipsis").classList.add("active")

      updateLocation(place,target,selectedLocation,map,slideActive)

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
        
        selectedLocation.zonesData = [];
        loadingTextUtil($("span[data-item"))
        updateLocation(place,target,selectedLocation,map,slideActive)

        track("location lookup", `${ selectedLocation.placeName }, ${ selectedLocation.placeState }`);
      } else {
        searchNone.classList.remove("is-hidden");
      }
    });  

    map.on('mousemove', debounce(async function(e) {
      // get features under point
      var features = map.queryRenderedFeatures(e.point);

      var zonesData = features.filter(d => {
        return d.source == "usda_zones";
      });
      var zoneInfo = getZone(zonesData);

      try {
        var temperatures = await getTemps(e.lngLat);  
      } catch(err) {
        console.log(err)
      }

      try {
        getLegendPointer({zoneInfo,temperatures})
        } catch(err) {
          console.log(err)
        }
    },200));
  })
}

var handler;

var handlers = {
  map: new mapView(map),
  chart: new chartView(map, selectedLocation),
  image: new imageView(),
  video: new imageView(),
  text: new textView(),
  waterfall: new textView(),
  multiple: new imageView(),
};

var active = null;
var previous = null;

var activateSlide = function(slide, slideNumber) {  
  handlers.map.map = map;
  handlers.map.selectedLocation = selectedLocation;

  handlers.chart.selectedLocation = selectedLocation;
  handlers.chart.map = map;

  // skip if already in the slide
  if (active == slide ) return;

  // If we changed block type, let the previous director leave
  if (handler) {
    handler.exit(active);
  }

  var currType = slide.dataset.type || "image";
  handler = handlers[currType];
  handler.enter(slide);

  previous = active;

  active = slide;

  // lazy-load neighboring slides
  var neighbors = [-1, 0, 1, 2];
  var all = $(".sequence .slide");
  var index = all.indexOf(slide);

  var isBackwards = index < all.indexOf(previous) ? true : false;

  neighbors.forEach(function(offset,i) {
    var neighbor = all[index + offset];
    if (!neighbor) return;
    var nextType = neighbor.dataset.type || "image";
    var neighborHandler = handlers[nextType];    

    waitForMap(function() {
      const waiting = () => {
        if (!map.isStyleLoaded()) {
          setTimeout(waiting, 200);
        } else {
          neighborHandler.preload(
            neighbor,
            handler != neighborHandler && offset == 1,
            offset,        
            isBackwards,
            map
          );
        }
      };
      waiting();
    });

  });
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
        slideActive = slide;
        return activateSlide(slide, slideNumber);
    }
  }
}

document.body.classList.add("boot-complete");
window.addEventListener("scroll", debounce(onScroll, 100)); //ruth
onScroll();
window.addEventListener("load", onWindowLoaded);

// extension office write-ups
// highlight dots as you go through
var changeDots = function(n) {
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

function waitForMap(callback) {
  // Check if the variable is defined immediately
  if (map !== undefined) {
    callback();
  } else {
    // If not defined, set up a timeout to periodically check
    var interval = setInterval(function() {

      if (map !== undefined) {
        clearInterval(interval);
        callback();
      }
    }, 100); // Adjust the interval as needed
  }
}

// link tracking
var trackLink = function() {
  var action = this.dataset.track;
  var label = this.dataset.label;
  track(action, label);
};
$("[data-track]").forEach(el => el.addEventListener("click", trackLink));