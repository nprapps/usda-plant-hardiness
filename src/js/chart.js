var $ = require("./lib/qsa");

var chartSlide = $.one("#temperature-chart.slide");

/*
 porting over renderDotChart.js in the same file
*/
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

// var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile, isDesktop } = require("./lib/breakpoints");

// Render a line chart.
var renderDotChart = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  // figure out chart dimensions and margins
  var margins = {
    top: 75,
    right: 200,
    bottom: 110,
    left: 200
  };
  if (isMobile.matches) {
    margins = {
      top: 100,
      right: 50,
      bottom: 170,
      left: 50
    }
  }

  var chartWidth = config.width - margins.left - margins.right;
  if (chartWidth < config.minWidth) {
    chartWidth = config.minWidth;
    margins.left = Math.floor((config.width - chartWidth) / 2);
    margins.right = margins.left;
  }
  if (chartWidth > config.maxWidth) {
    chartWidth = config.maxWidth;
    margins.left = Math.floor((config.width - chartWidth) / 2);
    margins.right = margins.left;
  }
  var chartHeight = config.height - margins.top - margins.bottom;
  
  // set up ticks and rounding
  var ticksX = isMobile.matches ? 5 : 10;
  var ticksY = isMobile.matches ? 5 : 5;
  var roundTicksFactor = 2;

  var tickValues = [
    new Date(2020, 0, 1),
    new Date(2050, 0, 1),
    new Date(2070, 0, 1),
    new Date(2090, 0, 1),
    new Date(2110, 0, 1),
    new Date(2130, 0, 1)
  ];
  if (isMobile.matches) {
    tickValues = [
      new Date(2020, 0, 1),
      new Date(2050, 0, 1),
      new Date(2090, 0, 1),
      new Date(2130, 0, 1)
    ]; 
  }
  if (isTablet.matches) {
    tickValues = [
      new Date(2020, 0, 1),
      new Date(2030, 0, 1),
      new Date(2040, 0, 1),
      new Date(2050, 0, 1),
      new Date(2060, 0, 1),
      new Date(2070, 0, 1),
      new Date(2080, 0, 1),
      new Date(2090, 0, 1),
      new Date(2100, 0, 1),
      new Date(2110, 0, 1),
      new Date(2120, 0, 1),
      new Date(2130, 0, 1)
    ];
  }

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.data[0].values.map(d => d[dateColumn]);
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var values = config.data.reduce(
    (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
    []
  );
  // console.log(values);

  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.blue6,
      COLORS.blue4,
      COLORS.blue2
    ]);

  // Render the HTML legend.
  // var oneLine = config.data.length > 1 ? "" : " one-line";

  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key" + oneLine)
  //   .selectAll("g")
  //   .data(config.data)
  //   .enter()
  //   .append("li")
  //   .attr("class", d => "key-item " + classify(d.name));

  // legend.append("b").style("background-color", d => colorScale(d.name));

  // legend.append("label").text(d => d.name);

  // Create the root SVG element.

  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    // .ticks(ticksX)
    .tickValues(tickValues)
    .tickFormat(function(d) {
      var thisYr = yearFull(d);
      return thisYr;
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d, i) {
      if (d == 0) {
        return d;
      } else {
        return "+" + d + " ft.";
      }
  });

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  // Render grid to chart.

  var xAxisGrid = function() {
    return xAxis;
  };

  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

  // Render 0 value line.

  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));
  }

  // Render lines to chart.
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  // First line part
  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
      .append("path")
      .attr("class", d => "line1 " + classify(d.name))
      .attr("stroke", d => colorScale(d.name))
      //First line part until 2050
      .attr("d", d => line(d.values.slice(0, 4)));
  // Second line part 
  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
      .append("path")
      .attr("class", d => "line2") //+ classify(d.name)
      .attr("stroke", d => colorScale(d.name))
      .attr("d", d => line(d.values.slice(3, d.values.length)));
    // console.log(values)
  var lastItem = d => d.values[d.values.length - 1];
  
  /*Add event listener for second line part
  var chart = document.querySelector("#line-chart");
  var line2 = document.getElementsByClassName("line2")
  chart.addEventListener("click", (e) => {
    for (let i = 0; i < 3; i++) {
      line2[i].classList.toggle("hidden");
    }
    console.log(line2[0].classList);
    //e.stopPropagation();
    //e.preventDefault();
})*/

  //Display final values
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
      .append("text")
      .attr("x", d => xScale(lastItem(d)[dateColumn]) + 10)
      .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
      .text(function(d) {
        var item = lastItem(d);
        var value = item[valueColumn];
        var label = value.toFixed(1) + " ft.";

        if (!isMobile.matches) {
          label = d.name + ": " + label;
        }

        return label;
      })
      .attr("class", d => classify(d.name))
      .call(wrapText, (margins.right - 10), 20);

  //Display annotations on side
  var annotations = chartElement
    .append("g")
    .attr("class", "annotations");
  
  config.data.forEach(function(level) {
    var pos = level.values[level.values.length - 1];
    var thisPos = [];
    switch(level.name) {
      case "High":
        // thisPos = { "x": pos[dateColumn], "y": pos[valueColumn] };
        thisPos = { "x": pos[dateColumn], "y": 13 };
        annotations.append("text")
          .text("Higher emissions")
          .attr("class", "high emissions")
          .attr("x", d => xScale(thisPos.x) - 20)
          .attr("y", d => yScale(thisPos.y));
        annotations.append("text")
          .text("and faster ice melt")
          .attr("class", "high ice")
          .attr("x", d => xScale(thisPos.x) - 20)
          .attr("y", d => yScale(thisPos.y) + 22);
        break;
      case "Low":
        // thisPos = { "x": pos[dateColumn], "y": pos[valueColumn] };
        thisPos = { "x": pos[dateColumn], "y": 1.25 };
        annotations.append("text")
          .text("Lower emissions")
          .attr("class", "low emissions")
          .attr("x", d => xScale(thisPos.x) - 20)
          .attr("y", d => yScale(thisPos.y));
        annotations.append("text")
          .text("and slower ice melt")
          .attr("class", "low ice")
          .attr("x", d => xScale(thisPos.x) - 20)
          .attr("y", d => yScale(thisPos.y) + 22);
        break;
    }
  });

}

/*
 setup
 */
//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    y = 2000 + y;
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }

  return series;
};

// Render the graphic(s)
var renderTemperatureChart = function(data) {
  var container = "#line-chart";
  // var element = chartSlide.querySelector(container);
  var width = window.innerWidth;
  var height = window.innerHeight;

  renderDotChart({
    container,
    width,
    height,
    data,
    dateColumn: "date",
    valueColumn: "amt",
    minWidth: 270,
    maxWidth: 1000
  });
};

// init
var setupChart = function() {
  console.log('chart set up')
  // var series = formatData(CHART_GALVESTON);
  // renderTemperatureChart(series);

  // window.addEventListener("resize", () => renderTemperatureChart(series));
}

//Initially load the graphic
// don't do anything if this doesn't exist on the page;
if (chartSlide) {
  window.addEventListener("load", setupChart);
}

module.exports = {
  setupChart
}
