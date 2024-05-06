var $ = require("../lib/qsa");
var View = require("./view"); //from Ruth
var debounce = require("../lib/debounce"); //from Ruth

var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");

var {      
      compileLegendStyle,
      compileZoneLabelStyle,
      compileTempDiffStyle,     
    } = require("../helpers/mapHelpers");

var mapElement = $.one("#base-map");


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
        map.setPaintProperty(slide.dataset.maplayer, 'fill-opacity',[
            'interpolate',
            ['linear'],
            ['zoom'],
              0, 1, // Fill opacity of 1 for zoom levels 0 through 7
              7, 1, // Fill opacity of 1 for zoom levels 0 through 7
              8, 0.78, // Fill opacity of 0.5 from zoom level 8 onwards
              22, 0.78 // Fill opacity of 0.5 from zoom level 8 through 22
          ]
          );
        if (slide.dataset.maplayer != "temp_diff_layer") {
          map.setPaintProperty(`${slide.dataset.maplayer}_labels`, 'fill-opacity',0.5);
        }        
      } catch(err) {
        console.log(err)
      }
    }
  }

  exit(slide) {
    super.exit(slide);
    mapElement.classList.add("exiting");
    mapElement.classList.remove("active");
    setTimeout(() => mapElement.classList.remove("exiting"), 1000);
  }

  preload = async function(slide,active,i) {
    console.log(slide.id)
    console.log(slide.dataset.maplayer)
    console.log(i)
    console.log('preload for map')
    var map = this.map;
    console.log(map)

    // if only 1 ahead (or behind?????/)
    if (i == 1) {
      // add layer to map, opacity or visibility 0
      if (slide.dataset.maplayer == "2012_zones") {

      }

      if (slide.dataset.maplayer == "2023_zones") {
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
      }

      if (slide.dataset.maplayer == "temp_diff_layer") {
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
        },"Water")
      }
    }  
  } 
};

// var onMapScroll = function () {
  // console.log("onMapScroll")
  

// };