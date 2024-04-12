var $ = require("./lib/qsa")
var {getUserLocation} = require("./mapHelpers");

var geoClick = function(selectedLocation,target) {
  target.dataset.clicked = true;

  // Set the next slide's dataset to the new place
  var nextSlide = target.nextElementSibling;
  console.log(nextSlide)
  nextSlide.dataset.center = JSON.stringify(selectedLocation.coords);

  // Change the zoom level
  nextSlide.dataset.zoom = 10;

  // deactivate the buttons?
  // var qBtns = target.querySelectorAll("button");
  // qBtns.forEach(function(btn) {
  //   btn.removeEventListener("click", onQuizButtonClicked);
  //   btn.disabled = true;
  // });

  // track click to GA????
  // track("quiz", target.id, this.dataset.status == "true" ? 1 : 0);

  // smoothscroll to the next slide AND flyto (this happens in the mapView)
  var nextSlide = document.getElementById(target.nextElementSibling.id);
  console.log(nextSlide)
  setTimeout(() => {
    nextSlide.scrollIntoView({ behavior: "smooth" })
  }, 1100);

  // update the DOM
  updateDom()

  // change flyto behavior to disable now that you've clicked? 
}

export function locateMeClick(evt,selectedLocation) {
  // get the parent container of this
  var target = evt.target.parentNode.parentNode.parentNode.parentNode.parentNode;

  // activate spinner
  $.one(".locator-text").classList.remove("active")
  $.one(".lds-ellipsis").classList.add("active")

  // get lat long
  getUserLocation().then(userLocation => {
    // Do something with userLocation   
    selectedLocation.coords = [userLocation.longitude,userLocation.latitude];
    
    // restore "locate me text"
    
    setTimeout(() => $.one(".locator-text").classList.add("active"), 1500);
    setTimeout(() => $.one(".lds-ellipsis").classList.remove("active"), 1500);

    return geoClick(selectedLocation,target);    
  });

}

export function surpriseClick(evt,selectedLocation) {

  // get the parent container of this
  var target = evt.target.parentNode.parentNode.parentNode.parentNode;

  // get random place
  var randomLngLat = [
    -90.5 + (Math.random() - 0.5) * 10,
    40 + (Math.random() - 0.5) * 10
  ]

  // Get place name from coords?

  // update master data
  selectedLocation.coords = randomLngLat;

  return geoClick(selectedLocation,target);
}

function updateDom() {
  // get all items that need to be updated

  // update them
}