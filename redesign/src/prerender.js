// Pre-render the redesign pages: open each one in Chromium, let the script draw it, and save the resulting HTML,
// so the text is in the page for search engines and readers without JavaScript. The script redraws on load.
// Files are served from the repository through a request route, so no local server is needed.
//   node redesign/src/prerender.js      (needs the playwright package and its Chromium)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const HOST = "http://site.local";
const PAGES = ["redesign/index.html", "ru/redesign/index.html"];

(async () => {
  const browser = await chromium.launch();
  for (const page of PAGES) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    p.on("pageerror", e => errors.push(e.message));
    await p.route(HOST + "/**", route => {
      let file = path.join(ROOT, decodeURIComponent(new URL(route.request().url()).pathname));
      if (file.endsWith("/")) file += "index.html";
      if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
      route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fs.readFileSync(file) });
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
  await browser.close();
})();
