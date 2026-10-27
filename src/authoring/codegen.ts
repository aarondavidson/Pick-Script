/**
 * Emit paste-ready TypeScript for pack authors (hotspots, pickups, combines, audio).
 */

import type {
  DraftCustomSfx,
  DraftMusicCue,
  DraftRoomMusic,
  DraftSfxBinding,
} from "./audioPresets";

export type HotspotKind =
  | "interact"
  | "pickup"
  | "use-with-target"
  | "character";

export interface DraftHotspot {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  verbs: string[];
  kind: HotspotKind;
  /** Pickup / inventory item */
  itemId?: string;
  itemName?: string;
  itemDescription?: string;
  /** Look text */
  lookText?: string;
  /** Actor id when kind === character */
  actorId?: string;
  /** Built-in or PackAudio.sfx key on successful interact */
  interactSound?: string;
  /** Built-in or PackAudio.sfx key on successful use-with */
  useWithSound?: string;
}

export interface DraftCombination {
  itemA: string;
  itemB: string;
  resultId: string;
  resultName: string;
  resultDescription: string;
  successMessage?: string;
}

export interface DraftOverlay {
  id: string;
  name: string;
  /** Room % box */
  x: number;
  y: number;
  width: number;
  height: number;
  role: "decoration" | "pickup" | "character";
  itemId?: string;
  itemName?: string;
  itemDescription?: string;
  /** Suggested asset filename */
  assetFile?: string;
}

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export function suggestId(name: string, fallback = "hotspot"): string {
  return slug(name) || fallback;
}

function soundProps(h: DraftHotspot): string {
  const lines: string[] = [];
  if (h.interactSound) {
    lines.push(`  interactSound: "${h.interactSound}",`);
  }
  if (h.useWithSound) {
    lines.push(`  useWithSound: "${h.useWithSound}",`);
  }
  return lines.length ? `\n${lines.join("\n")}` : "";
}

export function formatHotspotDraft(h: DraftHotspot): string {
  const verbs = JSON.stringify(h.verbs.length ? h.verbs : ["look", "use"]);
  const look =
    h.lookText?.replace(/`/g, "'") ||
    (h.kind === "pickup"
      ? `You take the ${h.itemName || h.name}.`
      : `You see the ${h.name}.`);
  const approachX = Number((h.x + h.width / 2).toFixed(1));
  const approachY = Number((h.y + h.height).toFixed(1));
  const sounds = soundProps(h);

  if (h.kind === "pickup" && h.itemId) {
    const itemName = h.itemName || h.name;
    const itemDesc = h.itemDescription || itemName;
    const flag = `got_${h.itemId}`;
    return `{
  id: "${h.id}",
  name: "${h.name}",
  x: ${h.x.toFixed(1)},
  y: ${h.y.toFixed(1)},
  width: ${h.width.toFixed(1)},
  height: ${h.height.toFixed(1)},
  verbs: ${verbs},
  approach: { x: ${approachX}, y: ${Math.min(95, approachY)} },${sounds}
  responses: {
    look: (state) =>
      state.flags.${flag}
        ? "Nothing left here."
        : "${look}",
    use: (state) =>
      state.flags.${flag}
        ? "Already taken."
        : "You pick it up.",
  },
  onInteract: (verb, state) => {
    if (verb !== "look" && verb !== "use") return {};
    if (state.flags.${flag}) return {};
    if (state.inventory.some((i) => i.id === "${h.itemId}")) {
      return { flags: { ...state.flags, ${flag}: true } };
    }
    return {
      flags: { ...state.flags, ${flag}: true },
      inventory: [
        ...state.inventory,
        {
          id: "${h.itemId}",
          name: "${itemName}",
          description: "${itemDesc}",
          // icon: ${h.itemId}Icon, // Vite-import from assets/items/
        },
      ],
    };
  },
},`;
  }

  if (h.kind === "character") {
    const actor = h.actorId || h.id;
    return `{
  id: "${h.id}",
  name: "${h.name}",
  x: ${h.x.toFixed(1)},
  y: ${h.y.toFixed(1)},
  width: ${h.width.toFixed(1)},
  height: ${h.height.toFixed(1)},
  verbs: ["look", "talk"],
  isActor: true,
  actorId: "${actor}",
  approach: { x: ${approachX}, y: ${Math.min(95, approachY)} },${sounds}
  responses: {
    look: "${look}",
  },
  // dialogue: { startNode: "start", nodes: { ... } },
},`;
  }

  if (h.kind === "use-with-target") {
    return `{
  id: "${h.id}",
  name: "${h.name}",
  x: ${h.x.toFixed(1)},
  y: ${h.y.toFixed(1)},
  width: ${h.width.toFixed(1)},
  height: ${h.height.toFixed(1)},
  verbs: ${verbs},
  approach: { x: ${approachX}, y: ${Math.min(95, approachY)} },${sounds}
  responses: {
    look: "${look}",
    use: "Try using an inventory item on it.",
  },
  useWithResponses: {
    // my_item: "It works!",
    "*": "That doesn't help.",
  },
  onUseWith: (itemId, state) => {
    // if (itemId === "my_item") return { flags: { ...state.flags, used: true } };
    return {};
  },
},`;
  }

  return `{
  id: "${h.id}",
  name: "${h.name}",
  x: ${h.x.toFixed(1)},
  y: ${h.y.toFixed(1)},
  width: ${h.width.toFixed(1)},
  height: ${h.height.toFixed(1)},
  verbs: ${verbs},
  approach: { x: ${approachX}, y: ${Math.min(95, approachY)} },${sounds}
  responses: {
    look: "${look}",
  },
},`;
}

export function formatHotspotsArray(hotspots: DraftHotspot[]): string {
  if (hotspots.length === 0) return "hotspots: [],";
  const body = hotspots.map((h) => formatHotspotDraft(h)).join(",\n");
  return `hotspots: [\n${body}\n],`;
}

export function combinationKey(a: string, b: string): string {
  return `${a}+${b}`;
}

export function formatCombinationDraft(c: DraftCombination): string {
  const key = combinationKey(c.itemA, c.itemB);
  const success = c.successMessage
    ? `\n    successMessage: "${c.successMessage.replace(/"/g, '\\"')}",`
    : "";
  return `"${key}": {
  items: ["${c.itemA}", "${c.itemB}"],
  result: {
    id: "${c.resultId}",
    name: "${c.resultName}",
    description: "${c.resultDescription.replace(/"/g, '\\"')}",
    // icon: ${c.resultId}Icon,
  },${success}
},`;
}

export function formatCombinationsObject(list: DraftCombination[]): string {
  if (list.length === 0) return "combinations: {},";
  const body = list.map((c) => formatCombinationDraft(c)).join("\n");
  return `combinations: {\n${body}\n},`;
}

/** Turn a placed overlay into a draft hotspot (pickup or character). */
export function overlayToHotspot(o: DraftOverlay): DraftHotspot {
  if (o.role === "character") {
    return {
      id: o.id,
      name: o.name,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      verbs: ["look", "talk"],
      kind: "character",
      actorId: o.id,
      lookText: `It's ${o.name}.`,
    };
  }
  if (o.role === "pickup") {
    const itemId = o.itemId || o.id;
    return {
      id: o.id,
      name: o.name,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      verbs: ["look", "use"],
      kind: "pickup",
      itemId,
      itemName: o.itemName || o.name,
      itemDescription: o.itemDescription || o.name,
      lookText: `A ${o.name} you can take.`,
    };
  }
  return {
    id: o.id,
    name: o.name,
    x: o.x,
    y: o.y,
    width: o.width,
    height: o.height,
    verbs: ["look"],
    kind: "interact",
    lookText: `You notice the ${o.name}.`,
  };
}

/** Full `audio.ts` PackAudio module snippet. */
export function formatPackAudioModule(opts: {
  exportName?: string;
  defaultMusic?: string;
  cues: DraftMusicCue[];
  customSfx?: DraftCustomSfx[];
}): string {
  const exportName = opts.exportName || "packAudio";
  const musicLines = opts.cues
    .map((c) => {
      if (c.fileSrc?.trim()) {
        const bed = {
          src: c.fileSrc.trim(),
          loop: true,
          ...(c.fileGain != null ? { gain: c.fileGain } : {}),
          fallbackPreset: c.fallbackPreset || c.preset,
        };
        return `    ${JSON.stringify(c.cue)}: ${JSON.stringify(bed)},`;
      }
      return `    ${JSON.stringify(c.cue)}: ${JSON.stringify(c.preset)},`;
    })
    .join("\n");
  const ambientLines = opts.cues
    .filter((c) => c.ambient && c.ambient !== "none")
    .map((c) => `    ${JSON.stringify(c.cue)}: ${JSON.stringify(c.ambient)},`)
    .join("\n");
  const sfxImports = (opts.customSfx || [])
    .map(
      (s) =>
        `import ${suggestId(s.key, "sfx")}Sfx from "./assets/sfx/${s.filename}";`
    )
    .join("\n");
  const sfxEntries = [
    `    // pickup / success are played automatically by the host`,
    `    // pickup: myPickupSfx,`,
    `    // success: mySuccessSfx,`,
    ...(opts.customSfx || []).map(
      (s) => `    ${JSON.stringify(s.key)}: ${suggestId(s.key, "sfx")}Sfx,`
    ),
  ].join("\n");

  const defaultMusic = opts.defaultMusic
    ? `  defaultMusic: ${JSON.stringify(opts.defaultMusic)},\n`
    : opts.cues[0]
      ? `  defaultMusic: ${JSON.stringify(opts.cues[0].cue)},\n`
      : "";

  return `import type { PackAudio } from "@/engine/audio";
${sfxImports ? sfxImports + "\n" : ""}
export const ${exportName}: PackAudio = {
${defaultMusic}  music: {
${musicLines || "    // home: \"calm\","}
  },
  ambient: {
${ambientLines || "    // home: \"hum\","}
  },
  sfx: {
${sfxEntries}
  },
};
`;
}

/** Room field lines: `music: "cue"` */
export function formatRoomMusicAssignments(rooms: DraftRoomMusic[]): string {
  if (!rooms.length) return "// No room music assignments yet";
  return rooms
    .map(
      (r) =>
        `// rooms.${r.roomId}\nmusic: ${JSON.stringify(r.musicCue)},`
    )
    .join("\n\n");
}

/** Hotspot sound field patches from Audio bindings. */
export function formatSfxBindingPatches(bindings: DraftSfxBinding[]): string {
  if (!bindings.length) return "// No interact SFX bindings yet";
  return bindings
    .map((b) => {
      const field =
        b.when === "useWith" ? "useWithSound" : "interactSound";
      return `// hotspot id: ${b.hotspotId}\n${field}: ${JSON.stringify(b.soundKey)},`;
    })
    .join("\n\n");
}
