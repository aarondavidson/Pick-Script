# Security notes

Client SPA threat model: a determined user who patches JS can cheat. Deploy lock
raises the bar for casual storage / override / Studio abuse — it is not
server-authoritative anti-cheat.

## Recent hardening

| Area | Behavior |
|---|---|
| **`?packUrl=`** | HTTPS or same-origin `/path` only; private hosts blocked; play without auto-install — user must click **Install to launcher**. |
| **Play media** | `isSafePlayMediaUrl` / `cssPlayUrlValue` reject SVG data URLs on play surfaces. |
| **JSON packs** | `strictInventory: true` → under strict play, unknown inventory ids are dropped on sanitize. |
| **Studio JSON** | Guided action editor uses `safeJsonParse`. |

## Recommended public deploy env

```
# no VITE_ENABLE_STUDIO
# VITE_STRICT_PLAY defaults on
```

Private authoring preview:

```
VITE_ENABLE_STUDIO=true
VITE_STUDIO_SECRET=<optional passphrase>
```

There is no server-side API: the app is a static SPA with no paid services or keys. Authors bring their own art.

## Save seals

`VITE_SAVE_INTEGRITY_KEY` seals slots with a keyed tag that ships in the bundle —
blocks casual localStorage edits, not a cryptographic server secret.
