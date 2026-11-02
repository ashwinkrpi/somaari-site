// Click-to-load YouTube player for the detail pages. The page shows a self-hosted thumbnail; nothing
// is requested from YouTube until the visitor presses Play, which loads the youtube-nocookie.com
// embed. The thumbnail stays up with a spinner until the embed has loaded, and further clicks are
// ignored, so one press is enough. Without JS the Play button stays hidden and the "Watch on YouTube"
// link still works.
(() => {
  const ORIGIN = "https://www.youtube-nocookie.com";
  const PLAY = JSON.stringify({ event: "command", func: "playVideo", args: [] });

  for (const player of document.querySelectorAll(".video-player")) {
    const button = player.querySelector(".video-play");
    button.hidden = false;
    button.addEventListener("click", () => {
      button.classList.add("is-loading");
      button.setAttribute("aria-busy", "true");
      const frame = document.createElement("iframe");
      frame.src = `${ORIGIN}/embed/${player.dataset.videoId}?autoplay=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
      frame.title = button.getAttribute("aria-label").replace("Play video: ", "Video: ");
      frame.allow = "autoplay; encrypted-media; picture-in-picture";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.addEventListener("load", () => {
        // Remove the others rather than re-adding the frame: moving an iframe reloads it.
        player.querySelector("img").remove();
        button.remove();
        frame.focus();
        // Some browsers ignore autoplay=1 in an embed; the player may need a moment to accept this.
        for (const wait of [0, 500, 1000]) setTimeout(() => frame.contentWindow?.postMessage(PLAY, ORIGIN), wait);
      }, { once: true });
      player.prepend(frame);
    }, { once: true });
  }
})();
