// Pre-render the redesign pages: open each one in Chromium, let the script draw it, and save the resulting HTML,
// so the text is in the page for readers without JavaScript (the preview pages are noindex; the live pages are
// pre-rendered the same way for search engines). The script redraws on load.
// Files are served from the repository through a request route, so no local server is needed.
//   node redesign/src/prerender.js      (needs the playwright package and its Chromium)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const HOST = "http://site.local";
const PAGES = ["redesign/index.html", "ru/redesign/index.html"];
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2" };

(async () => {
  const browser = await chromium.launch();
  try {
    for (const page of PAGES) {
      const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
      const errors = [];
      p.on("pageerror", e => errors.push(e.message));
      await p.route(HOST + "/**", route => {
        let file = path.join(ROOT, decodeURIComponent(new URL(route.request().url()).pathname));
        if (file.endsWith("/")) file += "index.html";
        if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
        const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
        route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) });
      });
      await p.goto(`${HOST}/${page.replace("index.html", "")}`);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(500);
      if (errors.length) throw new Error(`${page}: ${errors.join("; ")}`);
      const html = await p.evaluate(() => "<!doctype html>\n" + document.documentElement.outerHTML + "\n");
      fs.writeFileSync(path.join(ROOT, page), html);
      console.log("pre-rendered", page);
      await p.close();
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message || e); process.exit(1); });
