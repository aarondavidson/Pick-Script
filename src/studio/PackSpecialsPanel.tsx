import { modalityRegistry } from "@/components/game/modalityRegistry";
import type {
  JsonPackDocument,
  JsonPackHotspot,
  JsonPackSpecial,
} from "@/engine/jsonPack";
import {
  ALLOWED_MINIGAME_IDS,
  DEFAULT_MINIGAME_WIN_FLAGS,
  sanitizeJsonPackSpecial,
} from "@/engine/jsonPack";
import { suggestId } from "@/authoring/codegen";
import { useState } from "react";

export interface PackSpecialsPanelProps {
  /** Selected hotspot (null = show hint only) */
  hotspot: JsonPackHotspot | null;
  doc: JsonPackDocument;
  guided?: boolean;
  onAttach: (special: JsonPackSpecial | undefined) => void;
}

type CardId =
  | `minigame:${string}`
  | `comic:${string}`
  | "trade";

const MINIGAME_META: Record<
  string,
  { title: string; blurb: string; configurable?: boolean }
> = {
  "pixel-invaders": {
    title: "Pixel Invaders",
    blurb: "Arcade minigame (Look/Use opens player).",
  },
  hacking: {
    title: "Hacking",
    blurb: "Terminal hack minigame (Look/Use opens player).",
  },
  "sequence-lock": {
    title: "Sequence lock",
    blurb: "Press pads in order. Configure sequence CSV + win flag.",
    configurable: true,
  },
  "slider-puzzle": {
    title: "Slider puzzle",
    blurb: "Reorder segments to match a target. Configure order/target + win flag.",
    configurable: true,
  },
  "dial-lock": {
    title: "Dial lock",
    blurb: "N-position dials. Configure positions, target combo CSV + win flag.",
    configurable: true,
  },
  "wire-match": {
    title: "Wire match",
    blurb: "Match left–right pairs (shuffled). Configure pairs CSV + win flag.",
    configurable: true,
  },
};

/** Parse "3,7,1" → numbers for dial combos. */
function parseCsvNumbers(raw: string): number[] {
  return raw
    .split(/[,|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

/** Parse "a-1, b-2, c-3" or "a:1 | b:2" into [left, right] pairs. */
function parseCsvPairs(raw: string): [string, string][] {
  const out: [string, string][] = [];
  for (const chunk of raw.split(/[,|]+/)) {
    const part = chunk.trim();
    if (!part) continue;
    const m = part.match(/^([^\s:-]+)[\s:-]+([^\s:-]+)$/);
    if (!m) continue;
    const left = suggestId(m[1]!, "L") || m[1]!;
    const right = suggestId(m[2]!, "R") || m[2]!;
    if (left && right) out.push([left, right]);
  }
  return out;
}

function parseCsvIds(raw: string): string[] {
  return raw
    .split(/[,|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => suggestId(s, "pad") || s)
    .filter(Boolean);
}

/**
 * Allowlisted modality / special plugin cards for Guided authors.
 * Only known minigame ids (modalityRegistry), comic ids, and trade templates.
 */
export function PackSpecialsPanel({
  hotspot,
  doc,
  guided = true,
  onAttach,
}: PackSpecialsPanelProps) {
  const current = hotspot?.special
    ? sanitizeJsonPackSpecial(
        hotspot.special,
        new Set(Object.keys(doc.comics ?? {}))
      )
    : null;

  const [tradeRequire, setTradeRequire] = useState(
    current?.kind === "trade" ? current.requireItemId || "" : ""
  );
  const [tradeGive, setTradeGive] = useState(
    current?.kind === "trade" ? current.giveItemId || "" : ""
  );
  const [tradeFlag, setTradeFlag] = useState(
    current?.kind === "trade" ? current.setFlag || "" : "traded"
  );
  const [tradeMsg, setTradeMsg] = useState(
    current?.kind === "trade" ? current.message || "Deal!" : "Deal!"
  );

  const currentSeq =
    current?.kind === "minigame" &&
    current.minigameId === "sequence-lock" &&
    Array.isArray(current.config?.sequence)
      ? (current.config!.sequence as string[]).join(", ")
      : "a, b, c, d";
  const currentSliderOrder =
    current?.kind === "minigame" &&
    current.minigameId === "slider-puzzle" &&
    Array.isArray(current.config?.order)
      ? (current.config!.order as string[]).join(", ")
      : "b, r, g";
  const currentSliderTarget =
    current?.kind === "minigame" &&
    current.minigameId === "slider-puzzle" &&
    Array.isArray(current.config?.target)
      ? (current.config!.target as string[]).join(", ")
      : "r, g, b";
  const currentDialTarget =
    current?.kind === "minigame" &&
    current.minigameId === "dial-lock" &&
    Array.isArray(current.config?.target)
      ? (current.config!.target as number[]).join(", ")
      : "3, 7, 1";
  const currentDialPositions =
    current?.kind === "minigame" &&
    current.minigameId === "dial-lock" &&
    typeof current.config?.positions === "number"
      ? String(current.config.positions)
      : "10";
  const currentWirePairs =
    current?.kind === "minigame" &&
    current.minigameId === "wire-match" &&
    Array.isArray(current.config?.pairs)
      ? (current.config!.pairs as [string, string][])
          .map(([a, b]) => `${a}-${b}`)
          .join(", ")
      : "a-1, b-2, c-3";
  const currentWinFlag =
    current?.kind === "minigame" &&
    typeof current.config?.winFlag === "string"
      ? current.config.winFlag
      : "";

  const [seqCsv, setSeqCsv] = useState(currentSeq);
  const [sliderOrderCsv, setSliderOrderCsv] = useState(currentSliderOrder);
  const [sliderTargetCsv, setSliderTargetCsv] = useState(currentSliderTarget);
  const [dialTargetCsv, setDialTargetCsv] = useState(currentDialTarget);
  const [dialPositions, setDialPositions] = useState(currentDialPositions);
  const [wirePairsCsv, setWirePairsCsv] = useState(currentWirePairs);
  const [seqWinFlag, setSeqWinFlag] = useState(
    current?.minigameId === "sequence-lock"
      ? currentWinFlag || DEFAULT_MINIGAME_WIN_FLAGS["sequence-lock"] || ""
      : DEFAULT_MINIGAME_WIN_FLAGS["sequence-lock"] || "beatSequenceLock"
  );
  const [sliderWinFlag, setSliderWinFlag] = useState(
    current?.minigameId === "slider-puzzle"
      ? currentWinFlag || DEFAULT_MINIGAME_WIN_FLAGS["slider-puzzle"] || ""
      : DEFAULT_MINIGAME_WIN_FLAGS["slider-puzzle"] || "beatSliderPuzzle"
  );
  const [dialWinFlag, setDialWinFlag] = useState(
    current?.minigameId === "dial-lock"
      ? currentWinFlag || DEFAULT_MINIGAME_WIN_FLAGS["dial-lock"] || ""
      : DEFAULT_MINIGAME_WIN_FLAGS["dial-lock"] || "beatDialLock"
  );
  const [wireWinFlag, setWireWinFlag] = useState(
    current?.minigameId === "wire-match"
      ? currentWinFlag || DEFAULT_MINIGAME_WIN_FLAGS["wire-match"] || ""
      : DEFAULT_MINIGAME_WIN_FLAGS["wire-match"] || "beatWireMatch"
  );

  const activeCard = ((): CardId | null => {
    if (!current) return null;
    if (current.kind === "minigame" && current.minigameId) {
      return `minigame:${current.minigameId}`;
    }
    if (current.kind === "comic" && current.comicId) {
      return `comic:${current.comicId}`;
    }
    if (current.kind === "trade") return "trade";
    return null;
  })();

  const simpleMinigameCards = ALLOWED_MINIGAME_IDS.filter(
    (id) => id in modalityRegistry && !MINIGAME_META[id]?.configurable
  ).map((id) => ({
    id: `minigame:${id}` as CardId,
    title: MINIGAME_META[id]?.title ?? id,
    blurb: MINIGAME_META[id]?.blurb ?? "Minigame modality.",
    apply: (): JsonPackSpecial => ({
      kind: "minigame",
      minigameId: id,
      interceptVerbs: ["look", "use"],
    }),
  }));

  const comicCards = Object.keys(doc.comics ?? {}).map((id) => ({
    id: `comic:${id}` as CardId,
    title: `${doc.comics?.[id]?.title ?? id} (comic)`,
    blurb: "Opens comic reader with pack pages.",
    apply: (): JsonPackSpecial => ({
      kind: "comic",
      comicId: id,
      interceptVerbs: ["look", "use"],
    }),
  }));

  if (!hotspot) {
    return (
      <section className="border border-game-border bg-game-ui/90 p-4 space-y-2">
        <h3 className="pixel-font text-sm text-accent">Specials</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Select a hotspot to attach an allowlisted modality (minigame / comic)
          or a simple trade — no TypeScript required.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-game-border bg-game-ui/90 p-3 space-y-3 sm:col-span-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="pixel-font text-sm text-accent">Specials</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Plugin cards for{" "}
            <code className="text-accent">{hotspot.id}</code>. Only allowlisted
            kinds/ids compile into the pack.
          </p>
        </div>
        {current && (
          <button
            type="button"
            className="text-xs text-destructive shrink-0 min-h-[36px] px-2"
            onClick={() => onAttach(undefined)}
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {[...simpleMinigameCards, ...comicCards].map((card) => {
          const selected = activeCard === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                const next = sanitizeJsonPackSpecial(card.apply());
                if (next) onAttach(next);
              }}
              className={`text-left border px-3 py-2 min-h-[64px] transition-colors ${
                selected
                  ? "border-accent bg-accent/15"
                  : "border-border/60 hover:border-accent/50 hover:bg-secondary/30"
              }`}
            >
              <div className="pixel-font text-xs text-foreground">
                {card.title}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                {card.blurb}
              </div>
            </button>
          );
        })}

        {/* Sequence lock */}
        <div
          className={`sm:col-span-2 border px-3 py-2 space-y-2 ${
            activeCard === "minigame:sequence-lock"
              ? "border-accent bg-accent/10"
              : "border-border/60"
          }`}
        >
          <div className="pixel-font text-xs text-foreground">
            Sequence lock
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {MINIGAME_META["sequence-lock"]!.blurb}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="block text-[11px] space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">
                Sequence (CSV pad ids)
              </span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={seqCsv}
                onChange={(e) => setSeqCsv(e.target.value)}
                placeholder="a, b, c, d"
              />
            </label>
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Win flag</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={seqWinFlag}
                onChange={(e) => setSeqWinFlag(e.target.value)}
                placeholder="beatSequenceLock"
              />
            </label>
          </div>
          <button
            type="button"
            className="pixel-font text-xs min-h-[40px] border border-game-border px-3 hover:bg-accent/15"
            onClick={() => {
              const sequence = parseCsvIds(seqCsv);
              const next = sanitizeJsonPackSpecial({
                kind: "minigame",
                minigameId: "sequence-lock",
                interceptVerbs: ["look", "use"],
                config: {
                  sequence: sequence.length >= 2 ? sequence : ["a", "b", "c", "d"],
                  winFlag:
                    suggestId(seqWinFlag, "flag") ||
                    DEFAULT_MINIGAME_WIN_FLAGS["sequence-lock"],
                },
              });
              if (next) onAttach(next);
            }}
          >
            {activeCard === "minigame:sequence-lock"
              ? "Update sequence lock"
              : "Attach sequence lock"}
          </button>
        </div>

        {/* Slider puzzle */}
        <div
          className={`sm:col-span-2 border px-3 py-2 space-y-2 ${
            activeCard === "minigame:slider-puzzle"
              ? "border-accent bg-accent/10"
              : "border-border/60"
          }`}
        >
          <div className="pixel-font text-xs text-foreground">
            Slider puzzle
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {MINIGAME_META["slider-puzzle"]!.blurb}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Start order (CSV)</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={sliderOrderCsv}
                onChange={(e) => setSliderOrderCsv(e.target.value)}
                placeholder="b, r, g"
              />
            </label>
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Target (CSV)</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={sliderTargetCsv}
                onChange={(e) => setSliderTargetCsv(e.target.value)}
                placeholder="r, g, b"
              />
            </label>
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Win flag</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={sliderWinFlag}
                onChange={(e) => setSliderWinFlag(e.target.value)}
                placeholder="beatSliderPuzzle"
              />
            </label>
          </div>
          <button
            type="button"
            className="pixel-font text-xs min-h-[40px] border border-game-border px-3 hover:bg-accent/15"
            onClick={() => {
              const order = parseCsvIds(sliderOrderCsv);
              const target = parseCsvIds(sliderTargetCsv);
              const next = sanitizeJsonPackSpecial({
                kind: "minigame",
                minigameId: "slider-puzzle",
                interceptVerbs: ["look", "use"],
                config: {
                  order: order.length >= 3 ? order.slice(0, 4) : ["b", "r", "g"],
                  target:
                    target.length >= 3 ? target.slice(0, 4) : ["r", "g", "b"],
                  winFlag:
                    suggestId(sliderWinFlag, "flag") ||
                    DEFAULT_MINIGAME_WIN_FLAGS["slider-puzzle"],
                },
              });
              if (next) onAttach(next);
            }}
          >
            {activeCard === "minigame:slider-puzzle"
              ? "Update slider puzzle"
              : "Attach slider puzzle"}
          </button>
        </div>

        {/* Dial lock */}
        <div
          className={`sm:col-span-2 border px-3 py-2 space-y-2 ${
            activeCard === "minigame:dial-lock"
              ? "border-accent bg-accent/10"
              : "border-border/60"
          }`}
        >
          <div className="pixel-font text-xs text-foreground">Dial lock</div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {MINIGAME_META["dial-lock"]!.blurb}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Positions per dial</span>
              <input
                type="number"
                min={2}
                max={12}
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={dialPositions}
                onChange={(e) => setDialPositions(e.target.value)}
                placeholder="10"
              />
            </label>
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Win flag</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={dialWinFlag}
                onChange={(e) => setDialWinFlag(e.target.value)}
                placeholder="beatDialLock"
              />
            </label>
            <label className="block text-[11px] space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">
                Target combo (CSV numbers)
              </span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={dialTargetCsv}
                onChange={(e) => setDialTargetCsv(e.target.value)}
                placeholder="3, 7, 1"
              />
            </label>
          </div>
          <button
            type="button"
            className="pixel-font text-xs min-h-[40px] border border-game-border px-3 hover:bg-accent/15"
            onClick={() => {
              const target = parseCsvNumbers(dialTargetCsv);
              const positions = Math.min(
                12,
                Math.max(2, Math.floor(Number(dialPositions)) || 10)
              );
              const next = sanitizeJsonPackSpecial({
                kind: "minigame",
                minigameId: "dial-lock",
                interceptVerbs: ["look", "use"],
                config: {
                  positions,
                  target: target.length >= 2 ? target.slice(0, 6) : [3, 7, 1],
                  winFlag:
                    suggestId(dialWinFlag, "flag") ||
                    DEFAULT_MINIGAME_WIN_FLAGS["dial-lock"],
                },
              });
              if (next) onAttach(next);
            }}
          >
            {activeCard === "minigame:dial-lock"
              ? "Update dial lock"
              : "Attach dial lock"}
          </button>
        </div>

        {/* Wire match */}
        <div
          className={`sm:col-span-2 border px-3 py-2 space-y-2 ${
            activeCard === "minigame:wire-match"
              ? "border-accent bg-accent/10"
              : "border-border/60"
          }`}
        >
          <div className="pixel-font text-xs text-foreground">Wire match</div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {MINIGAME_META["wire-match"]!.blurb}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="block text-[11px] space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">
                Pairs (CSV left-right, e.g. a-1, b-2)
              </span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={wirePairsCsv}
                onChange={(e) => setWirePairsCsv(e.target.value)}
                placeholder="a-1, b-2, c-3"
              />
            </label>
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Win flag</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={wireWinFlag}
                onChange={(e) => setWireWinFlag(e.target.value)}
                placeholder="beatWireMatch"
              />
            </label>
          </div>
          <button
            type="button"
            className="pixel-font text-xs min-h-[40px] border border-game-border px-3 hover:bg-accent/15"
            onClick={() => {
              const pairs = parseCsvPairs(wirePairsCsv);
              const next = sanitizeJsonPackSpecial({
                kind: "minigame",
                minigameId: "wire-match",
                interceptVerbs: ["look", "use"],
                config: {
                  pairs:
                    pairs.length >= 2
                      ? pairs.slice(0, 8)
                      : [
                          ["a", "1"],
                          ["b", "2"],
                          ["c", "3"],
                        ],
                  winFlag:
                    suggestId(wireWinFlag, "flag") ||
                    DEFAULT_MINIGAME_WIN_FLAGS["wire-match"],
                },
              });
              if (next) onAttach(next);
            }}
          >
            {activeCard === "minigame:wire-match"
              ? "Update wire match"
              : "Attach wire match"}
          </button>
        </div>

        <div
          className={`sm:col-span-2 border px-3 py-2 space-y-2 ${
            activeCard === "trade"
              ? "border-accent bg-accent/10"
              : "border-border/60"
          }`}
        >
          <div className="pixel-font text-xs text-foreground">Trade</div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            After-hook: if the player has an item, swap for another and set a
            flag (NPC trade). No intercept unless you add verbs in Advanced.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Require item id</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={tradeRequire}
                onChange={(e) => setTradeRequire(e.target.value)}
                placeholder="hotpocket"
                list="pack-specials-items"
              />
            </label>
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Give item id</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={tradeGive}
                onChange={(e) => setTradeGive(e.target.value)}
                placeholder="concert_ticket"
                list="pack-specials-items"
              />
            </label>
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Set flag</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={tradeFlag}
                onChange={(e) => setTradeFlag(e.target.value)}
                placeholder="traded"
              />
            </label>
            <label className="block text-[11px] space-y-1">
              <span className="text-muted-foreground">Message</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5 text-xs"
                value={tradeMsg}
                onChange={(e) => setTradeMsg(e.target.value)}
                placeholder="Deal!"
              />
            </label>
          </div>
          <datalist id="pack-specials-items">
            {Object.keys(doc.items ?? {}).map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
          <button
            type="button"
            className="pixel-font text-xs min-h-[40px] border border-game-border px-3 hover:bg-accent/15"
            onClick={() => {
              const requireItemId = suggestId(tradeRequire, "item");
              if (!requireItemId) return;
              const next = sanitizeJsonPackSpecial({
                kind: "trade",
                requireItemId,
                giveItemId: tradeGive.trim()
                  ? suggestId(tradeGive, "item")
                  : undefined,
                setFlag: tradeFlag.trim()
                  ? suggestId(tradeFlag, "flag")
                  : undefined,
                alreadyFlag: tradeFlag.trim()
                  ? suggestId(tradeFlag, "flag")
                  : undefined,
                message: tradeMsg.trim() || "Deal.",
              });
              if (next) onAttach(next);
            }}
          >
            {activeCard === "trade" ? "Update trade" : "Attach trade"}
          </button>
        </div>
      </div>

      {current && (
        <p className="text-[11px] text-muted-foreground">
          Active:{" "}
          <code className="text-accent">
            {current.kind}
            {current.minigameId ? `:${current.minigameId}` : ""}
            {current.comicId ? `:${current.comicId}` : ""}
            {current.requireItemId ? ` ← ${current.requireItemId}` : ""}
            {current.config?.winFlag
              ? ` → ${String(current.config.winFlag)}`
              : ""}
          </code>
          {!guided && " (stored on hotspot.special)"}
        </p>
      )}
    </section>
  );
}
