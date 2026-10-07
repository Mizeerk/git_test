// Heroes page: everyone in the dungeon and the recent winners.
(function () {
  "use strict";
  var D = window.Dungeon, esc = UI.esc;
  UI.mount("heroes");

  function draw() {
    var s = D.state, odds = D.odds();
    var list = s.heroes.slice().sort(function (a, b) {
      return odds[b.owner].p - odds[a.owner].p || b.bag - a.bag;
    });
    var maxP = list.length ? odds[list[0].owner].p || 1 : 1;
    document.getElementById("count").textContent = list.length;
    document.getElementById("rows").innerHTML = list.length
      ? list.map(function (h, i) {
          var o = odds[h.owner];
          var cls = (h.you ? "you" : "") + (o.counts ? "" : " waiting");
          return '<tr class="' + cls + '"><td class="mono dim">' + (i + 1) + "</td><td>" + esc(h.name) + (h.you ? " (you)" : "") +
            '</td><td class="mono mute">' + esc(UI.short(h.owner)) + '</td><td class="num">' + D.fmtInt(h.bag) +
            '</td><td class="num">×' + o.bonus.toFixed(2) + '</td><td class="num">' +
            (o.counts ? '<span class="bar" style="width:' + Math.max(2, Math.round((o.p / maxP) * 60)) + 'px"></span>' + UI.pct(o.p) : "next hour") +
            '</td><td class="num">' + h.wins + "</td></tr>";
        }).join("")
      : '<tr><td colspan="7" class="mute">Nobody is in the dungeon yet.</td></tr>';

    document.getElementById("past").innerHTML = s.history.length
      ? s.history.map(function (r) {
          var w = r.winner;
          return "<tr" + (w && w.you ? ' class="you"' : "") + '><td class="mono">' + r.round + "</td><td>" +
            (w ? esc(w.name) + (w.you ? " (you)" : "") : '<span class="mute">nobody, pot carried over</span>') +
            '</td><td class="num torch">' + r.pot.toFixed(3) + ' SOL</td><td class="mono dim">' + esc(r.seed.slice(0, 12)) +
            '…</td><td class="num dim">' + UI.ago(r.at) + " ago</td></tr>";
        }).join("")
      : '<tr><td colspan="5" class="mute">No hour has finished yet.</td></tr>';
  }

  var last = 0;
  D.on(function (type) {
    // Redraw on every change, but at most once a second for plain ticks.
    if (type === "tick" && Date.now() - last < 1000) return;
    last = Date.now();
    draw();
  });
  D.start();
})();
