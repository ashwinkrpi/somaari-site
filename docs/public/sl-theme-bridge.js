// Bridges somaari themes to Starlight. Load as a blocking classic script after themes.css and
// theme.js. somaari owns html[data-theme] (a theme id); scripts/postbuild.mjs renames Starlight's
// own [data-theme=light|dark] selectors to [data-sl-theme=...], which this file sets from the active
// theme's color-scheme, now and on every "somaari-theme" event from theme.js. Starlight puts
// <meta name="theme-color"> after theme.js, so this also copies --surface into it once the page
// has loaded.
(function () {
  "use strict";
  var root = document.documentElement;
  function sync() {
    var scheme = getComputedStyle(root).colorScheme || "";
    root.setAttribute("data-sl-theme", /dark/.test(scheme) && !/light/.test(scheme) ? "dark" : "light");
    var surface = getComputedStyle(root).getPropertyValue("--surface").trim();
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; surface && i < metas.length; i++) metas[i].setAttribute("content", surface);
  }
  sync();
  root.addEventListener("somaari-theme", sync);
  document.addEventListener("DOMContentLoaded", sync);
})();
