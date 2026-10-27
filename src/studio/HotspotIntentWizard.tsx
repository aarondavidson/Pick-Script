import { useMemo, useState } from "react";
import { suggestId } from "@/authoring/codegen";
import {
  applyGetItemKit,
  applyLockedExitKit,
  applyUseWithKit,
} from "@/authoring/puzzleKits";
import type { JsonPackDocument, JsonPackHotspot } from "@/engine/jsonPack";

export type HotspotIntent =
  | "get-item"
  | "use-with"
  | "locked-exit"
  | "character"
  | "look-only";

export interface HotspotIntentWizardProps {
  doc: JsonPackDocument;
  roomId: string;
  /** Newly drawn or selected hotspot to configure */
  hotspot: JsonPackHotspot | null;
  open: boolean;
  onClose: () => void;
  onApply: (doc: JsonPackDocument, selectHotspotId?: string) => void;
}

const INTENTS: { id: HotspotIntent; title: string; blurb: string }[] = [
  {
    id: "get-item",
    title: "Get an item",
    blurb: "Player picks up inventory (key, note, tool).",
  },
  {
    id: "use-with",
    title: "Use item on this",
    blurb: "Door, chest, or machine that accepts an item.",
  },
  {
    id: "locked-exit",
    title: "Locked exit",
    blurb: "Gate a room link with a flag or item (no hotspot needed).",
  },
  {
    id: "character",
    title: "Talk character",
    blurb: "NPC with a short dialogue tree.",
  },
  {
    id: "look-only",
    title: "Look / flavor",
    blurb: "Scenery with Look text only.",
  },
];

/**
 * Intent picker → forms that write JsonPackHotspot / link fields.
 */
export function HotspotIntentWizard({
  doc,
  roomId,
  hotspot,
  open,
  onClose,
  onApply,
}: HotspotIntentWizardProps) {
  const [intent, setIntent] = useState<HotspotIntent | null>(null);
  const roomIds = Object.keys(doc.rooms);
  const itemIds = Object.keys(doc.items ?? {});

  // get-item form
  const [itemName, setItemName] = useState("Brass Key");
  const [pickupMsg, setPickupMsg] = useState("You take it.");

  // use-with form
  const [useItemId, setUseItemId] = useState(itemIds[0] || "brass_key");
  const [successMsg, setSuccessMsg] = useState("It works!");
  const [setFlagUw, setSetFlagUw] = useState("unlocked");
  const [consume, setConsume] = useState(true);
  const [giveName, setGiveName] = useState("");

  // locked exit
  const [exitTo, setExitTo] = useState(roomIds.find((id) => id !== roomId) || "");
  const [reqFlag, setReqFlag] = useState("got_key");
  const [blocked, setBlocked] = useState("You can't go that way yet.");

  // character / look
  const [lookText, setLookText] = useState(
    hotspot?.lookText || `You see the ${hotspot?.name || "thing"}.`
  );
  const [speaker, setSpeaker] = useState(hotspot?.name || "Friend");

  const otherRooms = useMemo(
    () => roomIds.filter((id) => id !== roomId),
    [roomIds, roomId]
  );

  if (!open) return null;

  const reset = () => {
    setIntent(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const apply = () => {
    if (!intent) return;

    if (intent === "locked-exit") {
      if (!exitTo || exitTo === roomId) return;
      const next = applyLockedExitKit(doc, {
        from: roomId,
        to: exitTo,
        requireFlag: reqFlag.trim() || undefined,
        blockedMessage: blocked,
      });
      onApply(next);
      close();
      return;
    }

    if (!hotspot) return;

    if (intent === "get-item") {
      const next = applyGetItemKit(doc, roomId, {
        existingHotspotId: hotspot.id,
        hotspotName: hotspot.name,
        x: hotspot.x,
        y: hotspot.y,
        width: hotspot.width,
        height: hotspot.height,
        itemName,
        itemDescription: itemName,
        lookText,
        pickupMessage: pickupMsg,
      });
      onApply(next, hotspot.id);
      close();
      return;
    }

    if (intent === "use-with") {
      const giveItem = giveName.trim()
        ? {
            id: suggestId(giveName, "item"),
            name: giveName.trim(),
            description: giveName.trim(),
          }
        : undefined;
      const next = applyUseWithKit(doc, roomId, {
        existingHotspotId: hotspot.id,
        hotspotName: hotspot.name,
        x: hotspot.x,
        y: hotspot.y,
        width: hotspot.width,
        height: hotspot.height,
        lookText,
        itemId: useItemId,
        successMessage: successMsg,
        alreadyFlag: setFlagUw,
        alreadyMessage: "You already did that.",
        setFlag: setFlagUw,
        consumeItem: consume,
        giveItem,
      });
      onApply(next, hotspot.id);
      close();
      return;
    }

    if (intent === "character") {
      const room = doc.rooms[roomId];
      if (!room) return;
      const patched: JsonPackHotspot = {
        ...hotspot,
        kind: "character",
        verbs: ["look", "talk"],
        actorId: hotspot.actorId || suggestId(hotspot.name, "actor"),
        lookText,
        dialogue: hotspot.dialogue ?? {
          speaker,
          lines: [
            {
              id: "hello",
              text: `Hi — I'm ${speaker}.`,
              choices: [
                {
                  text: "Bye",
                  nextId: "END",
                  optionMode: "normal",
                },
              ],
            },
          ],
        },
      };
      const hotspots = (room.hotspots ?? []).map((h) =>
        h.id === hotspot.id ? patched : h
      );
      onApply(
        {
          ...doc,
          rooms: { ...doc.rooms, [roomId]: { ...room, hotspots } },
        },
        hotspot.id
      );
      close();
      return;
    }

    // look-only
    {
      const room = doc.rooms[roomId];
      if (!room) return;
      const patched: JsonPackHotspot = {
        ...hotspot,
        kind: "interact",
        verbs: ["look"],
        lookText,
        itemId: undefined,
        useWith: undefined,
        actions: undefined,
      };
      const hotspots = (room.hotspots ?? []).map((h) =>
        h.id === hotspot.id ? patched : h
      );
      onApply(
        {
          ...doc,
          rooms: { ...doc.rooms, [roomId]: { ...room, hotspots } },
        },
        hotspot.id
      );
      close();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intent-wizard-title"
    >
      <div className="w-full max-w-lg border border-game-border bg-background shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
          <div>
            <h2
              id="intent-wizard-title"
              className="pixel-font text-sm text-accent"
            >
              Hotspot intent
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {hotspot
                ? `Configuring “${hotspot.name}”`
                : "Pick locked exit (no hotspot required)"}
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground min-h-[36px] px-2"
            onClick={close}
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!intent && (
            <ul className="space-y-2">
              {INTENTS.filter((i) =>
                hotspot ? true : i.id === "locked-exit"
              ).map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setIntent(i.id);
                      if (hotspot?.lookText) setLookText(hotspot.lookText);
                      if (hotspot?.name) {
                        setSpeaker(hotspot.name);
                        setItemName(hotspot.name);
                      }
                    }}
                    className="w-full text-left border border-game-border px-3 py-3 min-h-[44px] hover:bg-secondary/30"
                  >
                    <span className="pixel-font text-xs text-accent block">
                      {i.title}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {i.blurb}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {intent === "get-item" && (
            <div className="space-y-3">
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Item name</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </label>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Look text</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  value={lookText}
                  onChange={(e) => setLookText(e.target.value)}
                />
              </label>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Pickup message</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  value={pickupMsg}
                  onChange={(e) => setPickupMsg(e.target.value)}
                />
              </label>
              <p className="text-[10px] text-muted-foreground">
                Sets flag <code className="text-accent">got_&lt;itemId&gt;</code>{" "}
                automatically (use that on locked exits).
              </p>
            </div>
          )}

          {intent === "use-with" && (
            <div className="space-y-3">
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Required item id</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  list="intent-item-ids"
                  value={useItemId}
                  onChange={(e) =>
                    setUseItemId(suggestId(e.target.value, "item"))
                  }
                />
                <datalist id="intent-item-ids">
                  {itemIds.map((id) => (
                    <option key={id} value={id} />
                  ))}
                </datalist>
              </label>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Success message</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  value={successMsg}
                  onChange={(e) => setSuccessMsg(e.target.value)}
                />
              </label>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Flag when done</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  value={setFlagUw}
                  onChange={(e) =>
                    setSetFlagUw(suggestId(e.target.value, "done"))
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={consume}
                  onChange={(e) => setConsume(e.target.checked)}
                />
                Consume the used item
              </label>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">
                  Give item (optional name)
                </span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  value={giveName}
                  onChange={(e) => setGiveName(e.target.value)}
                  placeholder="Silver Locket"
                />
              </label>
            </div>
          )}

          {intent === "locked-exit" && (
            <div className="space-y-3">
              {otherRooms.length === 0 ? (
                <p className="text-xs text-destructive">
                  Add a second room first, then gate the exit.
                </p>
              ) : (
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Exit to room</span>
                  <select
                    className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                    value={exitTo || otherRooms[0]}
                    onChange={(e) => setExitTo(e.target.value)}
                  >
                    {otherRooms.map((id) => (
                      <option key={id} value={id}>
                        {doc.rooms[id]?.name || id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Require flag</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  value={reqFlag}
                  onChange={(e) =>
                    setReqFlag(suggestId(e.target.value, "flag"))
                  }
                />
              </label>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Blocked message</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  value={blocked}
                  onChange={(e) => setBlocked(e.target.value)}
                />
              </label>
            </div>
          )}

          {(intent === "character" || intent === "look-only") && (
            <div className="space-y-3">
              {intent === "character" && (
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Speaker name</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                  />
                </label>
              )}
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Look text</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  value={lookText}
                  onChange={(e) => setLookText(e.target.value)}
                />
              </label>
            </div>
          )}

          {intent && (
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <button
                type="button"
                className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
                onClick={() => setIntent(null)}
              >
                Back
              </button>
              <button
                type="button"
                className="pixel-font text-xs min-h-[40px] px-4 border-2 border-accent text-accent"
                onClick={apply}
                disabled={
                  intent === "locked-exit" &&
                  (!exitTo || otherRooms.length === 0)
                }
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
