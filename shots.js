// Detail page screenshots with one image per theme (built by scripts/build-docs.mjs) are marked
// data-shots, carry each theme's path in data-shot-<id> and have no src, so only the shown theme's
// image is downloaded. This sets src for the current theme, and again whenever theme.js applies
// another ("somaari-theme" event). Without JS the <noscript> copy next to it shows the default theme's.
(function () {
  "use strict";

  function showShots(id) {
    var imgs = document.querySelectorAll("img[data-shots]");
    for (var i = 0; i < imgs.length; i++) {
      var src = imgs[i].getAttribute("data-shot-" + id);
      if (src && imgs[i].getAttribute("src") !== src) imgs[i].setAttribute("src", src);
    }
  }

  var root = document.documentElement;
  showShots(root.getAttribute("data-theme"));
  root.addEventListener("somaari-theme", function (e) { showShots(e.detail.id); });
})();
