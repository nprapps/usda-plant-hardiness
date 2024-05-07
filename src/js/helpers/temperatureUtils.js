var tempData = {fileName:null,data:null};

var rasterFacts = {
  "uly":49.93749999999975,
  "ulx":-125.02083333333336,
  "yres":-0.0416666666667,
  "xres":0.0416666666667,
  "c":40
};

const average = array => array.reduce((a, b) => a + b) / array.length;

var {uly, ulx, yres, xres, c} = rasterFacts;

var getData = async function(url) {
  var response = await fetch(url, { cache: "force-cache" });
  var json = await response.json();  
  return json;
}

var formatTemperatures = function(data) {
  return data.replaceAll(","," ")
}

var getAndParseTemps = async function(selectedLocation) {
   var altLocation = {};
  var lngLat = {};

  if (selectedLocation.placeState != "AK" && selectedLocation.placeState != "HI") {
    selectedLocation.temperatures = await getTemps({
      "lng":selectedLocation.coords[0],
      "lat":selectedLocation.coords[1]
    });    
  }

  // get temps for chart, if they're alaska, hawaii, or continental us
  else if (selectedLocation.placeState == "AK") {
    var AKArr = [-16,-22,-14,-15,-14,-21,-11,-28,-10,2,-15,-2,-18,-8,-11,-17,-15,-24,-8,-12,-15,-12,-11,-5,-8,-15,-2,-7,-11,-3];

    selectedLocation.temperatures =  {
      "data":AKArr,
      "avg": -12.26,
      "zone": "5b",
      "countBelow": "TK",
      "countAbove": "TK",
      "placeName":"Anchorage, Alaska"
    }

    // altLocation.temperatures = selectedLocation.temperatures;

    var temp2012 = -20;
    var temp2023 = -15;

    altLocation.zoneInfo = {
      "t2012":temp2012,
      "t2023":temp2023,
      "z2012":temp2zone(temp2012),
      "z2023":temp2zone(temp2023),
      "zDiff":((temp2023 - temp2012)/5)
    }

    selectedLocation.alt = {
      "state":"AK",
      "zoneInfo":altLocation.zoneInfo
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

    // altLocation.temperatures = selectedLocation.temperatures;

    var temp2012 = 50;
    var temp2023 = 55;

    altLocation.zoneInfo = {
      "t2012":temp2012,
      "t2023":temp2023,
      "z2012":temp2zone(temp2012),
      "z2023":temp2zone(temp2023),
      "zDiff":((temp2023 - temp2012)/5)
    }

    selectedLocation.alt = {
      "state":"HI",
      "zoneInfo":altLocation.zoneInfo
    }
  }
  return selectedLocation;
}

// // Lat lon -> 
var getTemps = async function(lngLat) {
  //bigNested[y][x]?
  //bigNested[181][1290] #boston?
  //bigNested[590][1068] #near miami
  
  //Boston: 42.3408361917018, -71.07106041262733
  //y is lat
  //x is lon
  var x = lngLat.lng
  var y = lngLat.lat
  var rowNum = (uly-y)/yres
  var colNum = (ulx-x)/xres

  var adjustedRowNum = parseInt(-Math.ceil(rowNum))
  var adjustedColNum = parseInt(-Math.ceil(colNum))

  // //Convert rows/columns to filenumber
  var fileY = Math.floor(adjustedRowNum / c)
  var fileX = Math.floor(adjustedColNum / c)
  var fileName = `${(('00'+fileY).slice(-2))}_${(('00'+fileX).slice(-2))}`

  // //get file
  var fileRowNum = adjustedRowNum - (fileY*c)
  var fileColNum = adjustedColNum - (fileX*c)

  var maxFileY = 15;
  var maxFileX = 35;
  // var fileRowMax = 

  var inBounds = true;
  if (fileY < 0 || fileY > maxFileY || fileX < 0 || fileX > maxFileX) {
    inBounds = false;

  } else {
    // only get data if the data is a new file
    if (fileName != tempData.fileName && inBounds) {
      var url = `./assets/synced/json/minTmin/${fileName}.json`

      // // get data    
      var promise = await Promise.all([getData(url)]);
      tempData = {
        "fileName":fileName,
        "data":promise[0]
      }
    }

    var data = tempData.data[fileRowNum][fileColNum];

    var avg = average(data);
    var avgfloor = Math.floor(avg/5)*5;
    var countBelow = data.filter(e => e < avgfloor);
    var countAbove = data.filter(e => e > avgfloor+5);
    var thisCellData = {
          "data":data,
          "avg": avg,
          "zone": temp2zone(avgfloor),
          "countBelow": countBelow.length,
          "countAbove": countAbove.length
        }
    return thisCellData
  }
  
}

function temp2zone(temperature) {
  if (temperature == "Loading") {
    return "Loading"
  } else {
    var num = (temperature / 5) + 12;
    var letter = num % 2 == 0 ? "a" : "b"
    return `${Math.floor(num/2)+1}${letter}`;  
  }
}

module.exports = {
  getTemps,
  getData,
  formatTemperatures,
  temp2zone,
  getAndParseTemps
}
