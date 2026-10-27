# Capacitor (web → iOS / Android)

One Vite build (`dist/`) powers:

- **Web** — Vercel / any static host ([DEPLOY.md](./DEPLOY.md))
- **iOS** — Xcode via Capacitor
- **Android** — Android Studio via Capacitor (optional)

This is a **pack shell** for engine-native games under `src/games/`.

---

## Prerequisites (iOS)

- macOS with **Xcode** (recent stable)
- **CocoaPods** (`sudo gem install cocoapods` or Homebrew)
- Apple Developer account for device / TestFlight (Simulator works without a paid account)

Native `ios/` / `android/` folders are **not** committed by default — generate them once per machine:

```sh
npm install
npm run build
npx cap add ios          # once
# npx cap add android    # optional
```

---

## Daily workflow

```sh
npm run cap:sync         # build + cap sync
npm run cap:ios          # sync + open Xcode
```

In Xcode: select a Simulator or device → Run.

After content/engine changes: `npm run cap:sync` again so `dist/` is copied into the native project.

---

## Config

[`capacitor.config.ts`](./capacitor.config.ts):

- `appId` / `appName`: `com.portableadventure.engine` / Portable Adventure
- Sync helpers: `npm run cap:sync`, `cap:ios`, `cap:android`
- `webDir`: `dist`
- Splash / background colors aligned with the dark game chrome

---

## Audio on iOS

- Player must **tap to start** (unlock overlay)
- Music + SFX share one `AudioContext` (`src/utils/audioContext.ts`)
- Do not call `AudioContext.close()` while the app is alive
- On **visibility / app resume**, `MusicContext` resumes a suspended context (no second unlock tap)
- Test mute / backgrounding; autosave covers interruptible sessions

---

## Ship chrome (safe area + saves)

- `viewport-fit=cover` + CSS `--sat/--sab/--sal/--sar` (`env(safe-area-inset-*)`)
- `AdventurePlaySurface` and `PlayMobileMenu` pad with those insets (desktop stays `0`)
- Save quota failure → Save/Load toast offers **Export backup** one-tap download

---

## Touch checklist

- [ ] Attic Study: desk → inventory → chest
- [ ] Template / Harbor Fog: exits + map fast travel
- [ ] Verb bar + inventory usable with thumbs
- [ ] Safe areas: notch / home indicator don’t cover chrome
- [ ] Audio resumes after backgrounding the app
- [ ] Save failure offers Export backup
- [ ] Haptics fire on blocked actions (device only)

---

## Store notes

- GPL-3.0: include `LICENSE`, `COPYRIGHT` (Aaron Davidson), and a source offer as required for distribution
- Replace `appId` / icons / splash before App Store submission
- Privacy: local saves only unless you add analytics later

---

## Store submission checklist

`appId` / `appName` are set in [`capacitor.config.ts`](./capacitor.config.ts). A game shipped separately on the engine needs its own native project / store listing:

| Product | Sync | `appId` | Store listing name |
|---|---|---|---|
| Engine | `npm run cap:sync` | `com.portableadventure.engine` | Portable Adventure |

### Shared (iOS App Store + Android Play)

- [ ] Icons: App Store / Play asset sizes generated; replace defaults after `npx cap add`
- [ ] Splash: Capacitor SplashScreen colors match brand (`#1a1a2e` chrome); product art if required
- [ ] Privacy policy URL (local saves only today — no analytics unless you add them later)
- [ ] Audio: unlock tap works; music/SFX resume after background; mute tested
- [ ] Safe area: notch / home indicator / cutouts do not cover verb bar or menus (`viewport-fit=cover`)
- [ ] Save backup: force a quota/failure path once — **Export backup** still offered
- [ ] GPL source offer / LICENSE + COPYRIGHT available as required for distribution
- [ ] Smoke the [Touch checklist](#touch-checklist) on a physical device

### iOS (App Store / TestFlight)

- [ ] Signing team + bundle id match `appId` for that product
- [ ] TestFlight build from the product sync command above
- [ ] Background audio / interruption: home out and back in mid-room
- [ ] Privacy Nutrition Labels match actual data collection (saves stay on-device)

### Android (Play)

- [ ] Application id matches product `appId`
- [ ] Adaptive icon + feature graphic for the store listing
- [ ] Target / compile SDK per current Play policy
- [ ] Internal testing track before production

### Repo preflight

```sh
npm run check:capacitor
```

Verifies `capacitor.config.ts`, `viewport-fit=cover` in `index.html`, this doc, and `cap:sync` / `cap:ios` / `cap:android` scripts. Exit 1 on missing items. Does **not** replace device QA or store console steps.
