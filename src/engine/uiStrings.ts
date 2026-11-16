/**
 * Interface text for the play UI — menus, buttons, save dialogs, system
 * messages and screen-reader labels.
 *
 * Game text is translated through a pack's `i18n.messages` catalogs. The same
 * catalogs can translate the interface: add the `ui.*` keys below to a locale
 * and the play UI uses them. Lookup order for a key:
 *
 *   1. the pack's catalog for the active locale
 *   2. a table registered with `registerUiStrings(locale, table)` (host apps)
 *   3. English (this file)
 *
 * `{name}` style placeholders are filled from the `vars` argument.
 * Export every key for a translator with `uiStringsCsv()`.
 */

import type { MessageCatalog } from "./i18n";

export const UI_STRINGS_EN = {
  "ui.a11y.controls": "Game controls",
  "ui.a11y.dialogue": "Conversation with {name}",
  "ui.a11y.exit": "Go to {label}",
  "ui.a11y.exit_sealed": "{label} — blocked",
  "ui.a11y.hotspot": "{name}",
  "ui.a11y.hotspot_verb": "{sentence}",
  "ui.a11y.loading_room": "Loading room art",
  "ui.a11y.locked": "Please wait",
  "ui.a11y.message_dismiss": "Dismiss message",
  "ui.a11y.room_announce": "{name}. {description} {count} things to interact with.",
  "ui.a11y.scene": "Scene: {name}",
  "ui.a11y.scene_help": "Use Tab to move between the things in this room and Enter to interact. Number keys choose an action; H opens hints.",
  "ui.a11y.skip_to_scene": "Skip to the scene",
  "ui.a11y.start": "Start {title}",
  "ui.a11y.verb_choices": "Choose an action for {name}",
  "ui.a11y.verb_selected": "{verb} (selected)",
  "ui.achievements.progress": "{unlocked} / {total} Unlocked",
  "ui.achievements.unlocked_when": "Unlocked {when}",
  "ui.audio.levels": "Audio levels",
  "ui.audio.music": "Music",
  "ui.audio.mute": "Mute",
  "ui.audio.mute_all": "Mute all",
  "ui.audio.pause": "Pause music",
  "ui.audio.play": "Play music",
  "ui.audio.sfx": "Sound effects",
  "ui.audio.unmute": "Unmute",
  "ui.chrome.footer_help": "Inventory: click an item, then a hotspot to use it • Number keys for verbs • H for hints • ESC to deselect • Map for fast travel",
  "ui.chrome.home": "Games",
  "ui.chrome.preview": "preview",
  "ui.comic.page": "Page {page} of {total}",
  "ui.common.cancel": "Cancel",
  "ui.common.close": "Close",
  "ui.common.credits": "Credits",
  "ui.common.next": "Next",
  "ui.common.previous": "Previous",
  "ui.complete.finished": "You finished {title}.",
  "ui.complete.restart": "Restart",
  "ui.complete.thanks": "Thanks for playing!",
  "ui.complete.title": "You win!",
  "ui.consume.body": "Using {item} with {target} will remove it from your inventory. This can’t be undone without loading a save.",
  "ui.consume.confirm": "Use it",
  "ui.consume.title": "Use this item?",
  "ui.cutscene.beat": "Cutscene beat",
  "ui.cutscene.continue": "Continue",
  "ui.cutscene.continue_help": "Click / Space / Enter to continue",
  "ui.cutscene.label": "Cutscene",
  "ui.cutscene.skip": "Skip",
  "ui.cutscene.skip_help": "Click / Space / Enter to continue · Esc to skip",
  "ui.default.need_item": "You need something else to do that.",
  "ui.default.no_combine": "These items don't combine.",
  "ui.default.not_now": "That won't work right now.",
  "ui.default.use_with": "You use the {item} with the {target}.",
  "ui.default.use_with_fail": "The {item} doesn't work with the {target}.",
  "ui.dialogue.captions_off": "Captions off — enable in Settings",
  "ui.dialogue.close": "[Close]",
  "ui.exits.blocked": "You can't go that way right now.",
  "ui.exits.none": "No doors from here — explore hotspots in the room.",
  "ui.exits.nowhere": "That path leads nowhere.",
  "ui.exits.sealed": "{label} · sealed",
  "ui.exits.title": "Exits",
  "ui.hints.exhausted": "No more hints for that.",
  "ui.hints.intro": "Progressive clues — each reveal is clearer. Press H anytime.",
  "ui.hints.latest": "Latest",
  "ui.hints.missing": "No such hint.",
  "ui.hints.no_more": "No more clues",
  "ui.hints.none": "No hints available right now. Keep exploring — or you already solved this thread.",
  "ui.hints.open": "Hints (H)",
  "ui.hints.reveal_first": "Reveal first hint",
  "ui.hints.reveal_next": "Reveal next hint",
  "ui.hints.unavailable": "That hint isn't available right now.",
  "ui.hints.used": "({count} used)",
  "ui.inventory.armed_help": "Click a hotspot in the room (or reopen inventory to change)",
  "ui.inventory.bag": "Bag",
  "ui.inventory.combine": "Combine items",
  "ui.inventory.combine_cancel": "Cancel combine",
  "ui.inventory.combine_help": "Select two items to combine.",
  "ui.inventory.combine_next": "Click another item to combine, or click again to deselect",
  "ui.inventory.combine_off": "Combine mode off",
  "ui.inventory.combine_on": "Combine mode — select two items",
  "ui.inventory.deselected": "Deselected {name}.",
  "ui.inventory.empty": "Your inventory is empty.",
  "ui.inventory.empty_hint": "Explore to find items!",
  "ui.inventory.give_with": "Give {name} to… (click someone in the room)",
  "ui.inventory.selected": "Selected {name}. Click another item to combine.",
  "ui.inventory.title": "Inventory",
  "ui.inventory.use_help": "Click an item, then click something in the room to use it with.",
  "ui.inventory.use_with": "Use {name} with… (click something in the room)",
  "ui.journal.empty": "Your journal is empty. Examine things in the world to record your findings.",
  "ui.journal.read": "Read Entry",
  "ui.map.fast_travel": "Fast travel",
  "ui.map.fog": "Shrouded in fog",
  "ui.map.from_here": "From here",
  "ui.map.help_any": "Tap a location to travel",
  "ui.map.help_fog": "Fog lifts as you explore and the story advances",
  "ui.map.help_visited": "Tap a visited location to fast travel",
  "ui.map.title": "World Map",
  "ui.menu.achievements": "Achievements",
  "ui.menu.extras": "Game extras",
  "ui.menu.hints": "Hints",
  "ui.menu.journal": "Journal",
  "ui.menu.map": "Map",
  "ui.menu.open": "Game menu",
  "ui.menu.quests": "Quests",
  "ui.menu.settings": "Settings",
  "ui.menu.title": "Menu",
  "ui.minigame.abort": "ABORT",
  "ui.minigame.already_unlocked": "Already unlocked",
  "ui.minigame.dial.dials": "Combination dials",
  "ui.minigame.dial.help": "Turn each dial until the combination matches. {dials} dials · {positions} positions.",
  "ui.minigame.dial.prompt": "ENTER COMBO",
  "ui.minigame.dial.title": "DIAL LOCK",
  "ui.minigame.dial.win": "Combination matched. Lock disengaged.",
  "ui.minigame.done": "DONE",
  "ui.minigame.play_again": "PLAY AGAIN",
  "ui.minigame.quit": "QUIT",
  "ui.minigame.retry": "TRY AGAIN",
  "ui.minigame.sequence.help": "Press the pads in the correct order. A wrong press resets the sequence.",
  "ui.minigame.sequence.pads": "Lock pads",
  "ui.minigame.sequence.prompt": "ENTER SEQUENCE",
  "ui.minigame.sequence.title": "SEQUENCE LOCK",
  "ui.minigame.sequence.win": "The sequence matched. Lock disengaged.",
  "ui.minigame.slider.already": "Already aligned",
  "ui.minigame.slider.done": "ALIGNED",
  "ui.minigame.slider.help": "Tap a segment to swap it with the next until the pattern matches the target.",
  "ui.minigame.slider.prompt": "ALIGN SEGMENTS",
  "ui.minigame.slider.segments": "Slider segments",
  "ui.minigame.slider.title": "SLIDER PANEL",
  "ui.minigame.slider.win": "Panel segments match the target pattern.",
  "ui.minigame.start": "START",
  "ui.minigame.unlocked": "UNLOCKED",
  "ui.minigame.wire.already": "Already matched",
  "ui.minigame.wire.done": "MATCHED",
  "ui.minigame.wire.help": "Connect each left terminal to its matching right end. Wrong pairs reset the selection.",
  "ui.minigame.wire.left": "Left terminals",
  "ui.minigame.wire.pick_left": "Pick a left terminal",
  "ui.minigame.wire.pick_right": "Left: {left} — pick right",
  "ui.minigame.wire.prompt": "MATCH WIRES",
  "ui.minigame.wire.right": "Right terminals",
  "ui.minigame.wire.title": "WIRE MATCH",
  "ui.minigame.wire.win": "All wires connected correctly.",
  "ui.msg.achievement": "Achievement Unlocked: {title}!",
  "ui.msg.now_controlling": "Now controlling {name}.",
  "ui.msg.quest_done": "Quest Completed: {title}!",
  "ui.msg.quest_new": "New Quest: {title}!",
  "ui.msg.unknown_minigame": "Unknown minigame “{id}” — no player registered.",
  "ui.objective.goal": "Goal",
  "ui.objective.label": "Objective",
  "ui.objective.wrap_up": "— wrap up",
  "ui.quests.active": "Active Quests",
  "ui.quests.completed": "Completed",
  "ui.quests.empty": "No quests yet. Explore to find your purpose.",
  "ui.quests.log": "Quest Log",
  "ui.room.loading": "Loading…",
  "ui.room.not_found": "Location not found",
  "ui.save.autosave": "Autosave",
  "ui.save.autosave_deleted": "Autosave deleted!",
  "ui.save.autosave_incompatible": "Incompatible autosave.",
  "ui.save.autosave_loaded": "Autosave loaded!",
  "ui.save.autosave_restored": "Autosave restored.",
  "ui.save.backup_help": "Backups work across browsers and survive cleared site data.",
  "ui.save.click_to_save": "Click to save",
  "ui.save.deleted_slot": "Save slot {slot} deleted!",
  "ui.save.empty_slot": "Empty slot",
  "ui.save.export": "Export backup",
  "ui.save.exported": "Save backup downloaded",
  "ui.save.import": "Import backup",
  "ui.save.import_failed": "Import failed",
  "ui.save.imported": "Imported {count} save(s)",
  "ui.save.incompatible": "Incompatible save.",
  "ui.save.incompatible_version": "Incompatible version",
  "ui.save.items_count": "{count} items",
  "ui.save.load_game": "Load Game",
  "ui.save.loaded_slot": "Game loaded from slot {slot}!",
  "ui.save.loaded_slot_version": "Game loaded from slot {slot} (v{version})!",
  "ui.save.no_autosave": "No autosave found.",
  "ui.save.restore_autosave": "Restore Autosave",
  "ui.save.save_game": "Save Game",
  "ui.save.saved_slot": "Saved to slot {slot}",
  "ui.save.saved_slot_ok": "Game saved to slot {slot}!",
  "ui.save.slot": "Slot {slot}",
  "ui.save.slot_summary": "{items} items • {flags} flags",
  "ui.save.storage_device": "Saves are kept in {name} storage on this device.",
  "ui.save.storage_idb": "Saves use IndexedDB (mirrored to localStorage).",
  "ui.save.storage_ls": "Saves use localStorage only — export a backup for extra safety.",
  "ui.save.storage_memory": "Storage is temporary — export a backup before closing this tab.",
  "ui.sentence.give_to": "Give {item} to {target}",
  "ui.sentence.give_to_open": "Give {item} to",
  "ui.sentence.use_with": "Use {item} with {target}",
  "ui.sentence.use_with_open": "Use {item} with",
  "ui.sentence.verb_target": "{verb} {target}",
  "ui.settings.audio": "Audio",
  "ui.settings.captions": "Captions",
  "ui.settings.captions_help": "Speech bar and dialogue text. VO still plays when off.",
  "ui.settings.captions_off": "Captions off",
  "ui.settings.captions_on": "Captions on",
  "ui.settings.game": "Game",
  "ui.settings.language": "Language",
  "ui.settings.motion": "Motion",
  "ui.settings.motion_help": "Softens screen shake and particle bursts. Follows system preference until you toggle.",
  "ui.settings.motion_reduce": "Reduce motion",
  "ui.settings.motion_reduced": "Reduced motion on",
  "ui.settings.text_size": "Text size",
  "ui.settings.verb_mode": "Verb mode",
  "ui.settings.verbs_classic": "Classic (7 verbs)",
  "ui.settings.verbs_coin": "Verb coin (Look / Talk / Use)",
  "ui.settings.verbs_simple": "Simple (Look / Use)",
  "ui.speech.skip": "Skip speech",
  "ui.speech.skip_help": "Click / Space to skip",
  "ui.speech.skip_help_captions_off": "Click / Space to skip · captions off",
  "ui.speech.skip_hint": "Speech — click to skip",
  "ui.start.platforms": "Web · iOS · point-and-click",
  "ui.start.preview_button": "Start preview",
  "ui.start.preview_prompt": "Tap to unlock audio & start preview",
  "ui.start.prompt": "Tap anywhere to enable audio and begin",
  "ui.stuck.dismiss": "Not now",
  "ui.stuck.show": "Show hint",
  "ui.stuck.title": "Need a hint?",
  "ui.tip.rotate": "Tip: turn your phone sideways for a bigger scene.",
  "ui.verb.give": "Give",
  "ui.verb.look": "Look at",
  "ui.verb.open": "Open",
  "ui.verb.pickup": "Pick up",
  "ui.verb.pull": "Pull",
  "ui.verb.push": "Push",
  "ui.verb.short.give": "Give",
  "ui.verb.short.look": "Look",
  "ui.verb.short.open": "Open",
  "ui.verb.short.pickup": "Pick",
  "ui.verb.short.pull": "Pull",
  "ui.verb.short.push": "Push",
  "ui.verb.short.talk": "Talk",
  "ui.verb.short.use": "Use",
  "ui.verb.talk": "Talk to",
  "ui.verb.use": "Use",
  "ui.verbs.coin_help": "Click a hotspot to open the Look / Talk / Use coin. Inventory still arms Use-with.",
  "ui.verbs.coin_title": "Verb coin",
  "ui.verbs.keys_help": "Press 1-{last} or ESC",
  "ui.verbs.title": "Actions",
} as const;

export type UiStringKey = keyof typeof UI_STRINGS_EN;
export type UiStringTable = Partial<Record<UiStringKey, string>>;

const registered: Record<string, UiStringTable> = {};

/** Add or extend an interface translation, e.g. `registerUiStrings("es", {...})`. */
export function registerUiStrings(locale: string, table: UiStringTable): void {
  registered[locale] = { ...(registered[locale] ?? {}), ...table };
}

let activeLocale = "en";
let activeCatalog: MessageCatalog = {};

/**
 * Set by the provider whenever the game or language changes; `uiText` reads
 * it. One game plays at a time, so this is module state rather than context —
 * engine code outside React (default responses, travel results) needs it too.
 */
export function setActiveUiLocale(
  locale: string,
  catalog: MessageCatalog = {}
): void {
  activeLocale = locale || "en";
  activeCatalog = catalog;
}

export function getActiveUiLocale(): string {
  return activeLocale;
}

function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole
  );
}

/** Translate one interface string for a given locale + pack catalog. */
export function translateUi(
  key: UiStringKey,
  options: {
    locale?: string;
    catalog?: MessageCatalog;
    vars?: Record<string, string | number>;
  } = {}
): string {
  const locale = options.locale ?? "en";
  const base = locale.split("-")[0];
  const text =
    options.catalog?.[key] ??
    registered[locale]?.[key] ??
    registered[base]?.[key] ??
    UI_STRINGS_EN[key] ??
    key;
  return fill(text, options.vars);
}

/** Interface string in the language the current game is being played in. */
export function uiText(
  key: UiStringKey,
  vars?: Record<string, string | number>
): string {
  return translateUi(key, { locale: activeLocale, catalog: activeCatalog, vars });
}

/** Like `uiText` for keys built at runtime (e.g. `ui.verb.<id>`), with a fallback. */
export function uiTextOr(
  key: string,
  fallback: string,
  vars?: Record<string, string | number>
): string {
  if (key in UI_STRINGS_EN && !(key in activeCatalog)) {
    const text = translateUi(key as UiStringKey, {
      locale: activeLocale,
      catalog: activeCatalog,
    });
    // English table is only a default: an author-supplied label wins over it
    return fill(
      text === UI_STRINGS_EN[key as UiStringKey] ? fallback : text,
      vars
    );
  }
  return fill(activeCatalog[key] ?? fallback, vars);
}

/** `key,english` CSV of every interface string — hand it to a translator. */
export function uiStringsCsv(): string {
  const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = (Object.keys(UI_STRINGS_EN) as UiStringKey[]).map(
    (k) => `${cell(k)},${cell(UI_STRINGS_EN[k])}`
  );
  return ["key,en", ...rows].join("\n");
}
