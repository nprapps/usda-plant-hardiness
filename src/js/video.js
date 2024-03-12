var $ = require("./lib/qsa");
var track = require("./lib/tracking");
// var flags = require("./flags");
var here = new URL(window.location.href);
var renderPlatform = here.searchParams.get("renderPlatform");
var flags = {
  autoplay: true,
  isOne: renderPlatform && renderPlatform.match(/nprone/i)
};

var autoplayers = $("video[autoplay]");

// Uncomment if there's weird flashing in Chrome
// autoplayers.forEach(function(video) {
//   video.addEventListener("timeupdate", function(e) {
//     if (video.currentTime > video.duration - .3) {
//       video.currentTime = .2;
//     }
//   })
// });

// handle accessibility toggles
var autoplayChecks = $(".a11y-controls input");

var toggleAutoplay = function (enable, trackThis) {
  if (trackThis) {
    track("autoplay-toggle", enable);
  }
  autoplayChecks.forEach(a => a.checked = enable);
  if (enable) {
    autoplayers.forEach(function (video) {
      video.setAttribute("autoplay", "");
      if (!video.paused || flags.isOne) return;
      var promised = video.play();
      // ignore DOMExceptions for playback, they can get tripped up by the lazy load
      if (promised) promised.catch(err => err);
    });
  } else {
    autoplayers.forEach(function (video) {
      video.removeAttribute("autoplay");
      video.pause();
    });
  }
};

autoplayChecks.forEach(a => a.checked = flags.autoplay);

autoplayChecks.forEach(a => a.addEventListener("change", e =>
  toggleAutoplay(e.target.checked, true)
));

var reducedMotion = window.matchMedia("(prefers-reduced-motion)");
if ("addEventListener" in reducedMotion) {
  reducedMotion.addEventListener("change", () =>
    toggleAutoplay(!reducedMotion.matches)
  );
} else {
  reducedMotion.addListener(() => toggleAutoplay(!reducedMotion.matches));
}
if (autoplayChecks[0]) {
  toggleAutoplay(!reducedMotion.matches && autoplayChecks[0].checked);
}

track("prefers-reduced-motion", reducedMotion.matches);
