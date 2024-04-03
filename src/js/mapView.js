var $ = require("./lib/qsa");
var View = require("./view"); //from Ruth
var debounce = require("./lib/debounce"); //from Ruth
var { isMobile } = require("./lib/breakpoints");

module.exports = class MapView extends View {
  constructor(map) {
    super();
    this.map = map;
    this.onMapScroll = debounce(onMapScroll, 50);
  }


};