var $ = require("../lib/qsa");
var View = require("./view"); //from Ruth
var debounce = require("../lib/debounce"); //from Ruth

var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");

var { addLayerFunction } = require("../helpers/mapHelpers");
var { updateDom } = require("../geoClick.js")

var mapElement = $.one("#base-map");


module.exports = class MapView extends View {
  constructor(map,selectedLocation) {
    super();
    this.map = map;
    this.selectedLocation = selectedLocation
    // this.onMapScroll = debounce(onMapScroll, 50);
  }

  enter(slide) {
    super.enter(slide);
    var map = this.map;

    mapElement.classList.add("active");
    mapElement.classList.remove("exiting");
    
    if (map) {
      // pan and zoom

      if (slide.id == "explore") {
        // remove all other layers
        var layers = map.getStyle().layers.filter(a=> (a.source == "usda_zones" || a.source == "temp_diff") && a.id != slide.dataset.maplayer)
        layers.forEach(d=> {
          map.setLayoutProperty(d.id,'visibility','none')
        })
      }

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

    var map = this.map;
    console.log("----")
    console.log(slide.id)
    var layers = map.getStyle().layers.filter(a=> (a.source == "usda_zones" || a.source == "temp_diff") && a.id != slide.dataset.maplayer)
    console.log(map.getStyle().layers)
    console.log(layers)

    mapElement.classList.add("exiting");
    mapElement.classList.remove("active");
      
    if (slide.id == "explore") {      
      layers.forEach(d=> {
        map.setLayoutProperty(d.id,'visibility','visible')
      })
    }

    setTimeout(() => mapElement.classList.remove("exiting"), 1000);
  }

  preload = async function(slide,active,i,isBackwards,map) {    
    // var map = this.map; 
    // console.log(map)

    var selectedLocation = this.selectedLocation;

    if (map) {  
      
      // if only 1 ahead (or behind?????/)
      if (i != 2) {
        // add layer to map, opacity or visibility 0
        addLayerFunction(map,slide.dataset.maplayer)

        updateDom(selectedLocation,map,slide)
      }
    }    
  } 
};