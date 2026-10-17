// Demo player for the app cards. Each card shows a still poster; its "Watch demo" button (hidden
// until this script runs) opens the <dialog id="demo-dialog">. The loop from
// /assets/demos/<data-demo>/ loads and plays when the dialog opens, except with
// prefers-reduced-motion: reduce, where the dialog shows the poster and loads nothing until Play;
// turning that setting on pauses it. Closing the dialog (Close, Esc or a click on the backdrop)
// unloads the video and puts focus back on the button.
// Without JS (or <dialog>) the posters simply stay.
(() => {
  const dialog = document.getElementById("demo-dialog");
  const buttons = Array.from(document.querySelectorAll("button.demo-open"));
  if (!dialog || typeof dialog.showModal !== "function" || !buttons.length) return;

  const video = document.getElementById("demo-video");
  const title = document.getElementById("demo-dialog-title");
  const toggle = document.getElementById("demo-toggle");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let opener = null, dir = "";

  const showState = () => { toggle.textContent = video.paused ? "Play" : "Pause"; };
  // Sources are added only when the loop is about to play, so nothing downloads before that.
  const play = () => {
    if (!video.querySelector("source")) {
      for (const [file, type] of [["loop.webm", "video/webm"], ["loop.mp4", "video/mp4"]]) {
        const source = document.createElement("source");
        source.src = dir + file;
        source.type = type;
        video.appendChild(source);
      }
      video.muted = true;
      video.load();
    }
    const p = video.play();
    if (p) p.catch(showState);
  };

  const open = (button) => {
    dir = `/assets/demos/${button.dataset.demo}/`;
    title.textContent = `${button.dataset.title} demo`;
    video.setAttribute("aria-label", `${button.dataset.title} demo, no sound`);
    video.poster = `${dir}poster.webp`;
    opener = button;
    dialog.showModal();
    toggle.focus();
    if (!reduce.matches) play();
    showState();
  };

  dialog.addEventListener("close", () => {
    video.pause();
    video.querySelectorAll("source").forEach((s) => s.remove());
    video.removeAttribute("poster");
    video.load(); // drops the loaded video
    showState();
    if (opener) opener.focus();
    opener = null;
  });

  // A click on the backdrop lands on the <dialog> itself; clicks inside land on its children.
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  document.getElementById("demo-close").addEventListener("click", () => dialog.close());
  toggle.addEventListener("click", () => { if (video.paused) play(); else video.pause(); });
  video.addEventListener("play", showState);
  video.addEventListener("pause", showState);
  reduce.addEventListener("change", () => { if (reduce.matches) video.pause(); });

  buttons.forEach((b) => {
    b.hidden = false;
    b.addEventListener("click", () => open(b));
  });
})();
