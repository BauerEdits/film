import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = 8791;
const webPort = 5191;
const appUrl = `http://127.0.0.1:${webPort}`;
const children = [];

function run(args, env) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  children.push(child);
  return child;
}

async function waitFor(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // server still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function stop() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

run(["--disable-warning=ExperimentalWarning", "server/index.js"], {
  PORT: String(apiPort),
  SERVE_STATIC: "0",
});
run(
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"],
  { PORTAL_API: `http://127.0.0.1:${apiPort}` },
);

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

try {
  await waitFor(`http://127.0.0.1:${apiPort}/api/health`);
  await waitFor(appUrl);
  const roster = await fetch(`http://127.0.0.1:${apiPort}/api/players`).then((res) => res.json());
  const byrum = roster.players.find((player) => player.fullName === "Byrum Brown");
  const stanton = roster.players.find((player) => player.fullName === "Stanton Ramil");
  if (!byrum || !stanton) throw new Error("seed players missing from API");

  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(appUrl, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.querySelectorAll(".point").length === 112);

  await page.hover(`[data-player-id="${byrum.id}"]`);
  await page.waitForSelector(".tip");
  const tip = await page.$eval(".tip", (el) => el.textContent.trim());
  if (tip !== "Byrum Brown") throw new Error(`tooltip was "${tip}"`);

  await page.click(`[data-player-id="${byrum.id}"]`);
  await page.waitForFunction(() => document.querySelector("#player-detail h2")?.textContent === "Byrum Brown");
  const entered = await page.$eval('[data-field="portal-entry"]', (el) => el.textContent.trim());
  const signed = await page.$eval('[data-field="signed"]', (el) => el.textContent.trim());
  const from = await page.$eval('[data-field="school-from"]', (el) => el.textContent.trim());
  const yards = await page.$eval("#player-detail", (el) => el.textContent);
  if (entered !== "Not published") throw new Error(`entered portal was "${entered}"`);
  if (signed !== "Jan 6, 2026") throw new Error(`signed was "${signed}"`);
  if (from !== "USF") throw new Error(`school from was "${from}"`);
  if (!yards.includes("3,158") || !yards.includes("Passing yards")) throw new Error("Byrum stat line missing");
  await page.screenshot({ path: "/tmp/portal-desktop.png", fullPage: true });
  await page.screenshot({ path: "/tmp/portal-detail.png" });

  await page.focus(`[data-player-id="${stanton.id}"]`);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("#player-detail h2")?.textContent === "Stanton Ramil");

  await page.select("#position", "QB");
  await page.waitForFunction(() => document.querySelectorAll(".point").length === 7);
  await page.waitForSelector(".filter-hidden");

  await page.click("#name-search");
  await page.type("#name-search", "zzzz-no-player");
  await page.waitForSelector(".chart-empty");

  await page.click(".reset");
  await page.waitForFunction(() => document.querySelectorAll(".point").length === 112);

  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.querySelectorAll(".point").length === 112);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`narrow layout overflowed by ${overflow}px`);
  await page.click(`[data-player-id="${byrum.id}"]`);
  await page.waitForFunction(() => document.querySelector("#player-detail h2")?.textContent === "Byrum Brown");
  const detailBox = await page.$eval("#player-detail", (el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, width: rect.width };
  });
  if (detailBox.width < 280) throw new Error(`detail too narrow: ${detailBox.width}`);
  await page.screenshot({ path: "/tmp/portal-mobile.png", fullPage: true });

  if (pageErrors.length) throw new Error(pageErrors.join("\n"));
  console.log("ui ok");
} finally {
  await browser.close();
  stop();
}
