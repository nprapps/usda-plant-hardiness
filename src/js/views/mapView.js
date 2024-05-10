var $ = require("../lib/qsa");
var View = require("./view"); //from Ruth
var debounce = require("../lib/debounce"); //from Ruth

var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");

var { addLayerFunction } = require("../helpers/mapHelpers");
var { updateDom } = require("../geoClick.js");

var mapElement = $.one("#base-map");

module.exports = class MapView extends View {
  constructor(map, selectedLocation) {
    super();
    this.map = map;
    this.selectedLocation = selectedLocation;
    // this.onMapScroll = debounce(onMapScroll, 50);
  }

  enter(slide) {
    super.enter(slide);
    var map = this.map;

    mapElement.classList.add("active");
    mapElement.classList.remove("exiting");

    $.one(".pot2").classList.add("walking")

    if (slide.id == "explore") {
      $.one("#layer-button-nav").classList.remove("disabled");
      var images = $("[data-src]", slide);
      images.forEach(function (img) {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
      });
    } else {
      $.one("#layer-button-nav").classList.add("disabled");
    }

    if (map) {
      var layers = map
        .getStyle()
        .layers.filter(
          (a) => a.source == "usda_zones" || a.source == "temp_diff"
        );

      // Make sure the right layers are painted and opacity is correct.

      // // TODO does this need to include the labels layer too?
      // var hiddenLayers = layers.filter(a => a.id != slide.dataset.maplayer)

      var siblingBefore = slide.previousElementSibling;
      var siblingAfter = slide.nextElementSibling;
      var sibBeforeMap =
        siblingBefore != null ? siblingBefore.dataset.maplayer : null;
      var sibAfterMap =
        siblingAfter != null ? siblingAfter.dataset.maplayer : null;

      layers.forEach((d) => {
        if (
          d.id != slide.dataset.maplayer &&
          d.id != `${slide.dataset.maplayer}_labels` &&
          d.id != sibBeforeMap &&
          d.id != `${sibBeforeMap}_labels` &&
          d.id != sibAfterMap &&
          d.id != `${sibAfterMap}_labels`
        ) {
          // make unneeded maps visibility:none
          map.setLayoutProperty(d.id, "visibility", "none");
        } else if (
          d.id != slide.dataset.maplayer &&
          d.id != `${slide.dataset.maplayer}_labels`
        ) {
          // make preloaded maps fill-opacity:0
          map.setLayoutProperty(d.id, "visibility", "visible");
          map.setPaintProperty(d.id, "fill-opacity", 0);
        } else {
          if (d.id.includes("_labels")) {
            // style the labels layer
            map.setLayoutProperty(d.id, "visibility", "visible");
            map.setPaintProperty(`${d.id}`, "fill-opacity", 0.5);
          } else {
            // style the fill layer
            map.setPaintProperty(d.id, "fill-opacity", [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1, // Fill opacity of 1 for zoom levels 0 through 7
              7,
              1, // Fill opacity of 1 for zoom levels 0 through 7
              8,
              0.78, // Fill opacity of 0.5 from zoom level 8 onwards
              22,
              0.78, // Fill opacity of 0.5 from zoom level 8 through 22
            ]);
          }
        }
      });

      // pan and zoom
      var { oldLng, oldLat } = map.getCenter();
      var oldCenter = [oldLng, oldLat];

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

      if (slide.id == "explore") {
        $.one("#layer-button-nav").classList.remove("disabled");
      }

      // if you changed zoom from previous, do something
      if (oldZoom != newZoom || oldCenter != newCenter) {
        map.flyTo({
          center: newCenter,
          zoom: newZoom,
          speed: 0.9,
          essential: true,
        });
      }
    }
  }

  exit(slide) {
    super.exit(slide);

    var map = this.map;
    var layers = map
      .getStyle()
      .layers.filter(
        (a) =>
          (a.source == "usda_zones" || a.source == "temp_diff") &&
          a.id != slide.dataset.maplayer
      );
    // console.log(map.getStyle().layers)

    mapElement.classList.add("exiting");
    mapElement.classList.remove("active");

    if (slide.id == "explore") {
      $.one("#layer-button-nav").classList.add("disabled");

      layers.forEach((d) => {
        map.setLayoutProperty(d.id, "visibility", "visible");
      });
    }

    setTimeout(() => mapElement.classList.remove("exiting"), 1000);
  }

  preload = async function (slide, active, i, isBackwards, map) {
    // var map = this.map;
    // console.log(map)

    var selectedLocation = this.selectedLocation;

    if (map) {
      // if only 1 ahead (or behind?????/)
      if (i != 2) {
        // add layer to map, opacity or visibility 0
        addLayerFunction(map, slide.dataset.maplayer);

        updateDom(selectedLocation, map, slide);
      }
    }
  };
};
