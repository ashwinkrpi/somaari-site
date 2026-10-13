// Demo loops on the app cards (<video class="card-demo">). Sources sit in data-src, so nothing
// downloads up front: a video loads and plays only when its card nears the viewport, and pauses
// when it scrolls away. With prefers-reduced-motion: reduce it never loads (poster only), and
// switching that setting on while the page is open unloads any loaded video back to its poster.
// Without JS (or IntersectionObserver) the poster simply stays.
(() => {
  const videos = Array.from(document.querySelectorAll("video.card-demo"));
  if (!videos.length || !("IntersectionObserver" in window)) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const near = new Set();

  const load = (v) => {
    if (v.dataset.loaded) return;
    v.querySelectorAll("source[data-src]").forEach((s) => { s.src = s.dataset.src; });
    v.muted = true;
    v.load();
    v.dataset.loaded = "1";
  };

  const unload = (v) => {
    if (!v.dataset.loaded) return;
    v.pause();
    v.querySelectorAll("source[data-src]").forEach((s) => { s.removeAttribute("src"); });
    v.load(); // back to the poster
    delete v.dataset.loaded;
  };

  const update = (v) => {
    if (reduce.matches) { unload(v); return; }
    if (!near.has(v)) { v.pause(); return; }
    load(v);
    const p = v.play();
    if (p) p.catch(() => {}); // autoplay refused: the poster stays
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) near.add(e.target); else near.delete(e.target);
      update(e.target);
    });
  }, { rootMargin: "150px 0px" });

  // Start after the page has loaded, so the loops never compete with first paint.
  const start = () => videos.forEach((v) => io.observe(v));
  if (document.readyState === "complete") start(); else window.addEventListener("load", start, { once: true });

  reduce.addEventListener("change", () => videos.forEach(update));
})();
