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
  var response = await fetch(url, { cache: "no-cache" });
  var json = await response.json();  
  return json;
}

var formatTemperatures = function(data) {
  return data.replaceAll(","," ")
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
  // console.log(fileRowNum)
  var maxFileY = 15;
  var maxFileX = 35;
  // var fileRowMax = 

  var inBounds = true;
  if (fileY < 0 || fileY > maxFileY || fileX < 0 || fileX > maxFileX) {
    inBounds = false;
    console.log(inBounds)
  } 


  // only get data if the data is a new file
  if (fileName != tempData.fileName && inBounds) {
    var url = `./assets/synced/json/minTmin/${fileName}.json`
    console.log(url)
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
  var zoneID = (avgfloor/5)+12;
  var zone = Math.floor((zoneID/2)+1);
  var halfZone = zoneID % 2 == 0 ? "a" : "b";
  var countBelow = data.filter(e => e < zone);
  var countAbove = data.filter(e => e > zone+5);

  var thisCellData = {
        "data":data,
        "avg": avg,
        "zone": `${zone}${halfZone}`,
        "countBelow": countBelow.length,
        "countAbove": countAbove.length
      }

  return thisCellData
}    



module.exports = {
  getTemps,
  getData,
  formatTemperatures
}
