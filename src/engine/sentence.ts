import type { GameDefinition } from "./definition";
import type {
  GameItem,
  GameState,
  Hotspot,
  InteractResult,
  VerbId,
} from "./types";
import { resolveInteraction } from "./interact";
import { getCatalog, resolveLocString } from "./i18n";
import { DEFAULT_VERB_RESPONSES } from "./defaultResponses";
import { uiText, uiTextOr } from "./uiStrings";

export interface Sentence {
  verb: VerbId | null;
  /** Inventory item selected for Use/Give (obj2 in SCUMM doSentence) */
  item: GameItem | null;
  /** Hovered / targeted hotspot name for preview */
  targetName: string | null;
}

/** Build the classic SCUMM sentence line string. */
export function formatSentence(sentence: Sentence): string {
  const { verb, item, targetName } = sentence;
  if (!verb) {
    if (item) return item.name;
    return "";
  }

  // Verb wording and word order come from the interface string table, so a
  // translation can say "{target} ansehen" as easily as "Look at {target}".
  const fallback =
    verb === "look"
      ? "Look at"
      : verb === "talk"
        ? "Talk to"
        : verb === "pickup"
          ? "Pick up"
          : verb.charAt(0).toUpperCase() + verb.slice(1);
  const verbLabel = uiTextOr(`ui.verb.${verb}`, fallback);

  if (verb === "use" && item) {
    return targetName
      ? uiText("ui.sentence.use_with", { item: item.name, target: targetName })
      : uiText("ui.sentence.use_with_open", { item: item.name });
  }

  if (verb === "give" && item) {
    return targetName
      ? uiText("ui.sentence.give_to", { item: item.name, target: targetName })
      : uiText("ui.sentence.give_to_open", { item: item.name });
  }

  if (targetName) {
    return uiText("ui.sentence.verb_target", {
      verb: verbLabel,
      target: targetName,
    });
  }
  return verbLabel;
}

export interface DoSentenceArgs {
  definition: GameDefinition;
  hotspot: Hotspot;
  verb: VerbId;
  state: GameState;
  /** Inventory item for Use/Give with world object */
  withItem?: GameItem | null;
  /** Active locale for message catalogs */
  locale?: string;
}

/**
 * SCUMM doSentence(verb, obj1, obj2) — resolve a full command.
 * Prefer use-with handlers when an inventory item is supplied with Use/Give.
 */
export function doSentence({
  definition,
  hotspot,
  verb,
  state,
  withItem,
  locale,
}: DoSentenceArgs): InteractResult {
  // Use/Give X with/to Y (world target) — same inventory→hotspot path
  if ((verb === "use" || verb === "give") && withItem) {
    return resolveUseWith(definition, hotspot, withItem, state, locale);
  }

  return resolveInteraction(hotspot, verb, state, definition, locale);
}

function resolveUseWith(
  definition: GameDefinition,
  hotspot: Hotspot,
  item: GameItem,
  state: GameState,
  locale?: string
): InteractResult {
  const response =
    hotspot.useWithResponses?.[item.id] ??
    hotspot.useWithResponses?.["*"];

  const catalog = getCatalog(
    definition.i18n,
    locale ?? definition.i18n?.defaultLocale ?? "en"
  );

  if (hotspot.onUseWith) {
    const patch = hotspot.onUseWith(item.id, state) ?? {};
    const message =
      response !== undefined
        ? resolveLocString(response, state, catalog)
        : uiText("ui.default.use_with", {
            item: item.name,
            target: hotspot.name,
          });
    return { message, patch };
  }

  if (response !== undefined) {
    return { message: resolveLocString(response, state, catalog) };
  }

  // Fall back: itemRequired gate (legacy content)
  if (hotspot.itemRequired === item.id) {
    return resolveInteraction(hotspot, "use", state, definition);
  }

  const defaults = {
    ...DEFAULT_VERB_RESPONSES,
    ...definition.defaultVerbResponses,
  };
  const fail =
    defaults.useWith ??
    uiText("ui.default.use_with_fail", {
      item: item.name,
      target: hotspot.name,
    });
  return {
    blocked: true,
    message: typeof fail === "function" ? fail(state) : fail,
  };
}
