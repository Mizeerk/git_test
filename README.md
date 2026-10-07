# delve

A static website for an hourly "dungeon" draw on Solana. Holders lock tokens in a vault and get a hero. At the end of each hour every hero falls down the shaft, and the deepest one collects that hour's creator fees. Holders can take their tokens back at any time.

The site currently runs in **demo mode**. Heroes, fees and drops are simulated in the browser, there is no wallet and no real tokens are involved. One demo "hour" lasts 60 seconds, so you can watch the drops happen.

## Pages

| File | What it shows |
| --- | --- |
| `index.html` | Live stats, the shaft animation, the activity feed and your hero card |
| `heroes.html` | Every hero with bag, time bonus and odds, plus the last 24 winners |
| `rules.html` | The rules in plain language and the risks to know before joining |
| `program.html` | The on-chain instructions, accounts and the formula behind each drop |
| `cashout.html` | Design preview of PayPal cash-out: earnings mockup, 4-step flow, earnings calculator, roadmap, FAQ and a clickable cash-out walkthrough |

## Run it

No build step and nothing to install. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

It deploys as-is to GitHub Pages, Netlify, Vercel or any static host.

## Configure

Everything you would change lives in `assets/config.js`: the name, ticker, coin mint and link, program ID, fee split, minimum bag, and the demo timings. With `mint`, `coinUrl` and `programId` left empty, the site shows "not launched" and "not deployed".

## How a drop is decided

Each hero's weight is `bag × bonus`. The bonus grows from ×1 to ×2 over 7 days in the vault. When an hour ends, its seed is the hash of the next slot, and each hero gets

```
u   = sha256(seed || owner) mapped to (0, 1]
key = -log2(u) / weight
```

The smallest key lands deepest. This is a weighted race, so a hero's chance of winning is `weight / total weight`. Splitting one bag across wallets gives no advantage.

## Files

```
assets/config.js   settings
assets/sim.js      demo engine: state, fees, drops, sha256
assets/ui.js       shared header, footer, demo wallet button
assets/home.js     home page
assets/heroes.js   heroes page
assets/style.css   styles
assets/logo.svg    icon
```

## Cash-out preview

The PayPal cash-out page is a design for the dev to build against. While `cashoutLive` is `false` in `assets/config.js`, it is labelled "coming soon" and "preview", the walkthrough uses sample rates and fees, and nothing is sent anywhere. When the real payout backend is ready, wire the confirm step in `assets/cashout.js` to it, set `cashoutLive: true`, and remove the preview labels and sample-data notes.

## Going live

Demo mode has no wallet code. To go live you need the on-chain program, a real wallet adapter (for example `@solana/wallet-adapter`) wired to the `join` and `leave` instructions, and reads from the program accounts in place of `assets/sim.js`. Then set `demo: false` in the config.
