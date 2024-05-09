var $ = require("../lib/qsa");

var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");

var {temp2zone} = require("./temperatureUtils");

var tileSets = 0;

var legendColors = [
  "#D6D6FD",
  "#c4c4f0", 
  "#DCBAF4", 
  "#DFACF0", 
  "#E29EEC", 
  "#E691E8", 
  "#9C82E8", 
  "#5274E8", 
  "#4B87B8", 
  "#459A89", 
  "#3FAD5A", 
  "#69B764", 
  "#93C16F", 
  "#BDCB79", 
  "#E7D684", 
  "#E4C471", 
  "#E2B35E", 
  "#E0A24B", 
  "#D38643", 
  "#C66A3B", 
  "#B94E33", 
  "#AD332C", 
  "#972A22", 
  "#822218", 
  "#6D1A0E", 
  "#581205"
]

// https://rampgenerator.com/?unique_colors=3&steps=17&step_color%5B1%5D=%233f4e6f&at_step%5B1%5D=1&step_color%5B2%5D=%23ffffff&at_step%5B2%5D=9&step_color%5B3%5D=%23c73800&at_step%5B3%5D=16&min_value=-8&max_value=8&decimals=0&opacity=1&col=COLUMN_NAME&null_color=%23EEEEEE&legend_labels=&legendContainer_css=width%3A+86px%3B%0D%0Abackground%3A+%23fff%3B%0D%0Aborder%3A+1px+solid+%23000%3B%0D%0Aborder-radius%3A10px%3B%0D%0Amargin-top%3A10px%3B%0D%0Apadding%3A10px%3B%0D%0Adisplay%3A+grid%3B%0D%0Agrid-template-columns%3A+25px+50px%3B&legendColor_css=display%3A+inline-grid%3B%0D%0Awidth%3A20px%3B%0D%0Aheight%3A14px%3B&legendLabel_css=display%3A+inline-grid%3B%0D%0Afont-size%3A9px%3B%0D%0Aline-height%3A0%3B%0D%0Amargin-top%3A6px%3B&units=%C2%B0C&default_tab=TABLE&ssn=1&updated=1

var tempDiffColors = [
"#3F4E6F",
"#576481",
"#6F7A93",
"#8790A5",
"#9FA6B7",
"#B7BCC9",
"#CFD2DB",
"#E7E8ED",
"#FFFFFF",
"#F8E6DF",
"#F1CDBF",
"#EAB49F",
"#E39B7F",
"#DC825F",
"#D5693F",
"#CE501F",
"#C73800"
]

var legendConfigSeed = [
{"zoneName":"1a"},
{"zoneName":"1b"},
{"zoneName":"2a"},
{"zoneName":"2b"},
{"zoneName":"3a"},
{"zoneName":"3b"},
{"zoneName":"4a"},
{"zoneName":"4b"},
{"zoneName":"5a"},
{"zoneName":"5b"},
{"zoneName":"6a"},
{"zoneName":"6b"},
{"zoneName":"7a"},
{"zoneName":"7b"},
{"zoneName":"8a"},
{"zoneName":"8b"},
{"zoneName":"9a"},
{"zoneName":"9b"},
{"zoneName":"10a"},
{"zoneName":"10b"},
{"zoneName":"11a"},
{"zoneName":"11b"},
{"zoneName":"12a"},
{"zoneName":"12b"},
{"zoneName":"13a"},
{"zoneName":"13b"}]

function getLegendConfig(legendColors) {
  var legendConfig = legendConfigSeed.map((d,i)=>{
    return {
      "zoneName":d.zoneName,
      "color":legendColors[i],
      "zoneMin": (i*5)-60
    }
  })
  return legendConfig;
}

function compileLegendStyle(layer) {
  var legendConfig = getLegendConfig(legendColors)
  var colorCombos = ["step", ["get", layer],legendConfig[0].color];
  legendConfig.forEach((zone,i) => {
    // skip the first one
    if (i > 0) {
      // add each zoneMin
      colorCombos.push(zone.zoneMin)
      // add each color
      colorCombos.push(zone.color)
    }
  })
  return colorCombos
}

function compileTempDiffStyle() {
  var arr = ["step",["get", "temp_diff"]];

  var defaultColor = "#000"
  
  arr.push(defaultColor)

  for (var i = 0; i < tempDiffColors.length; i++) {
    arr.push(i-8)
    arr.push(tempDiffColors[i])
  }
  

  
  return arr;
}

function compileZoneLabelStyle(layer) {
  return [
            "case",
            ["==",["get",layer], -60], "zones:z1a",
            ["==",["get",layer], -55], "zones:z1b",
            ["==",["get",layer], -50], "zones:z2a",
            ["==",["get",layer], -45], "zones:z2b",
            ["==",["get",layer], -40], "zones:z3a",
            ["==",["get",layer], -35], "zones:z3b",
            ["==",["get",layer], -30], "zones:z4a",
            ["==",["get",layer], -25], "zones:z4b",
            ["==",["get",layer], -20], "zones:z5a",
            ["==",["get",layer], -15], "zones:z5b",
            ["==",["get",layer], -10], "zones:z6a",
            ["==",["get",layer], -5], "zones:z6b",
            ["==",["get",layer], 0], "zones:z7a",
            ["==",["get",layer], 5], "zones:z7b",
            ["==",["get",layer], 10], "zones:z8a",
            ["==",["get",layer], 15], "zones:z8b",
            ["==",["get",layer], 20], "zones:z9a",
            ["==",["get",layer], 25], "zones:z9b",
            ["==",["get",layer], 30], "zones:z10a",
            ["==",["get",layer], 35], "zones:z10b",
            ["==",["get",layer], 40], "zones:z11a",
            ["==",["get",layer], 45], "zones:z11b",
            ["==",["get",layer], 50], "zones:z12a",
            ["==",["get",layer], 55], "zones:z12b",
            ["==",["get",layer], 60], "zones:z13a",
            ["==",["get",layer], 65], "zones:z13b",
            "zones:z13b"
          ]
}

function makePoint(coords) {
  return {
    'type': 'FeatureCollection',
    'features': [
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': coords
        }
      }
    ]
  };
}

function getZone(zonesData) {  
  try {
    var temp2012 = zonesData.filter(d=>d.sourceLayer=="2012_zones")[0].properties["2012_zone"];  
  } catch(err) {
    var temp2012 = "Loading";
  }
  
  try {
    var temp2023 = zonesData.filter(d=>d.sourceLayer=="2023_zones")[0].properties["2023_zone"];  
  } catch(err) {
    var temp2023 = "Loading";
  }
  
  var obj = {
    "t2012":temp2012,
    "t2023":temp2023,
    "z2012":temp2zone(temp2012),
    "z2023":temp2zone(temp2023),
    "zDiff":(temp2012 == "Loading" || temp2023 == "Loading") ? "Loading" : ((temp2023 - temp2012)/5)
  }
  return obj
}

function getStartingCoords() {
  // Get the timezone offset in minutes
  const offset = new Date().getTimezoneOffset();  
  // Convert offset to hours
  const offsetHours = offset / 60;
  var latLng;

  switch(true) {
    case offsetHours <= 4:
      // east coast and europe
      latLng = [-79.195,37.01]
      break;
    case offsetHours == 5:
      // central
      latLng = [-94.474,38.90]
      break;
    case offsetHours == 6:
      // mountain
      latLng = [-110.646,40.99]
      break;
    case offsetHours >= 7:
      // west coast and pacific
      latLng = [-120.92,38.603]
      break;
  }

  return latLng;
}

// Check if a layer exists
function layerExists(map,layerId) {
  if (map) {
    var style = map.getStyle();
    if (!style || !style.layers) return false;
    return style.layers.some(function(layer) {
        return layer.id === layerId;
    });
  } else {
    console.log("error in layerExist: no map")
  }
}

function addLayerFunction(map,id,style=false){
  var zoneOpacity, labelsOpacity, tempDiffOpacity;
  if (style) {
    zoneOpacity = [
            'interpolate',
            ['linear'],
            ['zoom'],
              0, 1, // Fill opacity of 1 for zoom levels 0 through 7
              7, 1, // Fill opacity of 1 for zoom levels 0 through 7
              8, 0.78, // Fill opacity of 0.5 from zoom level 8 onwards
              22, 0.78 // Fill opacity of 0.5 from zoom level 8 through 22
          ];
    labelsOpacity = 0.5;
    tempDiffOpacity = 0.7;
  } else {
    zoneOpacity = 0;
    labelsOpacity = 0;
    tempDiffOpacity = 0;
  }

  if (id == "2012_zones") {
    if (!layerExists(map,'2012_zones')) {
      map.addLayer({
        'id': '2012_zones',
        'source': 'usda_zones',
        'source-layer': '2012_zones',
        'type': 'fill',
        'layout':{
          'visibility':'visible'
        },
        'paint': {
          "fill-color": [
          "case",
          ["==", ["get", "2012_zone"], null],
          "#aaffff",compileLegendStyle("2012_zone")          
          ],
          "fill-opacity": zoneOpacity
        }      
      },
      // This line is the id of the layer this layer should be immediately below
      "Water")
    }

    if (!layerExists(map,'2012_zones_labels')) {
      map.addLayer({
        'id': '2012_zones_labels',
        'source': 'usda_zones',
        'source-layer': '2012_zones',
        'type': 'fill',
        'layout':{
          'visibility':'visible'
        },
        "minzoom": 8,
        'paint': {
          "fill-color": "rgba(255, 255, 0, 1)",
          "fill-pattern": compileZoneLabelStyle("2012_zone"),
          "fill-opacity": labelsOpacity,
          
        }      
      },"Water")
    }
  }

  if (id == "2023_zones") {
    if (!layerExists(map,'2023_zones')) {
      map.addLayer({
        'id': '2023_zones',      
        'source': 'usda_zones',
        'source-layer': '2023_zones',
        'type': 'fill',
        'layout':{
          'visibility':'visible'
        },
        'paint': {
          "fill-color": [
          "case",
          ["==", ["get", "2023_zone"], null],
          "#aaffff",compileLegendStyle("2023_zone")
          ],
          "fill-opacity": zoneOpacity
        }      
      },"Water")
    }
    if (!layerExists(map,'2023_zones_labels')) {
      map.addLayer({
        'id': '2023_zones_labels',
        'source': 'usda_zones',
        'source-layer': '2023_zones',
        'type': 'fill',
        'layout':{
          'visibility':'visible'
        },
        "minzoom": 8,
        'paint': {
          "fill-color": "rgba(255, 255, 0, 1)",
          "fill-pattern": compileZoneLabelStyle("2023_zone"),
          "fill-opacity": labelsOpacity
        }      
      },"Water")      
    }
  }

  if (id == "temp_diff_layer" && !layerExists(map,"temp_diff_layer")) {
    map.addLayer({
      'id': 'temp_diff_layer',
      'source': 'temp_diff',
      'source-layer': 'temp_diffgeojsonl',
      'minZoom':8,
      'type': 'fill',
      'layout':{
        'visibility':'visible'
      },
      'paint': {
        "fill-color": [
        "case",
        ["==", ["get", "temp_diff"], null],
        "#aaffff",compileTempDiffStyle()         
        ],
        "fill-opacity": tempDiffOpacity,
        "fill-outline-color":"rgba(255,255,255,0)"
      }      
    },"Water")
  }
}

module.exports = {
  compileLegendStyle,
  getLegendConfig,
  compileZoneLabelStyle,
  compileTempDiffStyle,
  makePoint,
  getZone,
  legendColors,
  getStartingCoords,
  layerExists,
  addLayerFunction
}


