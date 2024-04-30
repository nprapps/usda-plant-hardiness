var $ = require("../lib/qsa");
var View = require("./view"); //from Ruth
var debounce = require("../lib/debounce"); //from Ruth

var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");

// var {
//   makePoint
// } = require("../helpers/mapHelpers");

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

      if (slide.dataset.center) {
        var newCenter = JSON.parse(slide.dataset.center);            
      } else {
        var newCenter = oldCenter;
      }
      
      
      var oldZoom = map.getZoom();

      if (slide.dataset.zoom) {
        var newZoom = slide.dataset.zoom;  
      } else {
        var newZoom = oldZoom;
      }
      

      if (oldZoom != newZoom || oldCenter != newCenter) {

      // move pointer
        // map.getSource('userPoint').setData(makePoint(newCenter));
        
        // map.setLayerZoomRange('userPoint',7,20)

        map.flyTo({
          center: newCenter,
          zoom: newZoom,
          speed:0.9,
          essential: true 
        })
      }

      // filter pmtiles data layer to what the slide says
      try {
        var layers = map.getStyle().layers.filter(a=> (a.source == "usda_zones" || a.source == "temp_diff") && a.id != slide.dataset.maplayer)
        layers.forEach(d=> {
          map.setPaintProperty(d.id,'fill-opacity',0)
        })
        map.setPaintProperty(slide.dataset.maplayer, 'fill-opacity',0.78);
        if (slide.dataset.maplayer != "temp_diff_layer") {
          map.setPaintProperty(`${slide.dataset.maplayer}_labels`, 'fill-opacity',0.5);
        }        
      } catch(err) {
        console.log(err)
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