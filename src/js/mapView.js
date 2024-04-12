var $ = require("./lib/qsa");
var View = require("./view"); //from Ruth
var debounce = require("./lib/debounce"); //from Ruth
// var { isMobile } = require("./lib/breakpoints");

var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");

var mapElement = $.one("#base-map");
// var mapAssets = {};
// var classes;


module.exports = class MapView extends View {
  constructor(map) {
    super();
    this.map = map;
    // this.onMapScroll = debounce(onMapScroll, 50);
  }

  enter(slide) {
    super.enter(slide);
    var map = this.map;



    mapElement.classList.add("active");
    mapElement.classList.remove("exiting");
    
    if (map) {
      // pan and zoom

      var {oldLng, oldLat} = map.getCenter();      
      var oldCenter = [oldLng,oldLat];      
      var newCenter = JSON.parse(slide.dataset.center);          
      
      var oldZoom = map.getZoom();
      var newZoom = slide.dataset.zoom;

      if (oldZoom != newZoom || oldCenter != newCenter) {
        map.flyTo({
          center: newCenter,
          zoom: newZoom,
          speed:0.7,
          essential: true 
        })
      }

      // filter pmtiles data layer to what the slide says
      try {
        var layers = map.getStyle().layers.filter(a=> a.source == "usda_zones" && a.id != slide.dataset.maplayer)
        layers.forEach(d=> {
          map.setPaintProperty(d.id,'fill-opacity',0)
        })
        map.setPaintProperty(slide.dataset.maplayer, 'fill-opacity',1);
        map.setPaintProperty(`${slide.dataset.maplayer}_labels`, 'fill-opacity',0.4);
      } catch(err) {
        console.log(err)
      }

      // Get data under a lat/lon
      if (slide.dataset.addpointer) {
        console.log('has add pointer')
        console.log(newCenter)
        console.log(map.project(newCenter))
        var point = map.project(newCenter);
        // // get marker and use to get data
        const features = map.queryRenderedFeatures(point);
        console.log(features)
      } 
      

    }
    // window.addEventListener("scroll", this.onMapScroll);
  }

  exit(slide) {

    // window.removeEventListener("scroll", this.onMapScroll);

    super.exit(slide);
    mapElement.classList.add("exiting");
    mapElement.classList.remove("active");
    setTimeout(() => mapElement.classList.remove("exiting"), 1000);
  }

  // preload = async function(slide) {

  // }
};

// var onMapScroll = function () {
  // console.log("onMapScroll")
  

// };