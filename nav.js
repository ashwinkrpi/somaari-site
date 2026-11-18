// Phone menu: the header's menu button opens the drawer (#site-drawer). Without this script the links
// just stay visible in the header. Keyboard: Enter/Space on the button, Escape closes and returns focus
// to the button, Tab stays inside the open drawer, and choosing a link closes it.
(function () {
  var button = document.getElementById("menu-toggle");
  var drawer = document.getElementById("site-drawer");
  if (!button || !drawer) return;
  var root = document.documentElement;
  var wide = window.matchMedia("(min-width: 48rem)");
  root.classList.add("nav-js");

  function focusable() {
    return Array.prototype.slice.call(drawer.querySelectorAll("a[href], button:not([disabled])"));
  }
  function open() {
    root.classList.add("nav-open");
    button.setAttribute("aria-expanded", "true");
    var first = focusable()[0];
    if (first) first.focus();
  }
  function close(returnFocus) {
    root.classList.remove("nav-open");
    button.setAttribute("aria-expanded", "false");
    if (returnFocus) button.focus();
  }
  function isOpen() { return root.classList.contains("nav-open"); }

  button.addEventListener("click", function () { if (isOpen()) close(true); else open(); });
  drawer.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("a")) close(false);
  });
  document.addEventListener("click", function (e) {
    if (isOpen() && !drawer.contains(e.target) && !button.contains(e.target)) close(false);
  });
  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") { e.preventDefault(); close(true); return; }
    if (e.key !== "Tab") return;
    var items = focusable().concat([button]);
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // Growing to a desktop width closes the drawer.
  var onChange = function () { if (wide.matches && isOpen()) close(false); };
  if (wide.addEventListener) wide.addEventListener("change", onChange); else wide.addListener(onChange);
})();
