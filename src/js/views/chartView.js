var $ = require("../lib/qsa");
var View = require("./view"); //from Ruth
var debounce = require("../lib/debounce"); //from Ruth
var { isMobile } = require("../lib/breakpoints");

var chartElement = $.one("#base-chart"); //I put this in index.html in the same place that the other one is, but plausibly, it ought to be somewhere else. 

var {
  getTemps,
  temp2zone
} = require("../helpers/temperatureUtils"); 

var {setupChart} = require("../chart");




module.exports = class ChartView extends View {
  constructor(selectedLocation) {
    super();
    this.selectedLocation = selectedLocation;
  }

  async enter(slide) {
    super.enter(slide);
    chartElement.classList.add("active");
    chartElement.classList.remove("exiting");
    
    // do some d3 code? transition the thing in?
    var selectedLocation = this.selectedLocation;

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

      var atlLocation = {};

      // get temps for chart, if they're alaska, hawaii, or continental us
      if (selectedLocation.placeState != "AK" && selectedLocation.placeState != "HI") {
        selectedLocation.temperatures = await getTemps({
          "lng":selectedLocation.coords[0],
          "lat":selectedLocation.coords[1]
        });    
      } else if (selectedLocation.placeState == "AK") {
        var AKArr = [-16,-22,-14,-15,-14,-21,-11,-28,-10,2,-15,-2,-18,-8,-11,-17,-15,-24,-8,-12,-15,-12,-11,-5,-8,-15,-2,-7,-11,-3];

        selectedLocation.temperatures =  {
          "data":AKArr,
          "avg": -12.26,
          "zone": "5b",
          "countBelow": "TK",
          "countAbove": "TK",
          "placeName":"Anchorage, Alaska"
        }

        atlLocation.temperatures = selectedLocation.temperatures;

        var temp2012 = -20;
        var temp2023 = -15;

        atlLocation.zoneInfo = {
          "t2012":temp2012,
          "t2023":temp2023,
          "z2012":temp2zone(temp2012),
          "z2023":temp2zone(temp2023),
          "zDiff":((temp2023 - temp2012)/5)
        }

        selectedLocation.alt = {
          "state":"AK",
          "zoneInfo":atlLocation.zoneInfo
        }
      } else if (selectedLocation.placeState == "HI") {    
        var HIArr = [58,54,56,56,56,57,53,60,59,59,60,57,60,58,60,57,62,58,61,59,60,59,61,57,59,60,62,61,59,64];

        selectedLocation.temperatures =  {
          "data":HIArr,
          "avg": 58.7,
          "zone": "12b",
          "countBelow": "TK",
          "countAbove": "TK",
          "placeName":"Honolulu, Hawaii"
        }

        atlLocation.temperatures = selectedLocation.temperatures;

        var temp2012 = 50;
        var temp2023 = 55;

        atlLocation.zoneInfo = {
          "t2012":temp2012,
          "t2023":temp2023,
          "z2012":temp2zone(temp2012),
          "z2023":temp2zone(temp2023),
          "zDiff":((temp2023 - temp2012)/5)
        }

        selectedLocation.alt = {
          "state":"HI",
          "zoneInfo":atlLocation.zoneInfo
        }
      }

      if (selectedLocation.placeState == "AK" || selectedLocation.placeState == "HI") {    
        setupChart(atlLocation)
      } else {
        setupChart(selectedLocation);
      }            
    }    



  }

  exit(slide) {
    super.exit(slide);
    chartElement.classList.add("exiting");
    chartElement.classList.remove("active");
    setTimeout(() => chartElement.classList.remove("exiting"), 1000);
  }

  // preload(slide,active,i) {

  // }
};