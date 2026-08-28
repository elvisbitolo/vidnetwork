import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://localhost:3112";
const EXEC = "/usr/bin/google-chrome";

const ROUTES = [
  "/", "/about", "/guidelines", "/explore", "/discovery", "/search", "/topics",
  "/pricing", "/login", "/signup",
  "/dashboard", "/account", "/feed", "/chat", "/notifications",
  "/members", "/leaderboard", "/gallery", "/groups", "/spaces",
  "/events", "/courses", "/challenges", "/articles", "/recordings",
  "/rooms", "/host", "/admin/analytics",
];

const VIEWPORTS = [
  { name: "m-360", width: 360, height: 740 },
  { name: "m-390", width: 390, height: 844 },
  { name: "m-430", width: 430, height: 932 },
  { name: "t-600", width: 600, height: 960 },
  { name: "t-768", width: 768, height: 1024 },
  { name: "l-1024", width: 1024, height: 768 },
  { name: "d-1280", width: 1280, height: 800 },
  { name: "d-1440", width: 1440, height: 900 },
];

let browser;
let page;

async function launch() {
  browser = await puppeteer.launch({
    executablePath: EXEC,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  page = await browser.newPage();
}

await launch();
const report = [];

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    let status = 0;
    let result = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 500 });
        const res = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 20000 });
        status = res.status();
        await new Promise((r) => setTimeout(r, 1600));
        result = await page.evaluate(() => {
          const width = window.innerWidth;
          const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
          const els = [...document.querySelectorAll("body *")]
            .map((el) => {
              const r = el.getBoundingClientRect();
              return { tag: el.tagName, cls: (el.className && String(el.className).slice(0, 50)) || "", w: Math.round(r.width), right: Math.round(r.right), left: Math.round(r.left) };
            })
            .filter((o) => o.w > width + 2 || o.right > width + 2 || o.left < -2)
            .sort((a, b) => b.w - a.w)
            .slice(0, 6);
          return { winW: width, sw, overflow: sw - width, els };
        });
        break;
      } catch (e) {
        try { await browser.close(); } catch {}
        await launch().catch(() => {});
      }
    }
    report.push({ route, vp: vp.name, w: vp.width, status, overflow: result ? result.overflow : null, offenders: result ? result.els : [] });
  }
  console.error(`done ${route}`);
  try { await browser.close(); await launch(); } catch {}
}

console.log(JSON.stringify(report));
await browser.close().catch(() => {});