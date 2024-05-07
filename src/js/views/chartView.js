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
    console.log('in preload chart -----------------')
    // do some d3 code? transition the thing in?
    var selectedLocation = this.selectedLocation;
    var map = this.map;
    // console.log(map)
    
    var toContinue = 1;
    if (isBackwards) {
      toContinue = -1
    }

    console.log(i)
    console.log(toContinue)
    console.log(slide.id)
    console.log(map)
    console.log(selectedLocation)

    if (i == toContinue || i == 0) {
      console.log(slide.id)
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
        setupChart(exampleLocation);

      } else if (slide.id == "temperature-chart") {

        selectedLocation = await getAndParseTemps(selectedLocation);        
        // setupChart(temps);

        // if (selectedLocation.placeState == "AK" || selectedLocation.placeState == "HI") {    
        //   setupChart(atlLocation)
        // } else {
          setupChart(selectedLocation);
        // }        
      }
    }

    if (i==0 || i==1) {
      updateDom(selectedLocation,map,slide)
    }    
  }
};