var $ = require("../lib/qsa");
var View = require("./view"); //from Ruth
var debounce = require("../lib/debounce"); //from Ruth
var { isMobile } = require("../lib/breakpoints");

// import d3? 

// var mapElement = $.one("#base-map"); //Need this?
var chartElement = $.one("#base-chart"); //I put this in index.html in the same place that the other one is, but plausibly, it ought to be somewhere else. 

module.exports = class ChartView extends View {
  constructor() {
    super();
  }

  enter(slide) {
    super.enter(slide);
    
    console.log('hello slide of chart')

    chartElement.classList.add("active");
    chartElement.classList.remove("exiting");
    
    // do some d3 code? transition the thing in?
    
  }

  exit(slide) {
    super.exit(slide);
    chartElement.classList.add("exiting");
    chartElement.classList.remove("active");
    setTimeout(() => mapElement.classList.remove("exiting"), 1000);
  }

  preload = async function(slide) {
    console.log("preload of chart?")
  }
};