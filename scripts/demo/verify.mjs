// Check the demo loops in headless Chromium over the DevTools protocol (Node 22+, no packages).
//   python3 scripts/demo/serve.py 8000 &  node scripts/demo/verify.mjs [http://127.0.0.1:8000/] [outdir]
// Checks: no video requests until a card is near the viewport, play/pause on scroll, posters only
// (zero video requests) under reduced motion including a live toggle, no console errors or CSP
// violations, no horizontal scroll at phone width (home and app detail pages). Saves screenshots to outdir.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL_ = process.argv[2] || "http://127.0.0.1:8000/";
const OUT = process.argv[3] || ".";
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), "somaari-verify-"));
const chrome = spawn("chromium", ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--autoplay-policy=no-user-gesture-required", "--mute-audio", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, nextId = 1;
const pending = new Map(), listeners = [];
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = targets.find((t) => t.type === "page");
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
    } catch {}
    await sleep(200);
  }
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else listeners.forEach((f) => f(msg));
  });
}
const send = (method, params = {}) => new Promise((r) => { const id = nextId++; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.result.value;

const videoReqs = [], problems = [];
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); if (!ok) failures++; };

async function setup({ width, height, mobile, reduce, dark }) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  await send("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-reduced-motion", value: reduce ? "reduce" : "no-preference" },
    { name: "prefers-color-scheme", value: dark ? "dark" : "light" }] });
  videoReqs.length = 0;
  await send("Page.navigate", { url: URL_ });
  await sleep(2500);
}
const state = () => evaluate(`Array.from(document.querySelectorAll("video.card-demo")).map(v => ({
  src: v.currentSrc, rs: v.readyState, paused: v.paused, t: +v.currentTime.toFixed(2), top: Math.round(v.getBoundingClientRect().top),
  h: Math.round(v.getBoundingClientRect().height), w: Math.round(v.getBoundingClientRect().width) }))`);
const shot = async (name) => {
  const { result } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(join(OUT, name), Buffer.from(result.data, "base64"));
};

try {
  await connect();
  await send("Network.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
  listeners.push((m) => {
    if (m.method === "Network.requestWillBeSent" && /\.(webm|mp4)(\?|$)/.test(m.params.request.url)) videoReqs.push(m.params.request.url);
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) problems.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    if (m.method === "Runtime.exceptionThrown") problems.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === "Log.entryAdded" && ["error", "warning"].includes(m.params.entry.level)) problems.push(`${m.params.entry.source}: ${m.params.entry.text}`);
  });

  // Phone, motion allowed: cards start below the fold.
  await setup({ width: 390, height: 844, mobile: true, dark: false });
  let s = await state();
  console.log("phone initial:", JSON.stringify(s.map((v) => ({ top: v.top, w: v.w, h: v.h }))));
  const slugs = ["somaari-trip", "somaari-disk", "somaari-plan", "somaari-ai"]; // the cards in page order
  const far = slugs.filter((_, i) => s[i].top > 844 + 150);
  const farLoaded = far.filter((slug) => videoReqs.some((u) => u.includes(`/demos/${slug}/`)));
  check(farLoaded.length === 0,
    `phone: before scrolling, no video requests for cards below the fold (${far.length} far cards, ${videoReqs.length} requests total)`);
  const scrollWidth = await evaluate("document.documentElement.scrollWidth");
  check(scrollWidth <= 390, `phone: no horizontal scroll (scrollWidth ${scrollWidth})`);
  check(s.every((v) => Math.abs(v.h - v.w * 9 / 16) <= 2), "phone: video boxes keep 16:9 before anything loads");
  await shot("verify-phone-light-top.png");

  await evaluate(`document.querySelectorAll("video.card-demo")[1].scrollIntoView({block: "center"})`);
  await sleep(2500);
  s = await state();
  check(!s[1].paused && s[1].t > 0.3 && s[1].src.endsWith(".webm"), `phone: centred card plays (webm, t=${s[1].t})`);
  await shot("verify-phone-light-playing.png");
  await evaluate("window.scrollTo(0, document.body.scrollHeight)");
  await sleep(1200);
  s = await state();
  check(s[0].paused, `phone: first card paused after scrolling past it (top ${s[0].top})`);

  // Dark theme, phone.
  await setup({ width: 390, height: 844, mobile: true, dark: true });
  await evaluate(`document.querySelectorAll("video.card-demo")[0].scrollIntoView({block: "center"})`);
  await sleep(1500);
  await shot("verify-phone-dark.png");

  // Reduced motion: posters only, zero video requests even after scrolling everything.
  await setup({ width: 390, height: 844, mobile: true, reduce: true });
  for (let i = 0; i < 3; i++) { await evaluate(`document.querySelectorAll("video.card-demo")[${i}].scrollIntoView({block: "center"})`); await sleep(700); }
  s = await state();
  check(videoReqs.length === 0 && s.every((v) => !v.src && v.paused), `reduced motion: no video requests, all posters (${videoReqs.length} requests)`);
  const posterOk = await evaluate(`Promise.all(Array.from(document.querySelectorAll("video.card-demo")).map(v =>
    new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth); i.onerror = () => r(0); i.src = v.poster; })))`);
  check(posterOk.every((w) => w === 720), `posters load at 720 px (${posterOk})`);
  // Live toggle: allow motion -> plays; reduce again -> unloaded back to poster.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await sleep(2000);
  s = await state();
  check(!s[2].paused && s[2].src, "live toggle to no-preference: visible card starts playing");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await sleep(800);
  s = await state();
  // After load() with no sources the element is back to HAVE_NOTHING (poster shown); Chrome may
  // keep the old currentSrc string, so check readyState rather than src.
  check(s.every((v) => v.paused && v.rs === 0), `live toggle back to reduce: every video unloaded to its poster (readyState ${s.map((v) => v.rs)})`);

  // Desktop, 2 columns.
  await setup({ width: 1280, height: 800, mobile: false, dark: false });
  s = await state();
  console.log("desktop initial:", JSON.stringify(s.map((v) => ({ top: v.top, w: v.w, h: v.h, playing: !v.paused }))), `${videoReqs.length} video requests`);
  await shot("verify-desktop-light.png");
  await setup({ width: 1280, height: 800, mobile: false, dark: true });
  await sleep(1500);
  await shot("verify-desktop-dark.png");

  // App detail pages: load at phone width with no horizontal scroll (console/CSP problems are
  // collected with the rest and checked at the end).
  for (const slug of ["somaari-trip", "somaari-disk", "somaari-plan"]) {
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await send("Page.navigate", { url: new URL(`apps/${slug}/`, URL_).href });
    await sleep(1500);
    const d = await evaluate(`({ h1: document.querySelectorAll("h1").length, sw: document.documentElement.scrollWidth,
      img: document.querySelector(".detail-shot img")?.naturalWidth || 0 })`);
    check(d.h1 === 1 && d.sw <= 390 && d.img > 0, `detail page ${slug}: one h1, screenshot loads, no horizontal scroll (scrollWidth ${d.sw})`);
  }

  // No JS: posters only.
  await send("Emulation.setScriptExecutionDisabled", { value: true });
  await setup({ width: 390, height: 844, mobile: true });
  await evaluate(`document.querySelectorAll("video.card-demo")[0].scrollIntoView({block: "center"})`);
  await sleep(800);
  check(videoReqs.length === 0, `no JS: no video requests (${videoReqs.length})`);
  await shot("verify-phone-nojs.png");
  await send("Emulation.setScriptExecutionDisabled", { value: false });

  const real = problems.filter((p) => !/favicon/i.test(p));
  check(real.length === 0, `no console errors/warnings or CSP violations${real.length ? ": " + real.join(" | ") : ""}`);
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
console.log(failures ? `${failures} check(s) failed` : "all checks passed");
process.exit(failures ? 1 : 0);
