// Shared header, footer and small helpers for every page.
(function () {
  "use strict";
  var C = window.SITE;

  var LOGO =
    '<svg width="SIZE" height="SIZE" viewBox="0 0 32 32" aria-hidden="true">' +
    '<path d="M4 6h8v6h7v6h7v8H4z" fill="#f4ede4"/>' +
    '<circle cx="24" cy="9" r="4" fill="#ffb04a"/>' +
    "</svg>";
  function logo(size) { return LOGO.replace(/SIZE/g, size); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function short(addr) { return addr ? addr.slice(0, 4) + "…" + addr.slice(-4) : ""; }

  var PAGES = [
    { href: "index.html", id: "dungeon", label: "Dungeon" },
    { href: "heroes.html", id: "heroes", label: "Heroes" },
    { href: "rules.html", id: "rules", label: "Rules" },
    { href: "program.html", id: "program", label: "Program" }
  ];

  function coinLink() {
    var text = "$" + esc(C.ticker) + " " + (C.mint ? esc(short(C.mint)) : "not launched");
    if (C.coinUrl) return '<a class="coin" href="' + esc(C.coinUrl) + '" target="_blank" rel="noreferrer" title="' + esc(C.mint) + '">' + text + "</a>";
    return '<span class="coin">' + text + "</span>";
  }

  function header(current) {
    var links = PAGES.map(function (p) {
      return '<a href="' + p.href + '"' + (p.id === current ? ' aria-current="page"' : "") + ">" + p.label + "</a>";
    }).join("");
    var demo = C.demo
      ? '<div class="demo-bar"><div class="gut"><span><b>Demo mode.</b> Heroes, fees and descents are simulated in your browser. No wallet, no real tokens. One hour here lasts ' +
        C.demoRoundSeconds + " seconds.</span><button type=\"button\" id=\"demo-reset\">Reset the dungeon</button></div></div>"
      : "";
    return demo +
      '<header class="site-header"><a href="#main" class="sr-only skip btn btn-sm btn-torch">Skip to content</a>' +
      '<div class="gut"><a class="brand" href="index.html">' + logo(28) + " " + esc(C.name) + "</a>" +
      '<nav class="nav" aria-label="Main">' + links + coinLink() + "</nav>" +
      '<button type="button" class="btn btn-sm btn-line wallet-btn" id="wallet-btn">Connect</button>' +
      '<button type="button" class="menu-btn" aria-expanded="false" aria-controls="mnav" id="menu-btn">menu</button></div>' +
      '<nav class="mnav" id="mnav" aria-label="Mobile"><div class="gut">' + links + "</div></nav></header>";
  }

  function footer() {
    var links = PAGES.slice(1).map(function (p) { return '<li><a href="' + p.href + '">' + p.label + "</a></li>"; }).join("");
    var program = C.programId
      ? "program " + esc(C.programId) + " · upgradeable by its deploy key until frozen"
      : "program not deployed yet · set programId in assets/config.js";
    return '<footer class="site-footer gut"><div class="foot-row"><div class="brand">' + logo(24) + " " + esc(C.name) +
      '</div><ul class="foot-links">' + links + '</ul></div><p class="foot-note">' + program + "</p></footer>";
  }

  function mount(current) {
    document.getElementById("site-header").outerHTML = header(current);
    document.getElementById("site-footer").outerHTML = footer();

    var menu = document.getElementById("menu-btn");
    menu.addEventListener("click", function () {
      var nav = document.getElementById("mnav");
      var open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
    });

    var reset = document.getElementById("demo-reset");
    if (reset) reset.addEventListener("click", function () {
      if (confirm("Start the demo dungeon over? Your demo hero and history will be cleared.")) Dungeon.reset();
    });

    var wallet = document.getElementById("wallet-btn");
    function paintWallet() {
      var you = Dungeon.state.you;
      wallet.textContent = you ? short(you.owner) : "Connect";
      wallet.title = you ? "Demo wallet " + you.owner + " (click to disconnect)" : "Connect a demo wallet";
    }
    wallet.addEventListener("click", function () {
      if (Dungeon.state.you) {
        if (confirm("Disconnect the demo wallet? Your demo hero leaves the dungeon.")) Dungeon.disconnect();
      } else {
        Dungeon.connect();
      }
    });
    Dungeon.on(function (type) { if (type === "wallet" || type === "reset" || type === "sync") paintWallet(); });
    paintWallet();

    document.querySelectorAll("[data-cfg]").forEach(function (el) {
      var v = C[el.getAttribute("data-cfg")];
      el.textContent = typeof v === "number" ? v.toLocaleString("en-US") : v;
    });
  }

  function ago(t) {
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return s + "s";
    if (s < 3600) return Math.floor(s / 60) + "m";
    return Math.floor(s / 3600) + "h";
  }
  function pct(p) {
    if (!p) return "–";
    if (p < 0.001) return "<0.1%";
    return (p * 100).toFixed(1) + "%";
  }

  window.UI = { mount: mount, esc: esc, short: short, ago: ago, pct: pct, logo: logo };
})();
