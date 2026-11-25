// Tale pages: the tale's formula as the page's spine (move lines, a mark for each passage, Propp's symbols in the order of
// the text, arcs joining the pairs, Propp's parts on wide screens), and the selected passage in a card at the passage.
// One rule, as on the main page: the selected function is filled, its pair is outlined.
// Page data: #t = the symbols ({s, move, f, name, sym, nospan, neg, inv}), #d = Propp's passage for each symbol (HTML);
// neg and inv (⤺, out of sequence in Propp's order) as on the main page. The design of PR #3 of the site (24 Nov 2026).
// On a phone (narrow or short screen) the page only shows the tale: no spine, no card; a link to a passage (#s3) lights it.
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const lang = document.documentElement.lang === "ru" ? "ru" : "en";
  const TOKS = JSON.parse($("t").textContent), DET = JSON.parse($("d").textContent);
  const L = { en: { move: "Move", pair: "Pair", close: "Close" }, ru: { move: "Ход", pair: "Пара", close: "Закрыть" } }[lang];
  const PHONE = matchMedia("(max-width: 599px), (max-height: 479px)");
  const reduce = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

  const col = f => (f === "VIIIa" ? "VIII" : f);
  // the pairs as Propp names them (main page, “Thirty-one functions”)
  const PAIRS = [["II","III"],["IV","V"],["VI","VII"],["VIII","XIX"],["XVI","XVIII"],["XVII","XXVII"],["XXI","XXII"],["XXV","XXVI"]];
  // Propp's groups and the main page's names for the parts of a formula
  const GROUPS = [
    { id: "prep", fs: ["0","I","II","III","IV","V","VI","VII"] }, { id: "compl", fs: ["VIII","VIIIa","IX","X","XI"] },
    { id: "donor", fs: ["XII","XIII","XIV"] }, { id: "strug", fs: ["XV","XVI","XVII","XVIII"] },
    { id: "ret", fs: ["XIX","XX","XXI","XXII"] }, { id: "end", fs: ["XXIII","XXIV","XXV","XXVI","XXVII","XXVIII","XXIX","XXX","XXXI"] }];
  const GROUP_OF = {}; GROUPS.forEach(g => g.fs.forEach(f => (GROUP_OF[f] = g)));
  const SEG = {
    en: { short: { prep: "preparation", compl: "complication", donor: "donor", strug: "struggle", ret: "return", end: "ending" },
      parts: { strug: [[["XV"], "transference"], [["XVI","XVII","XVIII"], "struggle"]], ret: [[["XIX"], "liquidation"], [["XX","XXI","XXII"], "return"]] } },
    ru: { short: { prep: "подготовка", compl: "завязка", donor: "даритель", strug: "борьба", ret: "возвращение", end: "развязка" },
      parts: { strug: [[["XV"], "перемещение"], [["XVI","XVII","XVIII"], "борьба"]], ret: [[["XIX"], "ликвидация"], [["XX","XXI","XXII"], "возвращение"]] } } }[lang];
  function segName(g, items) {   // the label's lines: one per part («ликвидация,» / «возвращение»), so it stays inside the spine
    const parts = SEG.parts[g.id]; if (!parts) return [SEG.short[g.id]];
    const has = new Set(items.map(x => col(x.f)));
    const ls = parts.filter(([fs]) => fs.some(f => has.has(f))).map(p => p[1]);
    return ls.length ? ls.map((l, i) => l + (i < ls.length - 1 ? "," : "")) : [SEG.short[g.id]];
  }

  const MOVES = []; TOKS.forEach(t => { if (!MOVES.includes(t.move)) MOVES.push(t.move); });
  let ENTRIES = [], link = {}, G = null, sel = null;

  // the inline labels of the pre-rendered text become anchors for the spine (without the script the text keeps them)
  document.querySelectorAll("#text .lab").forEach(l => { const a = document.createElement("span"); a.className = "anc"; a.dataset.s = l.dataset.s; a.textContent = "​"; l.replaceWith(a); });

  // pairs inside one move, in the order of the text: each first half links to the next unused second half
  function pairLinks(ents) {
    const out = {};
    MOVES.forEach(mv => {
      const ts = ents.filter(e => e.move === mv), used = new Set();
      ts.forEach((t, i) => {
        const p = PAIRS.find(q => q[0] === col(t.f)); if (!p) return;
        const j = ts.findIndex((u, k) => k > i && col(u.f) === p[1] && !used.has(k));
        if (j < 0) return; used.add(j); out[t.s] = ts[j].s; out[ts[j].s] = t.s;
      });
    });
    return out;
  }

  // ===== the spine =====
  // columns, left to right: move lines · leaders · symbols · pair arcs · names and parts (wide screens)
  function layout() {
    if (PHONE.matches) { G = null; ENTRIES = []; link = {}; ["railsvg", "railover", "labels"].forEach(id => ($(id).innerHTML = "")); return; }
    const w = innerWidth, wide = w >= 1000, narrow = w < 600;
    const lane = wide ? 12 : narrow ? 8 : 10, lanesW = 14 + MOVES.length * lane;
    const leadW = wide ? 22 : narrow ? 12 : 16, symW = wide ? 52 : narrow ? 42 : 48, arcW = wide ? 48 : narrow ? 24 : 34;
    // the names column as wide as the tale's longest name, where the text keeps about 640 px (Maria, 25 Nov 2026); else cut with …
    const ruler = document.createElement("span"); ruler.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font-size:var(--s1)";
    $("labels").appendChild(ruler);
    const longest = Math.max(...TOKS.map(t => { ruler.textContent = t.name; return ruler.offsetWidth; })); ruler.remove();
    const symX = lanesW + leadW, nameX = symX + symW + arcW, grpW = wide ? 104 : 0;
    const nameW = wide ? Math.round(Math.max(150, Math.min(longest + 8, w - (nameX + 8 + grpW) - 640))) : 0, grpX = nameX + nameW + 8;
    document.documentElement.style.setProperty("--rw", (wide ? grpX + grpW : symX + symW + arcW + 2) + "px");
    // where each passage is in the text (page coordinates)
    const text = $("text"), textTop = text.getBoundingClientRect().top + scrollY, textH = text.offsetHeight, pos = {};
    document.querySelectorAll("#text .anc").forEach(a => { const r = a.getClientRects()[0] || a.getBoundingClientRect(); pos[a.dataset.s] = r.top + scrollY + r.height / 2; });
    // entries in the order of the text; a symbol with no words in the tale follows the one before it
    const byS = [...TOKS].sort((a, b) => a.s - b.s); let prev = textTop;
    const ents = byS.map(t => { const p = pos[t.s]; const e = { ...t, py: p !== undefined ? p : prev + 0.5, placed: p !== undefined }; prev = e.py; return e; });
    ents.sort((a, b) => a.py - b.py || a.s - b.s);
    ENTRIES = ents; link = pairLinks(ents);
    // the symbols evenly down the spine, in the order of the text, each mark level with its symbol (Maria, 25 Nov 2026: before,
    // the marks stood at their places in the text and the symbols, pushed apart, slid down from them on bent leaders)
    const H = document.querySelector(".rail-in").clientHeight, y0 = 30, y1 = H - 16, n = ents.length;
    const step = Math.max(11, (y1 - y0) / Math.max(n - 1, 1)), gap = Math.min(step, wide ? 24 : 22);
    ents.forEach((e, i) => { e.ly = e.ty = n > 1 ? y0 + i * step : (y0 + y1) / 2; });
    // the text and the spine meet at the symbols with a passage: the frame for the part of the text on screen, a tap on the spine
    const lerp = (xs, ys, x) => { if (x <= xs[0]) return ys[0];
      for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return xs[i] === xs[i - 1] ? ys[i] : ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return ys[ys.length - 1]; };
    const pts = [[textTop, y0], ...ents.filter(e => e.placed).map(e => [e.py, e.ly]), [textTop + textH, ents[n - 1].ly]];
    const PX = pts.map(p => p[0]), PY = pts.map(p => p[1]);
    G = { lane, y0, y1, textTop, textH, map: py => lerp(PX, PY, py), unmap: y => lerp(PY, PX, y) };
    const laneX = mv => 12 + MOVES.indexOf(mv) * lane;
    // under the symbols: the frame, move lines, ticks, leaders
    let svg = `<rect class="bg" x="0" y="${y0}" width="${lanesW}" height="${y1 - y0}"/><rect class="win" id="win" x="4" width="${lanesW - 2}" y="${y0}" height="0"/>`;
    MOVES.forEach(mv => {
      const ys = ents.filter(e => e.move === mv && e.placed).map(e => e.ty); if (!ys.length) return;
      svg += `<path class="lane" d="M${laneX(mv)} ${Math.min(...ys)}V${Math.max(...ys)}"/>`;
    });
    ents.forEach(e => {
      if (!e.placed) return;
      const x = laneX(e.move);
      svg += `<path class="lead" d="M${x + 5} ${e.ly}H${symX}"/><path class="tick" d="M${x} ${e.ly}H${x + 5}"/><circle class="dot" data-s="${e.s}" cx="${x}" cy="${e.ly}" r="3"/>`;
    });
    $("railsvg").innerHTML = svg;
    // over the symbols: every pair as an arc, and (wide screens) Propp's parts as brackets
    const ax = symX + symW - 2;
    let over = "";
    ents.forEach(e => {
      const m = link[e.s]; if (m === undefined) return;
      const f = ents.find(x => x.s === m); if (!f || f.ly <= e.ly) return;
      const bow = Math.min(arcW - 4, 6 + (f.ly - e.ly) * 0.12);
      over += `<path class="pa" data-p="${e.s} ${f.s}" d="M${ax} ${e.ly}C${ax + bow} ${e.ly} ${ax + bow} ${f.ly} ${ax} ${f.ly}"/>`;
    });
    if (wide) {
      const segs = [];
      ents.forEach(e => { const g = GROUP_OF[e.f] || null, s = segs[segs.length - 1];
        if (s && s.g === g && s.move === e.move) s.items.push(e); else segs.push({ g, move: e.move, items: [e] }); });
      segs.forEach(s => {
        if (!s.g) return;
        const a = s.items[0].ly - gap / 2 + 3, b = s.items[s.items.length - 1].ly + gap / 2 - 3;
        const lines = segName(s.g, s.items).map((l, i) => `<tspan x="${grpX + 8}" dy="${i ? Math.min(13, gap) : 0}">${esc(l)}</tspan>`).join("");
        over += `<path class="grp" d="M${grpX + 4} ${a}H${grpX}V${b}H${grpX + 4}"/><text class="gt" x="${grpX + 8}" y="${s.items[0].ly + 4}">${lines}</text>`;
      });
    }
    $("railover").innerHTML = over;
    // move numerals at the start of their lines (lifted where they would touch); the symbols
    const starts = MOVES.map(mv => { const ys = ents.filter(e => e.move === mv && e.placed).map(e => e.ty); return { mv, y: ys.length ? Math.min(...ys) - 6 : y0 }; });
    starts.forEach((a, k) => starts.slice(0, k).forEach(b => { if (Math.abs(a.y - b.y) < 14) a.y = Math.max(16, b.y - 14); }));
    const fs = gap < 15 ? "12px" : "", lw = (wide ? nameX + nameW : symX + symW + arcW) - symX, labels = $("labels");
    labels.style.setProperty("--symw", symW + "px"); labels.style.setProperty("--arcw", arcW + "px");
    labels.innerHTML = starts.map(({ mv, y }) => `<button class="mvn" data-mv="${esc(mv)}" style="left:${laneX(mv)}px;top:${y}px" title="${esc(L.move)} ${esc(mv)}">${esc(mv)}</button>`).join("") +
      ents.map(e => `<button class="rl${e.nospan ? " nospan" : ""}${e.neg ? " neg" : ""}${e.inv ? " inv" : ""}" data-s="${e.s}" style="top:${e.ly - gap / 2}px;height:${gap}px;left:${symX}px;width:${lw}px"
        title="${esc(e.name)}"><span class="s"${fs ? ` style="font-size:${fs}"` : ""}>${e.sym}</span>${wide ? `<span class="nm">${esc(e.name)}</span>` : ""}</button>`).join("");
    onScroll();
  }

  // the frame and the symbols on screen follow the scroll
  function onScroll() {
    if (!G) return;
    const top = scrollY, bot = scrollY + innerHeight;
    const a = Math.max(top, G.textTop), b = Math.min(bot, G.textTop + G.textH), win = $("win");
    if (win) { if (b > a) { const ya = G.map(a), yb = G.map(b); win.setAttribute("y", ya); win.setAttribute("height", Math.max(3, yb - ya)); } else win.setAttribute("height", 0); }
    const vis = new Set(ENTRIES.filter(e => e.placed && e.py >= top + 40 && e.py <= bot - 20).map(e => String(e.s)));
    document.querySelectorAll("#labels .rl").forEach(l => l.classList.toggle("vis", vis.has(l.dataset.s)));
  }

  // ===== one selection everywhere: the function filled, its pair outlined =====
  function apply() {
    const m = sel === null ? null : link[sel];
    const has = (el, v) => v !== null && v !== undefined && el.dataset.s.split(" ").includes(String(v));
    document.querySelectorAll("#text .m, #labels .rl, #railsvg .dot").forEach(el => { el.classList.toggle("on", has(el, sel)); el.classList.toggle("mate", has(el, m)); });
    document.querySelectorAll("#railover .pa").forEach(p => p.classList.toggle("on", sel !== null && p.dataset.p.split(" ").includes(String(sel))));
    renderPop();
  }

  // the passage card: at the passage, with the move's formula around it
  function renderPop() {
    const pop = $("pop");
    if (sel === null || PHONE.matches) { pop.hidden = true; return; }
    const e = ENTRIES.find(x => x.s === sel), m = link[sel];
    const moveEnts = ENTRIES.filter(x => x.move === e.move), k = moveEnts.indexOf(e);
    const from = Math.max(0, k - 3), to = Math.min(moveEnts.length, k + 4);
    const tok = x => `<button class="tk${x.s === sel ? " on" : ""}${x.s === m ? " mate" : ""}" data-go="${x.s}" title="${esc(x.name)}">${x.sym}</button>`;
    const strip = (from > 0 ? `<span class="dots">…</span>` : "") + moveEnts.slice(from, to).map(tok).join("") + (to < moveEnts.length ? `<span class="dots">…</span>` : "");
    const mt = m !== undefined ? ENTRIES.find(x => x.s === m) : null;
    const body = DET[sel].replace(/<div class="dh">[\s\S]*?<\/button><\/div>/, "");   // the card has its own heading
    pop.innerHTML = `<div class="ph"><span class="s">${e.sym}</span><span class="nm">${esc(e.name)}</span><span class="meta">${esc(L.move)} ${esc(e.move)} · ${k + 1}/${moveEnts.length}</span><button class="x" aria-label="${esc(L.close)}">×</button></div>
      <div class="strip" aria-label="${esc(L.move)} ${esc(e.move)}">${strip}</div>${body}
      ${mt ? `<div class="pairline">${esc(L.pair)}: <button class="linkbtn" data-go="${mt.s}"><span class="s">${mt.sym}</span> ${esc(mt.name)}</button></div>` : ""}`;
    pop.hidden = false;
    placePop();
  }
  function anchorOf(s) {   // the passage itself, or, for a symbol with no words in the tale, the passage before it
    let el = document.querySelector(`#text .m[data-s~="${s}"]`);
    if (el) return el;
    const order = ENTRIES.length ? ENTRIES.map(x => x.s) : TOKS.map(t => t.s).sort((a, b) => a - b);   // no spine on a phone
    for (let j = order.indexOf(s) - 1; j >= 0; j--) { el = document.querySelector(`#text .m[data-s~="${order[j]}"]`); if (el) return el; }
    return $("text");
  }
  function placePop(shift) {   // below the passage, or above it where there is no room below; shift: how far a jump will move the view
    const pop = $("pop"); if (pop.hidden) return;
    shift = shift || 0;
    const cr = $("tcol").getBoundingClientRect(), tx = $("text").getBoundingClientRect();
    const rects = [...anchorOf(sel).getClientRects()], first = rects[0], last = rects[rects.length - 1];
    const padL = tx.left - cr.left, maxW = Math.min(cr.right, innerWidth) - tx.left - 8, w = Math.min(maxW, 460);
    pop.style.width = w + "px";
    const left = Math.max(padL, Math.min(last.left - cr.left - 20, padL + maxW - w));
    pop.style.left = left + "px";
    const h = pop.offsetHeight, below = last.bottom - shift + 12 + h <= innerHeight - 8 || first.top - shift - 12 - h < 8, ref = below ? last : first;
    pop.classList.toggle("below", below); pop.classList.toggle("above", !below);
    pop.style.top = (below ? last.bottom - cr.top + 12 : first.top - cr.top - h - 12) + "px";
    pop.style.setProperty("--ax", Math.max(18, Math.min(w - 18, ref.left - cr.left - left + Math.min(ref.width, 48) / 2)) + "px");
  }
  function select(s, scroll, how) {
    sel = sel === s ? null : s;
    history.replaceState(null, "", sel === null ? location.pathname : "#s" + sel);
    if (sel !== null && scroll) {
      const r = anchorOf(sel).getBoundingClientRect(), maxY = document.documentElement.scrollHeight - innerHeight;
      const target = Math.max(0, Math.min(maxY, r.top + scrollY - innerHeight * 0.18));   // where the page can actually go
      window.scrollTo({ top: target, behavior: how || reduce() });
      apply(); placePop(target - scrollY); return;
    }
    apply();
  }

  document.addEventListener("click", e => {
    if (PHONE.matches) return;   // on a phone the tale is only read
    if (e.target.closest(".pop .x")) { select(sel); return; }
    const go = e.target.closest("[data-go]"); if (go) { if (+go.dataset.go !== sel) select(+go.dataset.go, true); return; }
    const mv = e.target.closest("[data-mv]");
    if (mv) { const p = ENTRIES.find(x => x.move === mv.dataset.mv && x.placed); if (p) window.scrollTo({ top: p.py - innerHeight * 0.3, behavior: reduce() }); return; }
    if (e.target.closest("#railsvg .bg, #railsvg .win") && G) {   // the spine as a scrollbar: tap a place in the tale to go there
      const r = document.querySelector(".rail-in").getBoundingClientRect();
      window.scrollTo({ top: G.unmap(e.clientY - r.top) - innerHeight * 0.4, behavior: reduce() }); return;
    }
    if (e.target.closest("#pop")) return;
    const t = e.target.closest("#text .m, #labels .rl");
    if (!t) { if (sel !== null && e.target.closest("#text")) select(sel); return; }   // a tap on plain text closes the card
    select(+t.dataset.s.split(" ")[0], !t.closest("#text"));
  });
  addEventListener("keydown", e => { if (e.key === "Escape" && sel !== null) select(sel); });
  // a passage and its symbol light up together on hover
  document.addEventListener("mouseover", e => {
    const t = e.target.closest("#text .m, #labels .rl");
    document.querySelectorAll(".hov").forEach(x => x.classList.remove("hov"));
    if (t) t.dataset.s.split(" ").forEach(s => document.querySelectorAll(`#text .m[data-s~="${s}"], #labels .rl[data-s="${s}"]`).forEach(x => x.classList.add("hov")));
  });

  let sraf = 0, raf = 0, lastW = innerWidth, lastH = innerHeight;
  addEventListener("scroll", () => { cancelAnimationFrame(sraf); sraf = requestAnimationFrame(onScroll); }, { passive: true });
  addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
    if (Math.abs(innerWidth - lastW) > 2 || Math.abs(innerHeight - lastH) > 60) { lastW = innerWidth; lastH = innerHeight; layout(); apply(); } }); });
  layout();
  const h = /^#s(\d+)$/.exec(location.hash);   // links to a passage (#s3) keep working
  const opened = h && DET[+h[1]] !== undefined ? +h[1] : null;
  if (opened !== null) select(opened, true, "auto");
  // the web font moves the text: draw the spine again and, for a link to a passage, go to it again
  if (document.fonts) document.fonts.ready.then(() => { layout(); apply(); if (opened !== null && sel === opened) { sel = null; select(opened, true, "auto"); } });
})();
