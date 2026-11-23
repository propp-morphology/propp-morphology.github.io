"""Build the redesign preview pages from redesign/src/page.html.

The data (functions, citations, tales and their codings) is read from the live English page, index.html, so the
preview always shows the same data as the site. Writes redesign/index.html (English) and ru/redesign/index.html
(Russian); prerender.js then puts the rendered text into the HTML.

    python3 redesign/src/build.py && node redesign/src/prerender.js
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = "https://propp-morphology.github.io"
PAGES = [
    ("en", "redesign/index.html", "Propp's Tale Schema: redesign preview",
     "A redesign preview of the page on Propp's Morphology of the Folktale."),
    ("ru", "ru/redesign/index.html", "Схема сказки по Проппу: макет нового оформления",
     "Макет нового оформления страницы о «Морфологии сказки» В. Я. Проппа."),
]


def page_data() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    m = re.search(r'<script id="data" type="application/json">(.*?)</script>', html, re.S)
    if not m:
        raise SystemExit("index.html: no <script id=\"data\"> block")
    data = json.loads(m.group(1))
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def main() -> None:
    src = (ROOT / "redesign/src/page.html").read_text(encoding="utf-8").replace("__DATA__", page_data())
    cut = src.index('<header class="band">')
    head, body = src[:cut], src[cut:]
    for lang, path, title, desc in PAGES:
        doc = f"""<!doctype html>
<html lang="{lang}" data-page="{lang}" data-en="/redesign/" data-ru="/ru/redesign/"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="noindex">
<link rel="alternate" hreflang="en" href="{SITE}/redesign/">
<link rel="alternate" hreflang="ru" href="{SITE}/ru/redesign/">
{head}</head><body>
{body}</body></html>
"""
        out = ROOT / path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(doc, encoding="utf-8")
        print("wrote", path)


if __name__ == "__main__":
    main()
