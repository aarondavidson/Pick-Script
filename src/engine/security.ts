/**
 * Shared hardening helpers — media URL allowlists, CSS safety,
 * prototype-pollution key stripping, and storage bounds.
 */

const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const MAX_FLAG_KEY = 128;
const MAX_MEDIA_URL = 8_000_000; // ~8MB data URLs
const MAX_PACK_ACTION_CHAIN = 64;
const MAX_PACK_ACTION_TEXT = 4_000;
/** Max nesting depth for `if` then/else chains (top-level = 0). */
export const MAX_PACK_ACTION_NEST_DEPTH = 4;
const MAX_CSS_COLOR = 64;

/** Keys that must never be used as dynamic object property names from untrusted input. */
export function isDangerousKey(key: string): boolean {
  return DANGEROUS_KEYS.has(key);
}

export function isSafeIdentifierKey(key: unknown, max = MAX_FLAG_KEY): key is string {
  return (
    typeof key === "string" &&
    key.length > 0 &&
    key.length <= max &&
    !isDangerousKey(key) &&
    // Intentionally reject C0 controls in identifier keys
    // eslint-disable-next-line no-control-regex -- control-char strip
    !/[\u0000-\u001f]/.test(key)
  );
}

/** Drop dangerous / non-string keys from a string-keyed record. */
export function sanitizeStringRecord<T>(
  input: Record<string, T> | null | undefined,
  valueOk: (v: unknown) => v is T = ((v: unknown): v is T => true) as (
    v: unknown
  ) => v is T
): Record<string, T> {
  const out: Record<string, T> = Object.create(null);
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input)) {
    if (!isSafeIdentifierKey(k)) continue;
    if (!valueOk(v)) continue;
    out[k] = v;
  }
  return out;
}

/** JSON.parse reviver that strips prototype-pollution vectors. */
export function jsonParseReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      if (isDangerousKey(k)) delete obj[k];
    }
  }
  return value;
}

export function safeJsonParse<T = unknown>(raw: string): T {
  return JSON.parse(raw, jsonParseReviver) as T;
}

/**
 * Allow only http(s), relative app paths, blob:, and data:image/* URLs.
 * Rejects javascript:, data:text/html, CSS breakout characters, etc.
 */
export function isSafeMediaUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url || url.length > MAX_MEDIA_URL) return false;
  const trimmed = url.trim();
  // Intentionally reject C0 controls in media URLs
  // eslint-disable-next-line no-control-regex -- control-char strip
  if (!trimmed || /[\u0000-\u001f]/.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("data:text/")
  ) {
    return false;
  }
  if (lower.startsWith("data:")) {
    // Require base64 image payload — blocks data:image/svg+xml,<script>…
    // svg+xml is allowed for authoring; play surfaces should prefer raster.
    return /^data:image\/(png|jpe?g|gif|webp|svg\+xml|bmp|x-icon);base64,/i.test(
      trimmed
    );
  }
  // Non-data URLs must not carry CSS / HTML breakout characters
  if (/['"\\()\s<>]/.test(trimmed)) return false;
  if (lower.startsWith("blob:")) {
    try {
      return new URL(trimmed).protocol === "blob:";
    } catch {
      return false;
    }
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return !trimmed.includes("..");
  }
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Value safe for CSS `url(...)`.
 * Same allowlist as media URLs; quoting via cssUrlValue prevents breakouts.
 */
export function cssSafeUrl(url: unknown): string | undefined {
  if (!isSafeMediaUrl(url)) return undefined;
  return url;
}

export function cssUrlValue(url: unknown): string | undefined {
  const safe = cssSafeUrl(url);
  if (!safe) return undefined;
  // Use JSON.stringify for quoting — escapes " and \
  return `url(${JSON.stringify(safe)})`;
}

/** CSS color for inline style (hex, rgb/rgba, hsl/hsla, named). */
export function isSafeCssColor(color: unknown): color is string {
  if (typeof color !== "string") return false;
  const c = color.trim();
  if (!c || c.length > MAX_CSS_COLOR) return false;
  if (/[;{}<>\\]/.test(c) || c.includes("url(") || c.includes("expression")) {
    return false;
  }
  return (
    /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c) ||
    /^rgba?\(\s*[\d.%\s,]+\s*\)$/i.test(c) ||
    /^hsla?\(\s*[\d.%\s,/deg]+\s*\)$/i.test(c) ||
    /^[a-z]{1,30}$/i.test(c)
  );
}

export function safeCssColor(color: unknown): string | undefined {
  return isSafeCssColor(color) ? color.trim() : undefined;
}

export interface ParsedPackActionEquals {
  var: string;
  value: string | number | boolean;
}

export interface ParsedPackAction {
  op: string;
  text?: string;
  actorId?: string;
  flag?: string;
  value?: boolean | number;
  item?: { id: string; name: string; description: string; icon?: string };
  itemId?: string;
  objectId?: string;
  key?: string;
  id?: string;
  style?: string;
  preset?: string;
  shake?: string;
  flash?: string;
  burst?: string;
  hitStopMs?: number;
  hasItem?: string;
  failMessage?: string;
  /** setWalkFloor — floor layer 0–8 */
  floor?: number;
  equals?: ParsedPackActionEquals;
  then?: ParsedPackAction[];
  else?: ParsedPackAction[];
}

function parseEqualsClause(raw: unknown): ParsedPackActionEquals | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const varName = (raw as { var?: unknown }).var;
  const value = (raw as { value?: unknown }).value;
  if (!isSafeIdentifierKey(varName)) return undefined;
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    return undefined;
  }
  if (typeof value === "string" && value.length > MAX_PACK_ACTION_TEXT) {
    return { var: varName, value: value.slice(0, MAX_PACK_ACTION_TEXT) };
  }
  if (typeof value === "number" && !Number.isFinite(value)) return undefined;
  return { var: varName, value };
}

/** Validate / clamp untrusted action-chain JSON from studio or packs. */
export function parsePackActions(
  raw: unknown,
  depth = 0
): ParsedPackAction[] {
  if (!Array.isArray(raw)) return [];
  if (depth > MAX_PACK_ACTION_NEST_DEPTH) return [];
  const out: ParsedPackAction[] = [];
  for (const row of raw.slice(0, MAX_PACK_ACTION_CHAIN)) {
    if (!row || typeof row !== "object") continue;
    const op = (row as { op?: unknown }).op;
    if (typeof op !== "string") continue;
    switch (op) {
      case "message":
      case "say": {
        const text = String((row as { text?: unknown }).text ?? "").slice(
          0,
          MAX_PACK_ACTION_TEXT
        );
        if (!text) break;
        const actorId = (row as { actorId?: unknown }).actorId;
        out.push({
          op,
          text,
          ...(typeof actorId === "string" && isSafeIdentifierKey(actorId)
            ? { actorId }
            : {}),
        });
        break;
      }
      case "setFlag": {
        const flag = (row as { flag?: unknown }).flag;
        if (!isSafeIdentifierKey(flag)) break;
        const value = (row as { value?: unknown }).value;
        out.push({
          op,
          flag,
          value: value === false ? false : true,
        });
        break;
      }
      case "clearFlag": {
        const flag = (row as { flag?: unknown }).flag;
        if (!isSafeIdentifierKey(flag)) break;
        out.push({ op, flag });
        break;
      }
      case "giveItem": {
        const item = (row as { item?: unknown }).item;
        if (!item || typeof item !== "object") break;
        const id = (item as { id?: unknown }).id;
        const name = (item as { name?: unknown }).name;
        if (!isSafeIdentifierKey(id) || typeof name !== "string") break;
        const description = String(
          (item as { description?: unknown }).description ?? name
        ).slice(0, MAX_PACK_ACTION_TEXT);
        const icon = (item as { icon?: unknown }).icon;
        out.push({
          op,
          item: {
            id,
            name: name.slice(0, 200),
            description,
            ...(isSafeMediaUrl(icon) ? { icon } : {}),
          },
        });
        break;
      }
      case "takeItem": {
        const itemId = (row as { itemId?: unknown }).itemId;
        if (!isSafeIdentifierKey(itemId)) break;
        out.push({ op, itemId });
        break;
      }
      case "setObjectState": {
        const objectId = (row as { objectId?: unknown }).objectId;
        const value = (row as { value?: unknown }).value;
        if (!isSafeIdentifierKey(objectId) || typeof value !== "number") break;
        if (!Number.isFinite(value) || value < 0 || value > 255) break;
        out.push({ op, objectId, value: Math.floor(value) });
        break;
      }
      case "sound":
      case "cutscene": {
        const key =
          op === "sound"
            ? (row as { key?: unknown }).key
            : (row as { id?: unknown }).id;
        if (!isSafeIdentifierKey(key)) break;
        out.push(op === "sound" ? { op, key } : { op, id: key });
        break;
      }
      case "haptic": {
        const style = (row as { style?: unknown }).style;
        if (
          style === "light" ||
          style === "medium" ||
          style === "heavy" ||
          style === "success" ||
          style === "warning" ||
          style === "error" ||
          style === "selection"
        ) {
          out.push({ op, style });
        }
        break;
      }
      case "juice": {
        const preset = (row as { preset?: unknown }).preset;
        const shake = (row as { shake?: unknown }).shake;
        const flash = (row as { flash?: unknown }).flash;
        const burst = (row as { burst?: unknown }).burst;
        const hitStopMs = (row as { hitStopMs?: unknown }).hitStopMs;
        const okPreset =
          preset === "light" ||
          preset === "medium" ||
          preset === "heavy" ||
          preset === "success" ||
          preset === "pickup" ||
          preset === "error";
        const okShake =
          shake === "none" ||
          shake === "light" ||
          shake === "medium" ||
          shake === "heavy";
        const okFlash =
          flash === "none" ||
          flash === "white" ||
          flash === "warm" ||
          flash === "cool";
        const okBurst =
          burst === "none" ||
          burst === "spark" ||
          burst === "dust" ||
          burst === "stars" ||
          burst === "pickup";
        if (!okPreset && !okShake && !okFlash && !okBurst) break;
        out.push({
          op,
          ...(okPreset ? { preset: String(preset) } : {}),
          ...(okShake ? { shake: String(shake) } : {}),
          ...(okFlash ? { flash: String(flash) } : {}),
          ...(okBurst ? { burst: String(burst) } : {}),
          ...(typeof hitStopMs === "number" && Number.isFinite(hitStopMs)
            ? { hitStopMs: Math.max(0, Math.min(120, Math.floor(hitStopMs))) }
            : {}),
        });
        break;
      }
      case "requireItem": {
        const itemId = (row as { itemId?: unknown }).itemId;
        if (!isSafeIdentifierKey(itemId)) break;
        const failMessage = (row as { failMessage?: unknown }).failMessage;
        out.push({
          op,
          itemId,
          ...(typeof failMessage === "string" && failMessage.trim()
            ? {
                failMessage: failMessage
                  .trim()
                  .slice(0, MAX_PACK_ACTION_TEXT),
              }
            : {}),
        });
        break;
      }
      case "setWalkFloor": {
        const floor = (row as { floor?: unknown }).floor;
        if (typeof floor !== "number" || !Number.isFinite(floor)) break;
        out.push({
          op,
          floor: Math.min(8, Math.max(0, Math.floor(floor))),
        });
        break;
      }
      case "if": {
        const flag = (row as { flag?: unknown }).flag;
        const hasItem = (row as { hasItem?: unknown }).hasItem;
        const equals = parseEqualsClause((row as { equals?: unknown }).equals);
        const safeFlag =
          typeof flag === "string" && isSafeIdentifierKey(flag)
            ? flag
            : undefined;
        const safeHasItem =
          typeof hasItem === "string" && isSafeIdentifierKey(hasItem)
            ? hasItem
            : undefined;
        if (!safeFlag && !safeHasItem && !equals) break;
        const thenActions = parsePackActions(
          (row as { then?: unknown }).then,
          depth + 1
        );
        const elseRaw = (row as { else?: unknown }).else;
        const elseActions =
          elseRaw !== undefined
            ? parsePackActions(elseRaw, depth + 1)
            : undefined;
        out.push({
          op,
          ...(safeFlag ? { flag: safeFlag } : {}),
          ...(safeHasItem ? { hasItem: safeHasItem } : {}),
          ...(equals ? { equals } : {}),
          then: thenActions,
          ...(elseActions && elseActions.length ? { else: elseActions } : {}),
        });
        break;
      }
      default:
        break;
    }
  }
  return out;
}

export const STORAGE_LIMITS = {
  maxInstalledPacks: 20,
  maxInstalledPackChars: 12_000_000,
  maxSidecarHotspotsPerRoom: 200,
  maxSidecarJsonChars: 500_000,
  maxDismissedCoachTips: 200,
  maxSaveRawChars: 2_000_000,
  maxUndoEntryChars: 3_000_000,
  maxImageUploadBytes: 6_000_000,
  maxIdbDraftChars: 20_000_000,
  maxGeneratePromptChars: 2_000,
  maxGenerateBodyBytes: 32_000,
} as const;

const IMAGE_MIME = /^image\/(png|jpe?g|gif|webp|bmp|x-icon|svg\+xml)$/i;

/** Validate a File before FileReader / createObjectURL. */
export function assertImageFile(file: File): void {
  if (!IMAGE_MIME.test(file.type)) {
    throw new Error("Only image files are allowed");
  }
  if (file.size > STORAGE_LIMITS.maxImageUploadBytes) {
    throw new Error(
      `Image too large (max ${Math.floor(STORAGE_LIMITS.maxImageUploadBytes / 1_000_000)}MB)`
    );
  }
}

/** createObjectURL after image MIME/size checks. */
export function createImageObjectUrl(file: File): string {
  assertImageFile(file);
  return URL.createObjectURL(file);
}

/** Safe media URL or undefined (for conditional <img src>). */
export function safeMediaUrl(url: unknown): string | undefined {
  return isSafeMediaUrl(url) ? url : undefined;
}

/**
 * Play-safe media: same as isSafeMediaUrl but rejects SVG data URLs
 * (residual XSS if ever rendered outside a sandboxed <img>).
 */
export function isSafePlayMediaUrl(url: unknown): url is string {
  if (!isSafeMediaUrl(url)) return false;
  return !url.trim().toLowerCase().startsWith("data:image/svg+xml");
}

/** Play-safe media URL or undefined. */
export function safePlayMediaUrl(url: unknown): string | undefined {
  return isSafePlayMediaUrl(url) ? url : undefined;
}

/** CSS url(...) for play surfaces — rejects SVG data URLs. */
export function cssPlayUrlValue(url: unknown): string | undefined {
  const safe = safePlayMediaUrl(url);
  if (!safe) return undefined;
  return `url(${JSON.stringify(safe)})`;
}

/**
 * Validate packUrl query values: https absolute, or same-origin relative path.
 * Rejects http://, protocol-relative //, path traversal, and private/local hosts.
 */
export function assertSafePackUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("//")) {
    throw new Error("Invalid packUrl");
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.includes("..")) throw new Error("Invalid packUrl path");
    return trimmed;
  }
  if (!/^https:\/\//i.test(trimmed)) {
    throw new Error("packUrl must be https://… or a /path on this site");
  }
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    throw new Error("Invalid packUrl");
  }
  if (u.protocol !== "https:") {
    throw new Error("packUrl must use https");
  }
  // Block obvious local/metadata targets (browser may still resolve; defense in depth)
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.startsWith("169.254.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.startsWith("192.168.")
  ) {
    throw new Error("packUrl host not allowed");
  }
  return trimmed;
}
