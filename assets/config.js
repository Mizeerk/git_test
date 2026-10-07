// Site settings. Change these to rebrand the site or point it at a real coin.
window.SITE = {
  name: "delve",
  ticker: "DELVE",
  tagline: "one hero wins every hour's fees",

  // Leave empty until the coin and the program exist. Empty values show "not launched".
  mint: "",
  coinUrl: "",            // e.g. the coin's page on pump.fun
  programId: "",

  // Game rules shown on the site and used by the demo.
  minBag: 100000,         // smallest bag that gets a hero
  potShare: 80,           // % of creator fees that go into the pot
  devShare: 20,           // % of creator fees that go to the dev wallet
  floors: 40,             // depth of the shaft drawing
  bonusDays: 7,           // days for the time bonus to grow from x1 to x2

  // Fiat cash-out. While cashoutLive is false the feature is shown as a labelled preview.
  cashoutLive: false,
  cashoutProvider: "PayPal",

  // Demo mode: everything is simulated in the browser, no wallet, no real tokens.
  demo: true,
  demoRoundSeconds: 60,   // a demo "hour"
  demoWeekSeconds: 900,   // a demo "week" for the time bonus
  demoBots: 14            // simulated heroes already in the dungeon
};
