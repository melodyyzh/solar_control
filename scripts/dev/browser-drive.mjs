// Browser smoke test: screenshots the orbital view (active sun), a planet
// view, mission control, and a mobile viewport. Not a repo dependency —
// needs `npm i --no-save playwright-core` and a system Chrome.
// Note: orbit drift makes planets "unstable" to Playwright; clicks on them
// must use { force: true }.
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const base = process.env.DASH_URL ?? "http://localhost:3777";
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForSelector("text=Robotics");

// wiggle the mouse to light up the sun's telemetry
for (let i = 0; i < 60; i++) {
  await page.mouse.move(400 + Math.random() * 600, 300 + Math.random() * 300);
  await page.waitForTimeout(35);
}
await page.waitForTimeout(1200);
await page.screenshot({ path: "sun-active.png" });

await page.click('button[aria-label*="Open Robotics"]', { force: true });
await page.waitForTimeout(1200);
await page.screenshot({ path: "planet-view.png" });

await page.keyboard.press("Escape");
await page.waitForTimeout(900);
await page.click('button[aria-label*="mission control" i]');
await page.waitForTimeout(1400);
await page.screenshot({ path: "sun-view.png" });

const mob = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await mob.goto(base, { waitUntil: "networkidle" });
await mob.waitForTimeout(1500);
await mob.screenshot({ path: "mobile.png" });

console.log("CONSOLE ERRORS:", errors.length ? errors : "none");
await browser.close();
