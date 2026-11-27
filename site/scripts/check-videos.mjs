// Checks the detail pages against videos.json: an app with an ID has the Video section, a "Watch on
// YouTube" link and a thumbnail using that ID; an app without one has none of them. The landing page
// cards' video links are written by scripts/build.mjs from videos.json, so they can't disagree.
import { existsSync, readFileSync } from "node:fs";

const { playlist_id: playlist, apps } = JSON.parse(readFileSync("videos.json", "utf8"));
const errors = [];

for (const [app, id] of Object.entries(apps)) {
  const page = `apps/${app}/index.html`;
  const html = existsSync(page) ? readFileSync(page, "utf8") : "";
  if (!id) {
    if (html.includes('id="video"')) errors.push(`${page}: Video section but no ID in videos.json`);
    continue;
  }
  if (!html.includes(`data-video-id="${id}"`)) errors.push(`${page}: no player for ${id}`);
  if (!html.includes(`watch?v=${id}&amp;list=${playlist}`)) errors.push(`${page}: no "Watch on YouTube" link for ${id}`);
  if (!existsSync(`assets/videos/${id}.jpg`)) errors.push(`assets/videos/${id}.jpg is missing`);
}

for (const e of errors) console.error(e);
if (errors.length) process.exit(1);
console.log("video links match videos.json");
