// Home page: stats, the shaft, the feed and your hero card.
(function () {
  "use strict";
  var C = window.SITE, D = window.Dungeon, esc = UI.esc;
  UI.mount("dungeon");

  var pit = document.getElementById("pit");
  var MAX_WALKERS = 14;

  function floorTop(floor) { return 4 + (floor / C.floors) * 90; } // % of the pit height

  function drawFloors() {
    var marks = [1];
    for (var f = 5; f <= C.floors; f += 5) marks.push(f);
    pit.innerHTML = marks.map(function (f) {
      return '<div class="floor-line" style="top:' + floorTop(f) + '%"><span>F' + f + "</span></div>";
    }).join("") + '<div id="walkers"></div><div class="pit-msg" id="pit-msg"></div>';
  }

  // Show the last hour's descent. With animate, heroes start at the top and fall to their floors.
  function drawShaft(animate) {
    var s = D.state, box = document.getElementById("walkers"), msg = document.getElementById("pit-msg");
    document.getElementById("shaft-round").textContent = s.last ? "hour " + s.last.round : "";
    document.getElementById("shaft-seed").textContent = s.last
      ? "seed " + s.last.seed.slice(0, 16) + "…" + s.last.seed.slice(-6)
      : "seed: hash of the first slot after the hour";

    if (!s.last || !s.last.order.length) {
      box.innerHTML = "";
      msg.innerHTML = "<p>" + (s.last
        ? "Nobody was in for the last hour, so its pot carried over."
        : "The first drop comes when this hour ends. Any hero that is in before an hour begins falls when it closes.") + "</p>";
      return;
    }
    msg.innerHTML = "";

    // Winner, your hero, then the rest, capped so the shaft stays readable.
    var order = s.last.order, pick = [order[0]];
    order.forEach(function (o, i) { if (o.you && i > 0) pick.push(o); });
    for (var i = 1; i < order.length && pick.length < MAX_WALKERS; i++) if (!order[i].you) pick.push(order[i]);
    // Spread across the width in a stable shuffle so the winner is not always on the left.
    pick.sort(function (a, b) { return a.owner < b.owner ? -1 : 1; });

    var n = pick.length;
    box.innerHTML = pick.map(function (o, i) {
      var x = n === 1 ? 50 : 6 + (i * 82) / (n - 1);
      var cls = "walker" + (o.owner === order[0].owner ? " win" : "") + (o.you ? " you" : "");
      var tag = o.owner === order[0].owner || o.you ? '<span class="walker-tag">' + esc(o.name) + " · F" + o.floor + "</span>" : "";
      var top = animate ? 0 : floorTop(o.floor);
      return '<div class="' + cls + '" data-top="' + floorTop(o.floor) + '" style="left:' + x + "%;top:" + top + '%" title="' +
        esc(o.name) + " reached floor " + o.floor + '">' + tag + "</div>";
    }).join("");

    if (animate) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          box.querySelectorAll(".walker").forEach(function (el, i) {
            el.style.transitionDelay = (i * 60) + "ms";
            el.style.top = el.getAttribute("data-top") + "%";
          });
        });
      });
    }
  }

  function drawStats() {
    var s = D.state;
    var left = Math.max(0, s.roundStart + D.ROUND_MS - Date.now());
    var sec = Math.ceil(left / 1000);
    document.getElementById("s-next").textContent = Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2);
    document.getElementById("s-pot").innerHTML = s.pot.toFixed(3) + "<small>SOL</small>";
    document.getElementById("s-heroes").textContent = s.heroes.length;
  }

  function drawFeed() {
    var items = D.state.feed.slice(0, 8);
    document.getElementById("feed").innerHTML = items.length
      ? items.map(function (f) {
          return '<li><time>' + UI.ago(f.t) + '</time><span class="' + esc(f.kind) + '">' + esc(f.text) + "</span></li>";
        }).join("")
      : '<li class="mute">Quiet so far. Joins, drops and payouts appear here as they happen.</li>';
  }

  // ---------- your hero ----------
  var card = document.getElementById("hero-card");

  function drawCard() {
    var h = D.yourHero();
    if (!h) {
      card.innerHTML =
        '<div class="label">your hero</div>' +
        '<p class="soft" style="margin-top:10px">Lock at least <b>' + D.fmtInt(C.minBag) + " $" + esc(C.ticker) +
        "</b> to get a hero. It sits out the hour in progress and joins the drop after that.</p>" +
        '<form class="field" id="join-form"><label class="sr-only" for="amt">Amount</label>' +
        '<input id="amt" inputmode="numeric" autocomplete="off" placeholder="' + D.fmtInt(C.minBag) + '" value="' + C.minBag * 5 + '">' +
        '<button class="btn btn-torch" type="submit">Send a hero down</button></form><div class="err" id="err"></div>' +
        (D.state.you ? "" : '<p class="dim" style="font-size:13px">A demo wallet is created for you when you send a hero.</p>');
    } else {
      card.innerHTML =
        '<div class="label">your hero</div>' +
        '<div class="hero-name">' + esc(h.name) + "</div>" +
        '<div style="margin-top:6px"><span class="pill" id="h-status"></span></div>' +
        '<div class="kv">' +
        '<div><div class="label">bag</div><div id="h-bag"></div></div>' +
        '<div><div class="label">time bonus</div><div id="h-bonus"></div></div>' +
        '<div><div class="label">odds this hour</div><div id="h-odds"></div></div>' +
        '<div><div class="label">won</div><div id="h-won"></div></div></div>' +
        '<form class="field" id="join-form"><label class="sr-only" for="amt">Tokens to add</label>' +
        '<input id="amt" inputmode="numeric" autocomplete="off" placeholder="add tokens">' +
        '<button class="btn btn-line" type="submit">Add</button></form><div class="err" id="err"></div>' +
        '<button class="btn btn-sm btn-line" type="button" id="leave">Take my tokens back</button>';
      document.getElementById("leave").addEventListener("click", function () {
        if (confirm("Take all " + D.fmtInt(h.bag) + " tokens back? Your hero leaves the dungeon.")) D.leave();
      });
    }
    document.getElementById("join-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var raw = document.getElementById("amt").value.replace(/[,\s_]/g, "");
      var err = D.join(raw);
      var box = document.getElementById("err");
      if (box) box.textContent = err || "";
    });
    drawCardNumbers();
  }

  function drawCardNumbers() {
    var h = D.yourHero();
    if (!h || !document.getElementById("h-bag")) return;
    var o = D.odds()[h.owner];
    document.getElementById("h-bag").textContent = D.fmtInt(h.bag);
    document.getElementById("h-bonus").textContent = "×" + o.bonus.toFixed(2);
    document.getElementById("h-odds").textContent = o.counts ? UI.pct(o.p) : "next hour";
    document.getElementById("h-won").textContent = h.won.toFixed(3) + " SOL";
    var st = document.getElementById("h-status");
    st.textContent = o.counts ? "falls when this hour ends" : "waiting for the next hour";
    st.className = "pill" + (o.counts ? " on" : "");
  }

  drawFloors();
  drawShaft(false);
  drawCard();

  D.on(function (type) {
    drawStats();
    drawFeed();
    if (type === "descent") drawShaft(true);
    if (type === "reset" || type === "sync") drawShaft(false);
    if (type !== "tick" && type !== "descent") drawCard();
    else drawCardNumbers();
  });
  D.start();
})();
