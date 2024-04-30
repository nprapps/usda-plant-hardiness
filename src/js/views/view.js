var $ = require("../lib/qsa");

module.exports = class View {
  constructor() {}

  enter(slide) {

    console.log(slide.id)
    if (slide.id == "intro-1" || slide.id == "titlecard") {
      $.one("#sticky-nav").classList.add("disabled");
    } else {
      $.one("#sticky-nav").classList.remove("disabled");
    }

    slide.classList.add("active");
    slide.classList.remove("exiting");


  }

  exit(slide, keep) {
    slide.classList.remove("active");
    slide.classList.add("exiting");
    setTimeout(() => slide.classList.remove("exiting"), 1000);
  }

  preload(slide, active,i) {
    var images = $("[data-src]", slide);
    images.forEach(function (img) {
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    });
  }
};
