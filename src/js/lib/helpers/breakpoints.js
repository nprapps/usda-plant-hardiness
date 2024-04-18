module.exports = {
  isMobile: window.matchMedia("(max-width: 500px)"),
  isDesktop: window.matchMedia("(min-width: 501px)"),
  isTablet: window.matchMedia("(min-width: 769px)")
};