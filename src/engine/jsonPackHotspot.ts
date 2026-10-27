/**
 * Compile JSON pack hotspots → engine Hotspot (pickup / character / use-with).
 */

import type { PackAction } from "./packActions";
import { runPackActions, sanitizePackActions } from "./packActions";
import { sanitizeHapticStyle } from "./haptics";
import {
  sanitizeJuiceCue,
  sanitizeJuicePreset,
  type JuiceCue,
} from "./juice";
import { compileJsonDialogue } from "./jsonPackDialogue";
import { isSafeMediaUrl } from "./security";
import type { GameItem, Hotspot, VerbId } from "./types";
import type {
  JsonPackHotspot,
  JsonPackItem,
  JsonPackUseWithRule,
} from "./jsonPackTypes";
import { sanitizeJsonPackSpecial } from "./jsonPackSpecials";

function compileUseWithFields(
  h: JsonPackHotspot,
  useWithRules: JsonPackUseWithRule[],
  look: string
): Partial<Pick<Hotspot, "useWithResponses" | "onUseWith" | "responses">> {
  if (!useWithRules.length) return {};
  const fallback = h.fallbackUseWithMessage || "That doesn't help.";
  const useWithResponses: Hotspot["useWithResponses"] = {
    "*": fallback,
  };
  for (const rule of useWithRules) {
    const msg = rule.message || "It works.";
    const already = rule.alreadyMessage || "You already did that.";
    const flag = rule.alreadyFlag;
    useWithResponses[rule.itemId] = flag
      ? (state) => (state.flags[flag] ? already : msg)
      : msg;
  }
  return {
    responses: {
      look,
      use: h.useText || "Try using an inventory item on it.",
    },
    useWithResponses,
    onUseWith: (itemId, state) => {
      const rule = useWithRules.find((r) => r.itemId === itemId);
      if (!rule) return {};
      if (rule.alreadyFlag && state.flags[rule.alreadyFlag]) return {};
      const flags = { ...state.flags };
      if (rule.setFlag) flags[rule.setFlag] = true;
      if (rule.clearFlag) flags[rule.clearFlag] = false;
      let inventory = state.inventory;
      if (rule.consumeItem) {
        inventory = inventory.filter((i) => i.id !== itemId);
      }
      if (rule.giveItem) {
        if (!inventory.some((i) => i.id === rule.giveItem!.id)) {
          inventory = [...inventory, rule.giveItem];
        }
      }
      return { flags, inventory };
    },
  };
}

/** Compile one JSON pack hotspot into a runtime Hotspot. */
export function compileHotspot(
  h: JsonPackHotspot,
  items?: Record<string, JsonPackItem>,
  roomId?: string
): Hotspot {
  const kind = h.kind ?? "interact";
  const verbs =
    h.verbs ??
    (kind === "character" ? (["look", "talk"] as VerbId[]) : (["look", "use"] as VerbId[]));
  const look =
    h.lookText ||
    (kind === "pickup"
      ? `You take the ${h.itemName || h.name}.`
      : `You see the ${h.name}.`);
  const approach = h.approach
    ? {
        x: Number(h.approach.x.toFixed(1)),
        y: Number(h.approach.y.toFixed(1)),
      }
    : {
        x: Number((h.x + h.width / 2).toFixed(1)),
        y: Math.min(95, Number((h.y + h.height).toFixed(1))),
      };

  const stateOverlays = h.stateOverlays
    ? Object.fromEntries(
        Object.entries(h.stateOverlays)
          .filter(([, v]) => isSafeMediaUrl(v))
          .map(([k, v]) => [Number(k), v])
      )
    : undefined;

  const frames = (h.frames ?? []).filter((u) => isSafeMediaUrl(u));
  const fps =
    typeof h.fps === "number" && Number.isFinite(h.fps)
      ? Math.max(1, Math.min(24, h.fps))
      : undefined;
  const animClass =
    typeof h.animClass === "string" && h.animClass.trim()
      ? h.animClass.trim().slice(0, 40)
      : undefined;

  const special = sanitizeJsonPackSpecial(h.special);
  const base: Hotspot = {
    id: h.id,
    name: h.name,
    x: h.x,
    y: h.y,
    width: h.width,
    height: h.height,
    verbs,
    approach,
    responses: { look },
    interactSound: h.interactSound,
    useWithSound: h.useWithSound,
    interactHaptic: sanitizeHapticStyle(h.interactHaptic),
    useWithHaptic: sanitizeHapticStyle(h.useWithHaptic),
    interactJuice: sanitizeJuicePreset(h.interactJuice),
    useWithJuice: sanitizeJuicePreset(h.useWithJuice),
    initialState: h.initialState,
    stateOverlays,
    ...(frames.length ? { frames } : {}),
    ...(fps != null ? { fps } : {}),
    ...(animClass ? { animClass } : {}),
    // Key into definition.specials (compiled from JsonPackSpecial)
    ...(special ? { special: h.id } : {}),
  };

  const actions = sanitizePackActions(h.actions) as PackAction[];
  const consumesFromActions = actions
    .filter((a): a is Extract<PackAction, { op: "takeItem" }> => a.op === "takeItem")
    .map((a) => a.itemId);
  if (actions.length) {
    const actionVerbs = h.actionVerbs?.length
      ? h.actionVerbs
      : (["look", "use"] as VerbId[]);
    const preview = actions.find(
      (a) => a.op === "message" || a.op === "say"
    );
    if (preview && "text" in preview) {
      for (const v of actionVerbs) {
        base.responses = { ...base.responses, [v]: preview.text };
      }
    }
    const actionHaptics = actions
      .filter((a): a is Extract<PackAction, { op: "haptic" }> => a.op === "haptic")
      .map((a) => a.style);
    if (actionHaptics.length) {
      base.actionHaptics = actionHaptics;
      if (!base.interactHaptic) {
        base.interactHaptic = actionHaptics[actionHaptics.length - 1];
      }
    }
    const actionJuices: JuiceCue[] = [];
    for (const a of actions) {
      if (a.op !== "juice") continue;
      const cue = sanitizeJuiceCue(a);
      if (cue) actionJuices.push(cue);
    }
    if (actionJuices.length) {
      base.actionJuices = actionJuices;
      if (!base.interactJuice) {
        for (const a of actions) {
          if (a.op === "juice" && a.preset) {
            const p = sanitizeJuicePreset(a.preset);
            if (p) {
              base.interactJuice = p;
              break;
            }
          }
        }
      }
    }
    base.onInteract = (verb, state) => {
      if (!actionVerbs.includes(verb)) return {};
      return runPackActions(actions, state).patch;
    };
  }

  const useWithRules = h.useWith ?? [];
  const useWithFields = compileUseWithFields(h, useWithRules, look);
  const consumesFromUseWith = useWithRules
    .filter((r) => r.consumeItem && r.itemId?.trim())
    .map((r) => r.itemId.trim());
  const consumesItems = [...new Set([...consumesFromUseWith, ...consumesFromActions])];
  if (consumesItems.length) {
    base.consumesItems = consumesItems;
  }

  if (kind === "character") {
    const spriteOverlay =
      h.sprite && isSafeMediaUrl(h.sprite) ? h.sprite : undefined;
    return {
      ...base,
      isActor: true,
      actorId: h.actorId || h.id,
      verbs: h.verbs?.length
        ? verbs
        : useWithRules.length
          ? (["look", "talk", "use"] as VerbId[])
          : (["look", "talk"] as VerbId[]),
      dialogue: h.dialogue
        ? compileJsonDialogue(
            h.dialogue,
            items,
            roomId
              ? { roomId, hotspotId: h.id }
              : undefined
          )
        : undefined,
      // Show costume on the hotspot when authors attach a bitmap sprite
      stateOverlays: spriteOverlay
        ? { 0: spriteOverlay, ...(base.stateOverlays ?? {}) }
        : base.stateOverlays,
      animClass: base.animClass || (spriteOverlay ? "bob" : undefined),
      ...useWithFields,
    };
  }

  if (kind === "use-with-target" || useWithRules.length > 0) {
    return {
      ...base,
      verbs: h.verbs?.length ? verbs : (["look", "use"] as VerbId[]),
      responses: {
        look,
        use: h.useText || "Try using an inventory item on it.",
      },
      ...useWithFields,
    };
  }

  if (kind === "pickup" && h.itemId) {
    const itemId = h.itemId;
    const catalog = items?.[itemId];
    const itemName = h.itemName || catalog?.name || h.name;
    const itemDesc =
      h.itemDescription || catalog?.description || itemName;
    const itemIcon = h.itemIcon || catalog?.icon;
    const flag = `got_${itemId}`;
    return {
      ...base,
      responses: {
        look: (state) =>
          state.flags[flag]
            ? "Nothing left here."
            : look,
        use: (state) =>
          state.flags[flag] ? "Already taken." : h.useText || "You pick it up.",
      },
      onInteract: (verb, state) => {
        if (verb !== "look" && verb !== "use") return {};
        if (state.flags[flag]) return {};
        if (state.inventory.some((i) => i.id === itemId)) {
          return { flags: { ...state.flags, [flag]: true } };
        }
        const item: GameItem = {
          id: itemId,
          name: itemName,
          description: itemDesc,
          icon: itemIcon,
        };
        return {
          flags: { ...state.flags, [flag]: true },
          inventory: [...state.inventory, item],
        };
      },
    };
  }

  if (h.useText) {
    base.responses = { ...base.responses, use: h.useText };
  }
  return base;
}
