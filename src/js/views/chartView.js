var $ = require("../lib/qsa");
var View = require("./view"); //from Ruth
var debounce = require("../lib/debounce"); //from Ruth
var { isMobile } = require("../lib/breakpoints");

var chartElement = $.one("#base-chart"); //I put this in index.html in the same place that the other one is, but plausibly, it ought to be somewhere else. 

var {
  getTemps,
  getAndParseTemps,
  temp2zone
} = require("../helpers/temperatureUtils"); 

var {setupChart} = require("../chart");

var { updateDom } = require("../geoClick.js")

var { addLayerFunction, waitForMap } = require("../helpers/mapHelpers");

module.exports = class ChartView extends View {
  constructor(map,selectedLocation) {
    super();
    this.map = map;
    this.selectedLocation = selectedLocation;
  }

  async enter(slide) {
    super.enter(slide);
    chartElement.classList.add("active");
    chartElement.classList.remove("exiting");    
  }

  exit(slide) {
    super.exit(slide);
    chartElement.classList.add("exiting");
    chartElement.classList.remove("active");
    setTimeout(() => chartElement.classList.remove("exiting"), 1000);
  }

  preload = async function(slide,active,i,isBackwards) {
    
    // set timeout to wait 3 tenths of a second before firing
    
      // do some d3 code? transition the thing in?
      var selectedLocation = this.selectedLocation;
      var map = this.map;
      
      var toContinue = 1;
      if (isBackwards) {
        toContinue = -1
      }

      if (i == toContinue || i == 0) {
        if (slide.id == "temperature-chart-return") {
          // get temp data for selected center
          var exampleLocation = {};
          exampleLocation.temperatures = await getTemps({
            "lng":JSON.parse(slide.dataset.center)[0],
            "lat":JSON.parse(slide.dataset.center)[1]
          })

          var temp2012 = -5;
          var temp2023 = 0;

          exampleLocation.zoneInfo = {
            "t2012":temp2012,
            "t2023":temp2023,
            "z2012":temp2zone(temp2012),
            "z2023":temp2zone(temp2023),
            "zDiff":((temp2023 - temp2012)/5)
          }

          exampleLocation.placeName = "St. Louis";
          exampleLocation.placeState = "MO";

          // update d3
          setTimeout(() => {
            waitForMap(function() {
              const waiting = () => {
                if (!map.isStyleLoaded()) {
                  setTimeout(waiting, 200);
                } else {
                  setupChart(exampleLocation);
                }
              };
              waiting();
            });
          },200)
          

        } else if (slide.id == "temperature-chart") {
          addLayerFunction(map,"2012_zones",false)
          addLayerFunction(map,"2023_zones",true)

          map.setLayoutProperty("2012_zones",'visibility','visible')
          map.setLayoutProperty("2023_zones",'visibility','visible')

          selectedLocation = await getAndParseTemps(selectedLocation);
          waitForMap(function() {
            const waiting = () => {
              if (!map.isStyleLoaded()) {
                setTimeout(waiting, 200);
              } else {
                setupChart(selectedLocation);
              }
            };
            waiting();
          });
        }
      }

      if (i==0 || i==1) {
        updateDom(selectedLocation,map,slide)
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

  }
};

