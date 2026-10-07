// Demo simulation of the hourly descent. Runs entirely in the browser.
// State is kept in localStorage so every page sees the same dungeon.
(function () {
  "use strict";
  var C = window.SITE;
  var STORE = "delve-demo-v1";
  var ROUND_MS = C.demoRoundSeconds * 1000;
  var WEEK_MS = C.demoWeekSeconds * 1000;

  // ---------- sha256 (small pure-JS version so it works on file:// too) ----------
  var K = [], H0 = [];
  (function () {
    var n = 2, c = 0;
    function prime(x) { for (var i = 2; i * i <= x; i++) if (x % i === 0) return false; return true; }
    while (c < 64) {
      if (prime(n)) {
        if (c < 8) H0[c] = ((Math.pow(n, 1 / 2) % 1) * 4294967296) | 0;
        K[c] = ((Math.pow(n, 1 / 3) % 1) * 4294967296) | 0;
        c++;
      }
      n++;
    }
  })();

  function sha256(msg) {
    var l = msg.length;
    var buf = new Uint8Array(((l + 9 + 63) >> 6) << 6);
    buf.set(msg);
    buf[l] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(buf.length - 8, Math.floor((l * 8) / 4294967296));
    dv.setUint32(buf.length - 4, (l * 8) >>> 0);
    var h = H0.slice(), w = new Int32Array(64);
    for (var o = 0; o < buf.length; o += 64) {
      for (var i = 0; i < 16; i++) w[i] = dv.getInt32(o + i * 4);
      for (i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        var s0 = (x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3);
        var s1 = (y >>> 17 | y << 15) ^ (y >>> 19 | y << 13) ^ (y >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], k = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
        var t1 = (k + S1 + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        var S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
        var t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h = [h[0] + a | 0, h[1] + b | 0, h[2] + c | 0, h[3] + d | 0, h[4] + e | 0, h[5] + f | 0, h[6] + g | 0, h[7] + k | 0];
    }
    var out = new Uint8Array(32), odv = new DataView(out.buffer);
    for (i = 0; i < 8; i++) odv.setUint32(i * 4, h[i] >>> 0);
    return out;
  }

  function hex(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
    return s;
  }
  function randBytes(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
  var B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  function fakeAddress() {
    var r = randBytes(44), s = "";
    for (var i = 0; i < 44; i++) s += B58[r[i] % 58];
    return s;
  }
  var enc = new TextEncoder();

  // Hero names come from the owner address, so the same wallet always gets the same name.
  var FIRST = ["Ash", "Brine", "Cinder", "Dusk", "Ember", "Flint", "Gloam", "Hollow", "Iron", "Jet", "Kiln", "Lantern",
    "Moss", "Night", "Onyx", "Pitch", "Quarry", "Rust", "Slate", "Tallow", "Umber", "Vault", "Wick", "Yew"];
  var SECOND = ["walker", "digger", "diver", "warden", "seeker", "climber", "sinker", "crawler", "keeper", "runner",
    "breaker", "finder"];
  function heroName(owner) {
    var h = sha256(enc.encode("name:" + owner));
    return FIRST[h[0] % FIRST.length] + SECOND[h[1] % SECOND.length];
  }

  // ---------- the descent math ----------
  function bonus(hero, now) {
    var age = Math.max(0, now - hero.ageStart);
    return 1 + Math.min(age, WEEK_MS) / WEEK_MS;
  }
  function weight(hero, now) { return hero.bag * bonus(hero, now); }

  // Each hero draws u from sha256(seed || owner), e = -log2(u), key = e / weight.
  // The smallest key is the deepest hero. This is a weighted race, so
  // P(win) = weight / sum(weights), and splitting a bag across wallets changes nothing.
  function heroKey(seed, hero, at) {
    var owner = enc.encode(hero.owner);
    var data = new Uint8Array(seed.length + owner.length);
    data.set(seed);
    data.set(owner, seed.length);
    var h = sha256(data);
    var x = 0;
    for (var i = 0; i < 6; i++) x = x * 256 + h[i];
    var u = (x + 1) / 281474976710656; // (0, 1]
    return -Math.log2(u) / weight(hero, at);
  }

  // ---------- state ----------
  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.v === 1) return s;
      }
    } catch (e) { /* storage unavailable: fall through to a fresh dungeon */ }
    return fresh();
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* keep running in memory */ }
  }

  function makeBot(now) {
    var owner = fakeAddress();
    var bag = Math.round((C.minBag + Math.pow(Math.random(), 2.2) * 40 * C.minBag) / 1000) * 1000;
    return {
      owner: owner, name: heroName(owner), bag: bag,
      ageStart: now - Math.random() * WEEK_MS * 1.2,
      joinedAt: now - ROUND_MS - Math.random() * ROUND_MS, wins: 0, won: 0, bot: true
    };
  }

  function fresh() {
    var now = Date.now();
    var s = { v: 1, round: 1, roundStart: now, pot: 0, dev: 0, heroes: [], history: [], feed: [], last: null, you: null };
    for (var i = 0; i < C.demoBots; i++) s.heroes.push(makeBot(now));
    s.pot = 0.4 + Math.random() * 0.6;
    return s;
  }

  var state = load();
  var listeners = [];

  function emit(type) { for (var i = 0; i < listeners.length; i++) listeners[i](type, state); }
  function feed(text, kind) {
    state.feed.unshift({ t: Date.now(), text: text, kind: kind || "" });
    state.feed = state.feed.slice(0, 30);
  }

  function descend(endAt) {
    var roundStart = endAt - ROUND_MS;
    var seed = randBytes(32);
    var eligible = state.heroes.filter(function (h) { return h.joinedAt <= roundStart; });
    var order = eligible.map(function (h) {
      return { owner: h.owner, name: h.name, key: heroKey(seed, h, roundStart), you: !!h.you };
    }).sort(function (a, b) { return a.key - b.key; });

    var pot = state.pot;
    var record = { round: state.round, seed: hex(seed), pot: pot, at: endAt, order: [], winner: null };
    if (order.length) {
      var minKey = order[0].key;
      record.order = order.map(function (o) {
        return { owner: o.owner, name: o.name, you: o.you, floor: Math.max(1, Math.round(C.floors * minKey / o.key)) };
      });
      var top = order[0];
      var winner = state.heroes.filter(function (h) { return h.owner === top.owner; })[0];
      winner.wins += 1;
      winner.won += pot;
      record.winner = { owner: top.owner, name: top.name, you: top.you, pot: pot };
      state.pot = 0;
      feed(top.name + " reached floor " + C.floors + " and took " + pot.toFixed(3) + " SOL", top.you ? "you" : "win");
    } else {
      feed("Nobody was in for hour " + state.round + ". The pot rolls on.", "");
    }
    state.last = record;
    state.history.unshift({ round: record.round, winner: record.winner, pot: pot, seed: record.seed, at: endAt });
    state.history = state.history.slice(0, 24);
    state.round += 1;
  }

  function tick() {
    var now = Date.now();
    // Simulated creator fees trickle in.
    var fee = Math.random() < 0.35 ? Math.random() * 0.012 : 0;
    state.pot += fee * C.potShare / 100;
    state.dev += fee * C.devShare / 100;

    // Bots come and go now and then.
    if (Math.random() < 0.004) {
      var b = makeBot(now);
      b.joinedAt = now;
      b.ageStart = now;
      state.heroes.push(b);
      feed(b.name + " joined with " + fmtInt(b.bag), "join");
    }
    if (Math.random() < 0.002) {
      var bots = state.heroes.filter(function (h) { return h.bot; });
      if (bots.length > 6) {
        var gone = bots[Math.floor(Math.random() * bots.length)];
        state.heroes = state.heroes.filter(function (h) { return h !== gone; });
        feed(gone.name + " took their bag back out", "leave");
      }
    }

    var ended = false;
    if (now - state.roundStart > ROUND_MS * 5) {
      // The tab was closed for a while: draw the last hour and start fresh from now.
      state.roundStart = now - ROUND_MS;
    }
    while (now >= state.roundStart + ROUND_MS) {
      state.roundStart += ROUND_MS;
      descend(state.roundStart);
      ended = true;
    }
    save();
    emit(ended ? "descent" : "tick");
  }

  // ---------- your demo wallet ----------
  function connect() {
    if (!state.you) {
      state.you = { owner: fakeAddress() };
      feed("Demo wallet connected", "");
      save();
    }
    emit("wallet");
  }
  function disconnect() {
    if (yourHero()) leave();
    state.you = null;
    save();
    emit("wallet");
  }
  function yourHero() {
    if (!state.you) return null;
    return state.heroes.filter(function (h) { return h.owner === state.you.owner; })[0] || null;
  }

  // Joining or adding tokens sits the hero out of the hour in progress.
  // Adding keeps the bag's token-time, spread over the bigger bag.
  function join(amount) {
    amount = Math.floor(Number(amount));
    if (!state.you) connect();
    var now = Date.now();
    var h = yourHero();
    if (!h && !(amount >= C.minBag)) return "The smallest bag is " + fmtInt(C.minBag) + ".";
    if (!(amount > 0)) return "Enter an amount.";
    if (h) {
      var age = Math.max(0, now - h.ageStart);
      var newBag = h.bag + amount;
      h.ageStart = now - age * h.bag / newBag;
      h.bag = newBag;
      h.joinedAt = now;
      feed(h.name + " added " + fmtInt(amount), "you");
    } else {
      h = { owner: state.you.owner, name: heroName(state.you.owner), bag: amount, ageStart: now, joinedAt: now, wins: 0, won: 0, you: true };
      state.heroes.push(h);
      feed(h.name + " joined with " + fmtInt(amount), "you");
    }
    save();
    emit("join");
    return null;
  }
  function leave() {
    var h = yourHero();
    if (!h) return;
    state.heroes = state.heroes.filter(function (x) { return x !== h; });
    feed(h.name + " took " + fmtInt(h.bag) + " back out", "you");
    save();
    emit("leave");
  }

  function reset() {
    state = fresh();
    save();
    emit("reset");
  }

  // Odds measured at the start of the hour, over heroes that count this hour.
  function odds(now) {
    now = now || Date.now();
    var eligible = state.heroes.filter(function (h) { return h.joinedAt <= state.roundStart; });
    var total = eligible.reduce(function (s, h) { return s + weight(h, state.roundStart); }, 0);
    var map = {};
    state.heroes.forEach(function (h) {
      var counts = h.joinedAt <= state.roundStart;
      map[h.owner] = { counts: counts, p: counts && total ? weight(h, state.roundStart) / total : 0, bonus: bonus(h, now) };
    });
    return map;
  }

  function fmtInt(n) { return Math.round(n).toLocaleString("en-US"); }

  // Pick up changes made in another tab.
  window.addEventListener("storage", function (e) {
    if (e.key === STORE) { state = load(); emit("sync"); }
  });

  window.Dungeon = {
    get state() { return state; },
    ROUND_MS: ROUND_MS,
    start: function () { tick(); setInterval(tick, 500); },
    on: function (fn) { listeners.push(fn); },
    connect: connect, disconnect: disconnect, join: join, leave: leave, reset: reset,
    yourHero: yourHero, odds: odds, bonus: bonus, fmtInt: fmtInt,
    sha256: sha256, hex: hex
  };
})();
