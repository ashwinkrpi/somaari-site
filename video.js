// Click-to-load YouTube player for the detail pages. The page shows a self-hosted thumbnail; nothing
// is requested from YouTube until the visitor presses Play, which swaps in the youtube-nocookie.com
// embed. Without JS the Play button stays hidden and the "Watch on YouTube" link still works.
(() => {
  for (const player of document.querySelectorAll(".video-player")) {
    const button = player.querySelector(".video-play");
    button.hidden = false;
    button.addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${player.dataset.videoId}?autoplay=1`;
      frame.title = button.getAttribute("aria-label").replace("Play video: ", "Video: ");
      frame.allow = "autoplay; encrypted-media; picture-in-picture";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      player.replaceChildren(frame);
      frame.focus();
    });
  }
})();
