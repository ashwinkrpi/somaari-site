// Starts the Pagefind search UI on /search/ (the index is built by `pagefind --site dist` in npm run build).
// A ?q= in the URL runs that search straight away.
window.addEventListener("DOMContentLoaded", function () {
  if (typeof PagefindUI === "undefined") return;
  var ui = new PagefindUI({ element: "#search", showSubResults: true, showImages: false, resetStyles: false });
  var q = new URLSearchParams(location.search).get("q");
  if (q) ui.triggerSearch(q);
});
