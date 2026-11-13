// Check the demo player, the Appearance control and the pages in headless Chromium, driven with
// playwright-core and the system Chromium (CHROMIUM=/path to override; nothing is downloaded).
//   npm run build && python3 scripts/demo/serve.py 8000 &  node scripts/demo/verify.mjs [http://127.0.0.1:8000/] [outdir]
// Checks: cards show posters only and nothing loads a video until "Watch demo" opens the player; the
// player works from the keyboard (Enter opens, play/pause, Esc closes, focus returns to the button)
// and closes on a backdrop click; with reduced motion it never autoplays, including a live toggle;
// the Appearance popover works from the keyboard and saves or clears the choice; app detail pages;
// no JS; no console errors or CSP violations; no horizontal scroll at phone width. Saves screenshots
// to outdir (default: the system temp folder; keep them out of the repo, which is published).
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const URL_ = process.argv[2] || "http://127.0.0.1:8000/";
const OUT = process.argv[3] || tmpdir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/usr/bin/chromium",
  args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
// One context per device type (a page can't switch mobile emulation), plus one with JavaScript off.
const contexts = {
  phone: await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }),
  desktop: await browser.newContext({ viewport: { width: 1280, height: 800 } }),
  nojs: await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, javaScriptEnabled: false }),
};
const pages = {};
let page;
const evaluate = (expr) => page.evaluate(expr);

const videoReqs = [], problems = [];
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); if (!ok) failures++; };

async function setup({ width, height, mobile, reduce, dark, path = "", nojs = false }) {
  page = pages[nojs ? "nojs" : mobile ? "phone" : "desktop"];
  await page.setViewportSize({ width, height });
  await setMotion(reduce, dark);
  videoReqs.length = 0;
  await page.goto(new URL(path, URL_).href);
  await sleep(2000);
}
const setMotion = (reduce, dark) => page.emulateMedia({
  reducedMotion: reduce ? "reduce" : "no-preference", colorScheme: dark ? "dark" : "light" });
const press = async (key) => { await page.keyboard.press(key); await sleep(300); };
const click = (x, y) => page.mouse.click(x, y);
const player = () => evaluate(`(() => { const v = document.getElementById("demo-video"), d = document.getElementById("demo-dialog");
  return { open: d.open, paused: v.paused, t: +v.currentTime.toFixed(2), src: v.currentSrc, rs: v.readyState,
    sources: v.querySelectorAll("source").length, label: document.getElementById("demo-toggle").textContent,
    active: document.activeElement.id || document.activeElement.className }; })()`);
const shot = (name) => page.screenshot({ path: join(OUT, name) });

try {
  for (const [name, ctx] of Object.entries(contexts)) {
    const p = (pages[name] = await ctx.newPage());
    p.on("request", (r) => { if (/\.(webm|mp4)(\?|$)/.test(r.url())) videoReqs.push(r.url()); });
    p.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(m.text()); });
    p.on("pageerror", (e) => problems.push(e.message));
  }

  // Phone, motion allowed: posters only, nothing loads while scrolling past every card.
  await setup({ width: 390, height: 844, mobile: true });
  const cards = await evaluate(`Array.from(document.querySelectorAll(".card-demo")).map(i => ({
    box: Math.abs(i.getBoundingClientRect().height - i.getBoundingClientRect().width * 9 / 16) <= 2 }))`);
  const buttons = await evaluate(`Array.from(document.querySelectorAll("button.demo-open")).filter(b => !b.hidden).length`);
  check(cards.length === 4 && buttons === 4, `phone: 4 posters with a visible "Watch demo" button (${cards.length} posters, ${buttons} buttons)`);
  check(cards.every((c) => c.box), "phone: poster boxes keep 16:9");
  for (let i = 0; i < 4; i++) { await evaluate(`document.querySelectorAll(".card-demo")[${i}].scrollIntoView({block: "center"})`); await sleep(400); }
  await sleep(800);
  const widths = await evaluate(`Array.from(document.querySelectorAll(".card-demo")).map(i => i.naturalWidth)`);
  check(widths.every((w) => w === 720), `posters load at 720 px (${widths})`);
  check(videoReqs.length === 0, `phone: no video requests after scrolling past every card (${videoReqs.length})`);
  const scrollWidth = await evaluate("document.documentElement.scrollWidth");
  check(scrollWidth <= 390, `phone: no horizontal scroll (scrollWidth ${scrollWidth})`);
  await shot("verify-phone-cards.png");

  // Player from the keyboard: Enter opens it and it plays; the toggle pauses; Esc closes it.
  await evaluate(`document.querySelector("button.demo-open").scrollIntoView({block: "center"}); document.querySelector("button.demo-open").focus()`);
  await press("Enter");
  await sleep(2000);
  let p = await player();
  check(p.open && p.active === "demo-toggle", `player: Enter opens it and focus moves into it (focus on ${p.active})`);
  check(!p.paused && p.t > 0.3 && p.src.endsWith(".webm") && p.label === "Pause", `player: plays the loop (webm, t=${p.t}, button "${p.label}")`);
  check(videoReqs.length > 0 && videoReqs.every((u) => u.includes("/demos/somaari-trip/")), `player: loads only the opened card's loop (${videoReqs.length} requests)`);
  await shot("verify-phone-player.png");
  await press("Enter");
  p = await player();
  check(p.paused && p.label === "Play", `player: the toggle pauses it (button "${p.label}")`);
  await press("Escape");
  p = await player();
  const opener = await evaluate(`document.activeElement === document.querySelector("button.demo-open")`);
  check(!p.open && opener, "player: Esc closes it and focus returns to the Watch demo button");
  check(p.sources === 0 && p.rs === 0, `player: closing unloads the video (readyState ${p.rs})`);
  await evaluate(`document.querySelectorAll("button.demo-open")[1].click()`);
  await sleep(600);
  await click(4, 4);
  await sleep(400);
  p = await player();
  check(!p.open, "player: a click on the backdrop closes it");

  // Reduced motion: the player opens paused and loads nothing until Play.
  await setup({ width: 390, height: 844, mobile: true, reduce: true });
  await evaluate(`document.querySelectorAll("button.demo-open")[2].click()`);
  await sleep(1500);
  p = await player();
  check(p.open && p.paused && p.label === "Play" && videoReqs.length === 0, `reduced motion: player opens paused, no video requests (${videoReqs.length})`);
  await evaluate(`document.getElementById("demo-toggle").click()`);
  await sleep(1500);
  p = await player();
  check(!p.paused && p.t > 0.3, `reduced motion: Play starts it (t=${p.t})`);
  await press("Escape");
  // Live toggle: playing with motion allowed, then reduce -> paused.
  await setMotion(false);
  await evaluate(`document.querySelectorAll("button.demo-open")[0].click()`);
  await sleep(1500);
  const before = await player();
  await setMotion(true);
  await sleep(500);
  p = await player();
  check(!before.paused && p.paused, "live toggle to reduce: a playing loop pauses");
  await press("Escape");

  // Desktop screenshots, light and dark.
  await setup({ width: 1280, height: 800, mobile: false });
  await shot("verify-desktop-light.png");
  await setup({ width: 1280, height: 800, mobile: false, dark: true });
  await shot("verify-desktop-dark.png");

  // Appearance control from the keyboard: Enter opens it on the checked choice, an arrow key picks
  // the next theme (and saves it), Esc closes it and returns focus; Auto clears the saved choice.
  await setup({ width: 390, height: 844, mobile: true });
  await evaluate(`localStorage.clear()`);
  await setup({ width: 390, height: 844, mobile: true });
  const appearance = () => evaluate(`({ expanded: document.getElementById("appearance-toggle").getAttribute("aria-expanded"),
    hidden: document.getElementById("appearance-menu").hidden, theme: document.documentElement.dataset.theme,
    saved: localStorage.getItem("somaari-theme"), active: document.activeElement.id || document.activeElement.value,
    name: document.getElementById("appearance-toggle").textContent.trim() })`);
  await evaluate(`document.getElementById("appearance-toggle").focus()`);
  await press("Enter");
  let a = await appearance();
  check(a.name === "Appearance" && a.expanded === "true" && !a.hidden && a.active === "auto",
    `appearance: Enter opens it, focus on the checked choice (${a.active}), accessible name "${a.name}"`);
  await shot("verify-phone-appearance.png");
  await press("ArrowDown");
  a = await appearance();
  check(a.theme === "rangoli" && a.saved === "rangoli", `appearance: arrow key picks and saves the next theme (${a.theme}, saved ${a.saved})`);
  await press("Escape");
  a = await appearance();
  check(a.hidden && a.expanded === "false" && a.active === "appearance-toggle", "appearance: Esc closes it and returns focus to the button");
  await evaluate(`document.getElementById("appearance-toggle").click(); document.querySelector('#appearance-menu input[value="auto"]').click()`);
  await sleep(300);
  a = await appearance();
  check(a.saved === null, `appearance: Auto (seasonal) clears the saved choice (theme now ${a.theme})`);
  await click(200, 700);
  await sleep(300);
  a = await appearance();
  check(a.hidden, "appearance: a click outside closes it");

  // App detail pages: load at phone width with no horizontal scroll (console/CSP problems are
  // collected with the rest and checked at the end).
  for (const slug of ["somaari-trip", "somaari-disk", "somaari-plan"]) {
    await setup({ width: 390, height: 844, mobile: true, path: `apps/${slug}/` });
    const d = await evaluate(`({ h1: document.querySelectorAll("h1").length, sw: document.documentElement.scrollWidth,
      img: document.querySelector(".detail-shot img")?.naturalWidth || 0, picker: !document.getElementById("theme-picker").hidden })`);
    check(d.h1 === 1 && d.sw <= 390 && d.img > 0 && d.picker, `detail page ${slug}: one h1, screenshot, Appearance control, no horizontal scroll (scrollWidth ${d.sw})`);
  }
  // Per-theme screenshots (somaari-plan): the image shown is the current theme's.
  const shotTheme = () => evaluate(`({ theme: document.documentElement.dataset.theme,
    src: document.querySelector(".detail-shot img").currentSrc })`);
  for (const id of ["liquid-glass", "rajyotsava"]) {
    await setup({ width: 1280, height: 900, path: `apps/somaari-plan/?theme=${id}` });
    const t = await shotTheme();
    check(t.src.endsWith(`screenshot-${id}.png`), `detail page somaari-plan, ${id}: shows that theme's screenshot (${t.src.split("/").pop()})`);
  }

  // No JS: posters only, no Watch demo buttons, no Appearance control.
  await setup({ width: 390, height: 844, mobile: true, nojs: true });
  await evaluate(`document.querySelectorAll(".card-demo")[0].scrollIntoView({block: "center"})`);
  await sleep(800);
  const nojs = await evaluate(`({ buttons: Array.from(document.querySelectorAll("button.demo-open")).filter(b => b.offsetParent).length,
    picker: document.getElementById("theme-picker").offsetParent !== null })`);
  check(videoReqs.length === 0 && nojs.buttons === 0 && !nojs.picker, `no JS: no video requests, no Watch demo buttons, no Appearance control`);
  await shot("verify-phone-nojs.png");
  await setup({ width: 390, height: 844, mobile: true, nojs: true, path: "apps/somaari-plan/" });
  const nojsShot = await evaluate(`Array.from(document.querySelectorAll(".detail-shot img")).filter((i) => i.offsetParent)
    .map((i) => i.naturalWidth && i.currentSrc.split("/").pop())`);
  check(nojsShot.length === 1 && nojsShot[0] === "screenshot-rangoli.png", `no JS: somaari-plan shows the default screenshot (${nojsShot})`);

  const real = problems.filter((p) => !/favicon/i.test(p));
  check(real.length === 0, `no console errors/warnings or CSP violations${real.length ? ": " + real.join(" | ") : ""}`);
} finally {
  await browser.close();
}
console.log(failures ? `${failures} check(s) failed` : "all checks passed");
process.exit(failures ? 1 : 0);
