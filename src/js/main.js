var $ = require("./lib/qsa")
var debounce = require("./lib/debounce"); //ruth had in sea level rise...not sure if we need
var track = require("./lib/tracking");

var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");
var pmtiles = require("pmtiles/dist");

var mapView = require("./mapView");
var {getTemps,getData,formatTemperatures} = require("./temperatureUtil");

require("./video");
require("./analytics");

var slides = $(".sequence .slide").reverse();
var autoplayWrapper = $.one(".a11y-controls");

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

var completion = 0;
var map;
var activeMap = "2012_zone";

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
  renderMap();
}

var renderMap = async function() {
  var container = "base-map";
  var element = document.querySelector(`#${container}`);
  console.log(element)
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

  const PMTILES_URL = 'https://apps.npr.org/dailygraphics/graphics/00-map-test-20240318/synced/usda_zones.pmtiles';

  const p = new pmtiles.PMTiles(PMTILES_URL);

  // this is so we share one instance across the JS code and the map renderer
  protocol.add(p);

  p.getHeader().then(h => { 

    map = new maplibregl.Map({
      container: container,
      style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=xw1Hu0AgtCFvkcG0fosv',
      // center: [-77.04, 38.907],
      center: [-98.04, 39.507],
      zoom: 3.9
  });

    map.on('load', () => {
      map.addSource('usda_zones', {
        type: 'vector',
        url: `pmtiles://${PMTILES_URL}`,
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
      })

    map.addLayer({
      'id': '2012_zones',
      'source': 'usda_zones',
      'source-layer': '2012_zones',
      'type': 'fill',
      'paint': {
        "fill-color": [
        "case",
        ["==", ["get", "2012_zone"], null],
        "#aaffff",
        ["step", ["get", "2012_zone"], "#d6d6fd", -55, "#c4c4f0", -50, "#ababd7", -45, "#f0b0e9", -40, "#e691e8", -35, "#d57dd8", -30 , "#a969fa", -25, "#5274e8", -20, "#69a0fb", -15, "#43c9de", -10, "#26bb51", -5, "#6cc860", 0, "#a7d772", 5, "#cddc7a", 10, "#f0db8d", 15, "#efcc64", 20, "#e0b75b", 25, "#fcb77f", 30, "#f39d46", 35, "#ef7932", 40, "#f1572e", 45, "#f18669", 50, "#dd5a53", 55, "#be142d", 60, "#9d3023", 65, "#7b1b09"]
        ],
        "fill-opacity": 0.7
      }      
    },
    // This line is the id of the layer this layer should be immediately below
    "Water")
    map.addLayer({
      'id': '2023_zones',
      'source': 'usda_zones',
      'source-layer': '2023_zones',
      'type': 'fill',
      'paint': {
        "fill-color": [
        "case",
        ["==", ["get", "2023_zone"], null],
        "#aaffff",
        ["step", ["get", "2023_zone"], "#d6d6fd", -55, "#c4c4f0", -50, "#ababd7", -45, "#f0b0e9", -40, "#e691e8", -35, "#d57dd8", -30 , "#a969fa", -25, "#5274e8", -20, "#69a0fb", -15, "#43c9de", -10, "#26bb51", -5, "#6cc860", 0, "#a7d772", 5, "#cddc7a", 10, "#f0db8d", 15, "#efcc64", 20, "#e0b75b", 25, "#fcb77f", 30, "#f39d46", 35, "#ef7932", 40, "#f1572e", 45, "#f18669", 50, "#dd5a53", 55, "#be142d", 60, "#9d3023", 65, "#7b1b09"]
        ],
        "fill-opacity": 0
      }      
    },
    // This line is the id of the layer this layer should be immediately below
    "Water") 
    })

    map.on('mousemove', async function(e) {      
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

// var handlers = {
//   map: new mapView(map),
//   image: new imageView(),
//   video: new imageView(),
//   text: new textView(),
//   multiple: new imageView(),
// };

var active = null;

var activateSlide = function(slide) {  
  // skip if already in the slide
  if (active == slide) return;
  
  // console.log(slide)
  // console.log(slide.dataset)
  // console.log(JSON.parse(slide.dataset.center))
  // console.log(map)

  try {  
    // console.log(map.getStyle().layers)
    var layers = map.getStyle().layers.filter(a=> a.source == "usda_zones" && a.id != slide.dataset.maplayer)
    layers.forEach(d=> {
      map.setPaintProperty(d.id,'fill-opacity',0)
    })
    map.setPaintProperty(slide.dataset.maplayer, 'fill-opacity',0.7);

    if (layer) {
      // const newSourceLayer = slide.dataset.maplayer;
      // console.log(newSourceLayer)
      // console.log(layer.sourceLayer)
      // layer.sourceLayer = newSourceLayer;
      // console.log(layer.sourceLayer)
    }

    
    // map.fire('dataloading', {dataType: 'source'});
  } catch(err) {
    console.log(err)
  }
  


  if (active) {
    var exiting = active;
    active.classList.remove("active");
    active.classList.add("exiting");
    setTimeout(() => exiting.classList.remove("exiting"), 1000);
  } 

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
    var images = $("[data-src]", neighbor);
    images.forEach(function(img) {
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
      if (img.dataset.poster) {
        img.poster = img.dataset.poster;
        img.removeAttribute("data-poster");
      }
    })
  });

  slide.classList.add("active");
  slide.classList.remove("exiting");
  
  active = slide;

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
        return activateSlide(slide);
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
