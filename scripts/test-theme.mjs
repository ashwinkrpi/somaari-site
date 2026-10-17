// Checks the seasonal default theme in theme.js. Run from the repo root: node scripts/test-theme.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { THEMES, SCHEDULE, getDefaultTheme } = createRequire(import.meta.url)("../theme.js");

// An instant given as a date and time in India (UTC+5:30).
const ist = (day, time = "12:00") => new Date(`${day}T${time}:00+05:30`);

const cases = [
  [ist("2026-10-16"), "warm-tactile"],
  [ist("2026-10-17"), "dasara-jamboo"],
  [ist("2026-10-17", "00:00"), "dasara-jamboo"],
  [ist("2026-10-20"), "dasara-jamboo"],
  [ist("2026-10-20", "23:59"), "dasara-jamboo"],
  [ist("2026-10-21"), "warm-tactile"],
  [ist("2026-10-31"), "warm-tactile"],
  [ist("2026-11-01"), "rajyotsava"],
  [ist("2026-11-07"), "rajyotsava"],
  [ist("2026-11-08"), "warm-tactile"],
  [ist("2027-11-03"), "rajyotsava"],
  [ist("2027-10-18"), "warm-tactile"], // the Dasara dates are for 2026 only
  // The day is India's, not UTC's: 00:30 on 17 Oct in India is still 16 Oct in UTC.
  [new Date("2026-10-16T19:00:00Z"), "dasara-jamboo"],
  [new Date("2026-10-16T18:29:59Z"), "warm-tactile"],
  [new Date("2026-11-07T18:31:00Z"), "warm-tactile"],
];

let failed = 0;
for (const [date, want] of cases) {
  const got = getDefaultTheme(date);
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${date.toISOString()} -> ${got}${ok ? "" : ` (want ${want})`}`);
}

for (const entry of SCHEDULE) assert.ok(entry.theme in THEMES, `unknown theme in SCHEDULE: ${entry.theme}`);

if (failed) {
  console.error(`${failed} of ${cases.length} failed`);
  process.exit(1);
}
console.log(`all ${cases.length} passed`);
