// Checks the pages against videos.json: an app with an ID has the Video section, a thumbnail, a card
// link and a demo-dialog link using that ID; an app without one has none of them.
import { existsSync, readFileSync } from "node:fs";

const { playlist_id: playlist, apps } = JSON.parse(readFileSync("videos.json", "utf8"));
const home = readFileSync("index.html", "utf8");
const errors = [];

for (const [app, id] of Object.entries(apps)) {
  const page = `apps/${app}/index.html`;
  const html = existsSync(page) ? readFileSync(page, "utf8") : "";
  const link = `/apps/${app}/#video`;
  const hasCard = home.includes(`href="${link}"`), hasDialog = home.includes(`data-video="${link}"`);
  if (!id) {
    if (html.includes('id="video"')) errors.push(`${page}: Video section but no ID in videos.json`);
    if (hasCard || hasDialog) errors.push(`index.html: video links for ${app}, which has no ID`);
    continue;
  }
  if (!html.includes(`data-video-id="${id}"`)) errors.push(`${page}: no player for ${id}`);
  if (!html.includes(`watch?v=${id}&amp;list=${playlist}`)) errors.push(`${page}: no "Watch on YouTube" link for ${id}`);
  if (!existsSync(`assets/videos/${id}.jpg`)) errors.push(`assets/videos/${id}.jpg is missing`);
  if (!hasCard) errors.push(`index.html: no card video link for ${app}`);
  if (!hasDialog) errors.push(`index.html: no demo-dialog link for ${app}`);
}

for (const e of errors) console.error(e);
if (errors.length) process.exit(1);
console.log("video links match videos.json");
