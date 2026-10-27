import type { GameDefinition } from "./definition";
import type {
  GameState,
  Hotspot,
  InteractResult,
  VerbId,
} from "./types";
import { getCatalog, resolveLocString } from "./i18n";
import { getDefaultVerbResponse } from "./defaultResponses";

/**
 * Resolve a verb+hotspot interaction (SCUMM object verb script).
 * Pure — returns message/patch/dialogue; UI applies side effects.
 */
export function resolveInteraction(
  hotspot: Hotspot,
  verb: VerbId,
  state: GameState,
  definition?: GameDefinition,
  locale?: string
): InteractResult {
  // Talk/use on dialogue-bearing hotspots opens conversation
  // (Use with inventory item is handled by doSentence before this)
  if ((verb === "talk" || verb === "use") && hotspot.dialogue) {
    return { openDialogue: hotspot.dialogue };
  }

  if (!hotspot.verbs.includes(verb)) {
    return {
      blocked: true,
      message: getDefaultVerbResponse(
        definition?.defaultVerbResponses,
        verb,
        state
      ),
    };
  }

  if (
    hotspot.itemRequired &&
    !state.inventory.some((i) => i.id === hotspot.itemRequired)
  ) {
    return {
      blocked: true,
      message: "You need something else to do that.",
    };
  }

  const catalog = getCatalog(
    definition?.i18n,
    locale ?? definition?.i18n?.defaultLocale ?? "en"
  );
  const response = hotspot.responses[verb];
  const message =
    response !== undefined
      ? resolveLocString(response, state, catalog)
      : undefined;
  const patch = hotspot.onInteract?.(verb, state) ?? {};

  let journalAdded = false;
  if (
    hotspot.journalEntry &&
    message &&
    (verb === "look" || verb === "use")
  ) {
    const already = state.journalEntries.some(
      (e) => e.id === hotspot.journalEntry!.id
    );
    if (!already) {
      journalAdded = true;
    }
  }

  return {
    message:
      journalAdded && message
        ? `${message}\n\n📔 Added to journal.`
        : message,
    patch,
    journalAdded,
  };
}
