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

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile, isDesktop } = require("./lib/breakpoints");

var { getLegendConfig, legendColors } = require("./helpers/mapHelpers")
var legendConfig = getLegendConfig(legendColors)

// Render a line chart.
var renderDotChart = function(config) {
  // Setup
  var { dateColumn, valueColumn, selectedLocation } = config;

  // figure out chart dimensions and margins
  var margins = {
    top: 75,
    right: 100,
    bottom: 110,
    left: 100
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
  
//   // set up ticks and rounding
  var ticksX = 5;
  var ticksY = isMobile.matches ? 5 : 5;
  var roundTicksFactor = 5;

//   // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.data[0].values.map(d => d[dateColumn]);
  // var extent = [dates[0], dates[dates.length - 1]];
  var extent = [1990,2020]

  var xScale = d3
    .scaleLinear()
    .domain(extent)
    .range([0, chartWidth]);

  var values = config.data.reduce(
    (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
    []
  );

  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var min = Math.min.apply(null, floors);

//   if (min > 0) {
//     min = 0;
//   }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);

  
  var bucketArray = []
  for (var i = min+5; i < max+1; i+=5) {
    bucketArray.push(i)
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  let bandwidth = yScale(5) - yScale(10);

  console.log(selectedLocation)

//   var colorScale = d3
//     .scaleOrdinal()
//     .domain(
//       config.data.map(function(d) {
//         return d.name;
//       })
//     )
//     .range([
//       "#ff00ff",
//       "#00ff00",
//       "#ffff00"
//     ]);

//   // Render the HTML legend.
//   // var oneLine = config.data.length > 1 ? "" : " one-line";

//   // var legend = containerElement
//   //   .append("ul")
//   //   .attr("class", "key" + oneLine)
//   //   .selectAll("g")
//   //   .data(config.data)
//   //   .enter()
//   //   .append("li")
//   //   .attr("class", d => "key-item " + classify(d.name));

//   // legend.append("b").style("background-color", d => colorScale(d.name));

//   // legend.append("label").text(d => d.name);

//   // Create the root SVG element.

  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

//   // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    // .tickValues(tickValues)
    .tickFormat(function(d) {
      return d;
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d, i) {
      if (d == 0) {
        return d;
      } else {
        return d + " ºF";
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
  .attr("class","buckets")
  .selectAll("rect")
  .data(bucketArray)
  .enter()
    .append("rect")
    .attr("class","bucket zone ")
    .attr("fill",d => {
      return legendConfig.filter(q=>q.zoneMin == d)[0].color
    })
    .attr("x",xScale(1990))
    .attr("y",d => yScale(d))
    .attr("width",chartWidth)
    .attr("height",yScale(5)-yScale(10));

  // chartElement
  //   .append("g")
  //   .attr("class", "x grid")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(
  //     xAxisGrid()
  //       .tickSize(-chartHeight, 0, 0)
  //       .tickFormat("")
  //   );

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

// create the bucket grid



chartElement
  .append("g")
  .attr("class","dots")
  .selectAll("circle")
  .data(config.data[0].values)
  .enter()
    .append("circle")
    .attr("class","dot temperature ")
    .attr("fill","#fff")
    .attr("cx",d => {
      return xScale(d[dateColumn])
    })
    .attr("cy",d => yScale(d[valueColumn]))
    .attr("r",10)

  // render zone labels
  chartElement
  .append("g")
  .attr("class","zone-labels")
  .selectAll("text")
  .data(bucketArray)
  .enter()
    .append("text")
    .attr("class","text zone ")
    .attr("x",xScale(1990)+10)
    .attr("y",d => {
      return yScale(d) + bandwidth/2
    })
    .attr("dy",5)
    .text(d => {
      return legendConfig.filter(q=>q.zoneMin == d)[0].zoneName
    })

  chartElement
    .append("line")
    .attr("class", "avg-line")
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("y1", yScale(selectedLocation.temperatures.avg))
    .attr("y2", yScale(selectedLocation.temperatures.avg));

}

/*
 setup
 */
//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  series.push({
      name: 'temperatures',
      values: data.map((d,i) => ({
        date: i+1991,
        amt: d
      }))
    });
  console.log(series)

  return series;
};

// Render the graphic(s)
var renderTemperatureChart = function(data,selectedLocation) {
  var container = "#dot-chart";
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
    maxWidth: 1000,
    selectedLocation
  });
};

// init
var setupChart = function(selectedLocation) {
  console.log('chart set up')

  // get data
  var series = formatData(selectedLocation.temperatures.data);

  renderTemperatureChart(series,selectedLocation);

  window.addEventListener("resize", () => renderTemperatureChart(series,selectedLocation));
}

//Initially load the graphic
// don't do anything if this doesn't exist on the page;
// if (chartSlide) {
  // console.log('setupChart')
  // window.addEventListener("load", setupChart);
// }

module.exports = {
  setupChart
}
