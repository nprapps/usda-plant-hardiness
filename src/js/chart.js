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
  ...require("d3-interpolate/dist/d3-interpolate.min"),
  ...require("d3-arrow/dist/d3-arrow.min")
};

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile, isDesktop } = require("./lib/breakpoints");

var { getLegendConfig, legendColors } = require("./helpers/mapHelpers")
var legendConfig = getLegendConfig(legendColors)

var { labelConfig } = require("./helpers/chartHelpers")

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
  var ticksY = 5;
  var roundTicksFactor = 5;

//   // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.data[0].values.map(d => d[dateColumn]);
  // var extent = [dates[0], dates[dates.length - 1]];
  var extent = [1990,2022]

  // Render lines to chart.

  var curve = d3.curveBasis;

  var line = d3
    .line()
    .x(d=>d.x)
    .y(d=>d.y)
    .curve(curve);

  const arrow = d3.arrow5()
    .id("my-arrow")
    .attr("fill", "#fff")
    .attr("stroke", "#fff");

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
  var ticksY = ((max - min)/5)+1
  
  var bucketArray = []
  for (var i = min; i < max-5+1; i+=5) {
    bucketArray.push(i)
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  let bandHeight = yScale(5) - yScale(10);

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

  chartElement.call(arrow);

  chartElement.append("defs").html(`<defs>
    <filter id="f3" width="120" height="1020">
      <feOffset in="SourceAlpha" dx="2" dy="2" />
      <feGaussianBlur stdDeviation="2" />
      <feBlend in="SourceGraphic" in2="blurOut" />
    </filter>
  </defs>`)

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
    .tickFormat( d =>  d + " ºF");

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

  // create the bucket grid
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
    .attr("y",d => yScale(d+5))
    .attr("width",chartWidth)
    .attr("height",bandHeight);

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

chartElement
  .append("rect")
  .attr("class","bucket-outline previous")  
    .attr("x",xScale(1990))
    .attr("y",d => yScale(selectedLocation.zoneInfo.t2012) - bandHeight)
    .attr("width",chartWidth)
    .attr("height",bandHeight)
    .attr("fill",legendConfig.filter(q=>q.zoneName == selectedLocation.zoneInfo.z2012)[0].color)
    // .attr("filter","url(#f3)");

chartElement
  .append("rect")
  .attr("class","bucket-outline current")  
    .attr("x",xScale(1990))
    .attr("y",d => yScale(selectedLocation.zoneInfo.t2023) - bandHeight)
    .attr("width",chartWidth)
    .attr("height",bandHeight)
    .attr("fill",legendConfig.filter(q=>q.zoneName == selectedLocation.zoneInfo.z2023)[0].color)
    .attr("filter","url(#f3)");


chartElement
  .append("g")
  .attr("class","dots")
  .selectAll("circle")
  .data(config.data[0].values)
  .enter()
    .append("circle")
    .attr("class",(d,i) => {      
      var below = "";
      var superLow = "";
      if (d[valueColumn] < selectedLocation.zoneInfo.t2023) {
        below = 'below';
      }
      if (d[valueColumn]< -10) {
        superLow = 'superLow';
      }
      return `dot temperature ${below} ${superLow} i-${i}`
    })
    .attr("cx",d => {
      return xScale(d[dateColumn])
    })
    .attr("cy",d => yScale(d[valueColumn]))
    .attr("r",10)


  var maxItem = config.data[0].values.reduce((prev, current) => (prev && prev[valueColumn] > current[valueColumn]) ? prev : current)
  var maxLabelConfig = labelConfig(
    chartWidth,
    chartHeight,
    xScale(maxItem[dateColumn]),
    yScale(maxItem[valueColumn])
  )

  chartElement
    .append("path")
    .attr("class",`label-line`)
    .attr("stroke", "#fff")
    .attr("fill", "transparent")
    .attr("marker-end", "url(#my-arrow)")
    .attr("d",line(maxLabelConfig.arr))

  chartElement
    .append("text")
    .attr("class","label-max")
    .attr("x",maxLabelConfig.textOffset.x)
    .attr("y",maxLabelConfig.textOffset.y)
    .attr("dx",maxLabelConfig.xSide * 3)
    .attr("text-anchor",maxLabelConfig.xSide == 1 ? "start" : "end")
    .text(() => `Coldest night in ${maxItem[dateColumn]}`)

  chartElement
    .append("line")
    .attr("class", "avg-line")
    .attr("x1", -10)
    .attr("x2", chartWidth+10)
    .attr("y1", yScale(Math.round(selectedLocation.temperatures.avg)))
    .attr("y2", yScale(Math.round(selectedLocation.temperatures.avg)));

  // render zone labels
  chartElement
  .append("g")
  .attr("class","zone-labels")
  .selectAll("text")
  .data(bucketArray)
  .enter()
    .append("text")
    .attr("class","text zone ")
    .attr("x",isMobile.matches ? (chartWidth + 5) : xScale(2021))
    .attr("y",d => {
      return yScale(d) - bandHeight/2
    })
    .attr("dy",5)
    .attr("dx",isMobile.matches ? 20 : 5)
    .text(d => {
      return legendConfig.filter(q=>q.zoneMin == d)[0].zoneName
    })

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
  // window.addEventListener("load", dr);
// }

module.exports = {
  setupChart
}
