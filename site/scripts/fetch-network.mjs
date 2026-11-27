// Downloads network.json (the shared list of Somaari sites, apps, contacts) at build time.
// If the download fails or returns something invalid, the committed copy is kept, so a build never breaks
// because somaari.in is unreachable. Copy this file into any other Somaari repo and commit a network.json.
//
//   node scripts/fetch-network.mjs            fetch, falling back to the committed copy
//   node scripts/fetch-network.mjs --check    verify the committed copy and the fallback (no network needed)
//
// Options: --url <url> (default https://somaari.in/network.json), --out <path> (default network.json),
//          --timeout <ms> (default 10000).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_URL = "https://somaari.in/network.json";
const REQUIRED_KEYS = ["sites", "apps", "contact", "author", "social"];

export function validate(data) {
  if (!data || typeof data !== "object") return "not a JSON object";
  const missing = REQUIRED_KEYS.filter((k) => !(k in data));
  if (missing.length) return `missing keys: ${missing.join(", ")}`;
  if (!Array.isArray(data.sites) || !data.sites.length) return "`sites` is empty";
  return null;
}

function readLocal(out) {
  if (!existsSync(out)) return { error: `${out} does not exist` };
  try {
    const data = JSON.parse(readFileSync(out, "utf8"));
    return { data, error: validate(data) };
  } catch (e) {
    return { error: `${out} is not valid JSON (${e.message})` };
  }
}

// Returns { source: "remote" | "fallback", data }. Throws only if there is no usable copy at all.
export async function fetchNetwork({ url = DEFAULT_URL, out = "network.json", timeout = 10000 } = {}) {
  let reason;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const data = JSON.parse(text);
    const problem = validate(data);
    if (problem) throw new Error(problem);
    writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
    return { source: "remote", data };
  } catch (e) {
    reason = e.cause?.code ?? e.message;
  }
  const local = readLocal(out);
  if (local.error) throw new Error(`download failed (${reason}) and no usable committed copy: ${local.error}`);
  console.warn(`network.json: download failed (${reason}); using committed ${out}`);
  return { source: "fallback", data: local.data };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function main() {
  const out = arg("--out", "network.json");
  if (process.argv.includes("--check")) {
    const local = readLocal(out);
    if (local.error) {
      console.error(`network.json check: ${local.error}`);
      process.exit(1);
    }
    // An unreachable URL must fall back to the committed copy and leave it untouched.
    const before = readFileSync(out, "utf8");
    const warn = console.warn;
    console.warn = () => {};
    let result;
    try {
      result = await fetchNetwork({ url: "http://127.0.0.1:9/network.json", out, timeout: 3000 });
    } catch (e) {
      console.warn = warn;
      console.error(`network.json check: fallback failed: ${e.message}`);
      process.exit(1);
    }
    console.warn = warn;
    if (result.source !== "fallback" || readFileSync(out, "utf8") !== before) {
      console.error("network.json check: fallback did not keep the committed copy");
      process.exit(1);
    }
    console.log("network.json fallback works");
    return;
  }
  const { source } = await fetchNetwork({ url: arg("--url", DEFAULT_URL), out, timeout: Number(arg("--timeout", 10000)) });
  console.log(`network.json: using ${source} copy`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`network.json: ${e.message}`);
    process.exit(1);
  });
}
