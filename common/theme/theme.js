// somaari themes: picker and seasonal default theme, shared by every themed somaari app (see
// docs/THEME_SPEC.md). Load it as a blocking classic script in <head> (not a module, not deferred),
// so data-theme is set before first paint and there is no flash of the wrong theme. The colours and
// fonts live in themes.css (shared tokens) and in each app's own stylesheet.
//
// Which theme shows: ?theme=<id> in the URL (a preview, never saved), else the saved choice, else
// the date schedule below. Choosing "Auto (seasonal)" clears the saved choice.
//
// The choice is saved in localStorage. On somaari.in and its subdomains it is also saved in a
// cookie for the whole domain, so a choice made on one site (say docs.somaari.in) carries over to
// the others; the cookie wins over localStorage, and "auto" in it means "no saved choice".
//
// Every time a theme is applied, <html> gets a "somaari-theme" event (detail: { id }), for app code
// that needs more than CSS (somaari-site swaps its per-theme screenshots this way).
(function () {
  "use strict";

  // color: <meta name="theme-color">. label: the picker's radio label.
  var THEMES = {
    "rangoli": { color: "#FBC96B", label: "Rangoli" },
    "monsoon": { color: "#E3EBEE", label: "Monsoon" },
    "pi-console": { color: "#0D120F", label: "Pi Console" },
    "liquid-glass": { color: "#0A0E1C", label: "Liquid Glass" }
  };
  var DEFAULT_THEME = "rangoli";

  // Seasonal defaults, checked in order using the date in India (Asia/Kolkata). Add festivals here:
  //   { from: "YYYY-MM-DD", to: "YYYY-MM-DD", theme: "<id>" }  one-off dates, inclusive
  //   { monthDay: ["MM-DD", "MM-DD"], theme: "<id>" }          every year, inclusive
  // Remove one-off entries once their dates have passed (and the theme too, if nothing else uses it).
  var SCHEDULE = [];

  var IST_OFFSET_MS = 330 * 60 * 1000; // UTC+5:30; India has no daylight saving

  // The schedule's theme for the instant `date`, judged by the calendar day in India.
  function getDefaultTheme(date) {
    var ymd = new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
    var md = ymd.slice(5);
    for (var i = 0; i < SCHEDULE.length; i++) {
      var e = SCHEDULE[i];
      if (e.from && ymd >= e.from && ymd <= e.to) return e.theme;
      if (e.monthDay) {
        var a = e.monthDay[0], b = e.monthDay[1];
        if (a <= b ? md >= a && md <= b : md >= a || md <= b) return e.theme; // b < a wraps the new year
      }
    }
    return DEFAULT_THEME;
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { THEMES: THEMES, SCHEDULE: SCHEDULE, DEFAULT_THEME: DEFAULT_THEME, getDefaultTheme: getDefaultTheme };
    return;
  }

  var STORAGE_KEY = "somaari-theme";
  var root = document.documentElement;

  function isTheme(id) { return Object.prototype.hasOwnProperty.call(THEMES, id); }

  // On somaari.in (and its subdomains) the choice is also kept in a cookie for the whole domain.
  var COOKIE_DOMAIN = /(^|\.)somaari\.in$/.test(location.hostname) ? "somaari.in" : null;

  function readCookie() {
    if (!COOKIE_DOMAIN) return null;
    try {
      var m = document.cookie.match(/(?:^|;\s*)somaari-theme=([^;]*)/);
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }

  function writeCookie(value) {
    if (!COOKIE_DOMAIN) return;
    try {
      document.cookie = STORAGE_KEY + "=" + encodeURIComponent(value) + "; Domain=" + COOKIE_DOMAIN +
        "; Path=/; Max-Age=34560000; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
    } catch (e) { /* cookies blocked: localStorage still remembers it for this site */ }
  }

  function readSaved() {
    var c = readCookie();
    if (c !== null) return isTheme(c) ? c : null; // "auto" (or a removed theme): no saved choice
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return isTheme(v) ? v : null;
    } catch (e) { return null; }
  }

  function save(id) {
    writeCookie(id || "auto");
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id); else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* storage blocked: the choice lasts for this page view only */ }
  }

  function readPreview() {
    try {
      var v = new URLSearchParams(location.search).get("theme");
      return isTheme(v) ? v : null;
    } catch (e) { return null; }
  }

  function apply(id) {
    root.setAttribute("data-theme", id);
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", THEMES[id].color);
    var ev;
    try { ev = new CustomEvent("somaari-theme", { detail: { id: id } }); } catch (e) { return; }
    root.dispatchEvent(ev);
  }

  // One radio per choice, appended to the picker's <fieldset> (after its <legend>).
  function addChoices(fieldset) {
    var ids = ["auto"].concat(Object.keys(THEMES));
    for (var i = 0; i < ids.length; i++) {
      var label = document.createElement("label");
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "theme-choice";
      input.value = ids[i];
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + (ids[i] === "auto" ? "Auto (seasonal)" : THEMES[ids[i]].label)));
      fieldset.appendChild(label);
    }
  }

  var preview = readPreview();
  var saved = readSaved();
  apply(preview || saved || getDefaultTheme(new Date()));

  // The app's markup: #theme-picker (hidden) > button#appearance-toggle + #appearance-menu > fieldset.
  document.addEventListener("DOMContentLoaded", function () {
    var picker = document.getElementById("theme-picker");
    if (!picker) return;
    var fieldset = picker.querySelector("fieldset");
    if (fieldset) addChoices(fieldset);
    // The choices are radio buttons inside #theme-picker, valued "auto" or a theme id.
    var choices = picker.querySelectorAll("input[type=radio]");
    var current = preview || saved || "auto";
    for (var i = 0; i < choices.length; i++) choices[i].checked = choices[i].value === current;
    picker.hidden = false; // the picker needs JS, so it stays hidden without it

    picker.addEventListener("change", function (e) {
      var id = isTheme(e.target.value) ? e.target.value : null;
      save(id);
      apply(id || getDefaultTheme(new Date()));
      // A choice replaces any ?theme= preview, so it is what shows after a reload.
      if (preview) {
        preview = null;
        try {
          var url = new URL(location.href);
          url.searchParams.delete("theme");
          history.replaceState(null, "", url);
        } catch (e) { /* leave the URL as it is */ }
      }
    });

    // Popover: the toggle button opens the choices and focuses the checked one. Esc closes it and
    // returns focus to the button; so does a click outside, or tabbing out of it.
    var toggle = document.getElementById("appearance-toggle");
    var menu = document.getElementById("appearance-menu");
    if (!toggle || !menu) return;

    function setOpen(open, refocus) {
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      if (open) (menu.querySelector("input:checked") || menu.querySelector("input")).focus();
      else if (refocus) toggle.focus();
    }
    toggle.addEventListener("click", function () { setOpen(menu.hidden, false); });
    picker.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { e.preventDefault(); setOpen(false, true); }
    });
    picker.addEventListener("focusout", function (e) {
      if (!menu.hidden && e.relatedTarget && !picker.contains(e.relatedTarget)) setOpen(false, false);
    });
    document.addEventListener("click", function (e) {
      if (!menu.hidden && !picker.contains(e.target)) setOpen(false, false);
    });
  });
})();
