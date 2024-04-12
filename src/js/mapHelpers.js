var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");

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

var legendConfigSeed = [{"zoneName":"1a"},{"zoneName":"1b"},{"zoneName":"1a"},{"zoneName":"2b"},{"zoneName":"2a"},{"zoneName":"3b"},{"zoneName":"3a"},{"zoneName":"4b"},{"zoneName":"4a"},{"zoneName":"5b"},{"zoneName":"5a"},{"zoneName":"6b"},{"zoneName":"6a"},{"zoneName":"7b"},{"zoneName":"7a"},{"zoneName":"8b"},{"zoneName":"8a"},{"zoneName":"9b"},{"zoneName":"9a"},{"zoneName":"10b"},{"zoneName":"10a"},{"zoneName":"11b"},{"zoneName":"11a"},{"zoneName":"12b"},{"zoneName":"12a"},{"zoneName":"13b"}]

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

async function getUserLocation() {
  if (navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      console.log(position)

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const userLocation = { latitude: latitude, longitude: longitude };
      console.log("User location:", userLocation);
      return userLocation;
    } catch (error) {
      if (error.code === error.PERMISSION_DENIED) {
        console.log("User denied the request for Geolocation.");
      } else {
        console.log("Geolocation error:", error.message);
      }
      return null;
    }
  } else {
    console.log("Geolocation is not supported by this browser.");
    return null;
  }
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




module.exports = {
  getUserLocation,
  compileLegendStyle,
  getLegendConfig,
  compileZoneLabelStyle,
  makePoint
}


