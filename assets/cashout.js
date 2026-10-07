// Cash-out page: the earnings calculator and the step-by-step cash-out preview.
// Nothing here moves money or sends data anywhere. Your dev wires the real flow in later.
(function () {
  "use strict";
  var C = window.SITE, D = window.Dungeon, esc = UI.esc;
  UI.mount("cashout");
  D.start();

  // ---------- calculator ----------
  function $(id) { return document.getElementById(id); }
  function usd(n) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function compact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
    return (n / 1e3).toFixed(0) + "K";
  }
  function calc() {
    var bag = +$("r-bag").value, total = Math.max(+$("r-total").value, bag);
    var fees = +$("r-fees").value, price = +$("r-price").value;
    var odds = bag / total, pot = fees * C.potShare / 100, perDay = 24 * odds * pot;
    $("o-bag").textContent = compact(bag);
    $("o-total").textContent = compact(total);
    $("o-fees").textContent = fees.toFixed(2) + " SOL";
    $("o-price").textContent = "$" + price;
    $("est-usd").textContent = usd(perDay * price);
    $("est-sol").textContent = perDay.toFixed(3) + " SOL a day on average";
    $("est-odds").textContent = (odds * 100).toFixed(2) + "%";
    $("est-pot").textContent = pot.toFixed(2) + " SOL";
    $("est-wins").textContent = (24 * odds).toFixed(2);
  }
  ["r-bag", "r-total", "r-fees", "r-price"].forEach(function (id) { $(id).addEventListener("input", calc); });
  calc();

  // ---------- cash-out preview flow ----------
  var BAL = 1.284, RATE = 150, NET_FEE = 0.000005, SERVICE = 0.01; // sample numbers for the design
  var modal = $("flow"), body = $("flow-body"), lastFocus = null;
  var flow = { step: 0, pct: 100, email: "" };

  var ARROW = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function amount() { return BAL * flow.pct / 100; }
  function receive() { var a = amount() - NET_FEE; return a * RATE * (1 - SERVICE); }

  function render() {
    modal.querySelectorAll(".dots span").forEach(function (d, i) { d.className = i <= flow.step ? "on" : ""; });
    var html = "";
    if (flow.step === 0) {
      html = '<h3 id="flow-title">How much?</h3><p class="soft">From your winnings. Your bag stays in the dungeon.</p>' +
        '<div class="big-amt">' + amount().toFixed(3) + ' <small class="mute" style="font-size:18px">SOL</small></div>' +
        '<div class="mono" style="color:var(--moss);font-size:14px">≈ ' + usd(amount() * RATE) + "</div>" +
        '<div class="chips">' + [25, 50, 100].map(function (p) {
          return '<button type="button" data-pct="' + p + '"' + (flow.pct === p ? ' class="on"' : "") + ">" + (p === 100 ? "max" : p + "%") + "</button>";
        }).join("") + "</div>" +
        '<button class="btn btn-torch btn-block" type="button" data-next>Continue</button>';
    } else if (flow.step === 1) {
      html = '<h3 id="flow-title">Where should it go?</h3><p class="soft">Enter the email on your PayPal account.</p>' +
        '<form id="email-form"><label class="sr-only" for="pp-email">PayPal email</label>' +
        '<input type="email" id="pp-email" required autocomplete="email" placeholder="you@example.com" value="' + esc(flow.email) + '">' +
        '<div class="err" id="email-err"></div>' +
        '<button class="btn btn-torch btn-block" type="submit">Review</button></form>' +
        '<button class="btn btn-sm btn-line" type="button" data-back style="margin-top:10px">Back</button>';
    } else if (flow.step === 2) {
      html = '<h3 id="flow-title">Review</h3><p class="soft">Check everything before you confirm.</p>' +
        '<div class="review">' +
        "<div><span>you send</span><span>" + amount().toFixed(3) + " SOL</span></div>" +
        "<div><span>rate</span><span>1 SOL = " + usd(RATE) + "</span></div>" +
        "<div><span>network fee</span><span>" + NET_FEE + " SOL</span></div>" +
        "<div><span>service fee</span><span>" + (SERVICE * 100) + "%</span></div>" +
        "<div><span>to</span><span>" + esc(flow.email) + "</span></div>" +
        '<div class="total"><span>you receive</span><span>' + usd(receive()) + "</span></div></div>" +
        '<p class="dim" style="font-size:12px;margin-top:10px">Sample rate and fees for the design preview.</p>' +
        '<button class="btn btn-torch btn-block" type="button" data-next>Confirm cash-out</button>' +
        '<button class="btn btn-sm btn-line" type="button" data-back style="margin-top:10px">Back</button>';
    } else {
      html = '<div class="center"><div class="done-mark">' + ARROW + '</div>' +
        '<h3 id="flow-title">That\'s the whole flow.</h3>' +
        '<p class="soft" style="margin-top:10px">When cash-out launches, ' + usd(receive()) + " would be on its way to " + esc(flow.email) +
        " now.</p>" +
        '<p class="dim" style="font-size:13px;margin-top:14px">This is a preview: nothing was sent and your email never left this page.</p>' +
        '<button class="btn btn-torch btn-block" type="button" data-close>Done</button></div>';
    }
    body.innerHTML = html;

    var form = $("email-form");
    if (form) {
      var input = $("pp-email");
      setTimeout(function () { input.focus(); }, 30);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { $("email-err").textContent = "Enter a valid email."; return; }
        flow.email = v;
        flow.step = 2;
        render();
      });
    }
  }

  function open() {
    lastFocus = document.activeElement;
    flow = { step: 0, pct: 100, email: flow.email };
    render();
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    modal.querySelector("[data-close]").focus();
  }
  function close() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll("[data-open-flow]").forEach(function (b) { b.addEventListener("click", open); });
  modal.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (e.target === modal || (t && t.hasAttribute("data-close"))) return close();
    if (!t) return;
    if (t.hasAttribute("data-pct")) { flow.pct = +t.getAttribute("data-pct"); render(); }
    if (t.hasAttribute("data-next")) { flow.step += 1; render(); }
    if (t.hasAttribute("data-back")) { flow.step -= 1; render(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("open")) close();
  });

  // Keep the mockup balance in line with the sample numbers above.
  $("dev-bal").innerHTML = BAL.toFixed(3) + "<small>SOL</small>";
  $("dev-fiat").textContent = "≈ " + usd(BAL * RATE) + " USD";
})();
