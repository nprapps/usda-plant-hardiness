var maplibregl = require("maplibre-gl/dist/maplibre-gl.js");

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




module.exports = {
  getUserLocation
}


