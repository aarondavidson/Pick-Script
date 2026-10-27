import type { GameDefinition } from "@/engine";
import { harborFogGame } from "./harbor-fog/manifest";
import { atticStudyGame } from "./attic-study/manifest";
import { templateGame } from "./_template/manifest";

export interface GameCatalogEntry {
  id: string;
  title: string;
  subtitle?: string;
  version: string;
  blurb: string;
  definition: GameDefinition;
}

/** Product catalog for this repository. */
export const gameCatalog: GameCatalogEntry[] = [
  {
    id: harborFogGame.id,
    title: harborFogGame.title,
    subtitle: harborFogGame.subtitle,
    version: harborFogGame.version,
    blurb:
      "5–10 min dockside mystery — two NPCs, key→chest, trade for the lighthouse.",
    definition: harborFogGame,
  },
  {
    id: atticStudyGame.id,
    title: atticStudyGame.title,
    subtitle: atticStudyGame.subtitle,
    version: atticStudyGame.version,
    blurb:
      "One room, two puzzles, real art + sound — the fastest way to learn the engine.",
    definition: atticStudyGame,
  },
  {
    id: templateGame.id,
    title: templateGame.title,
    subtitle: templateGame.subtitle,
    version: templateGame.version,
    blurb:
      "Starter pack — one puzzle (note → key → hall), multi-ego, hints, i18n.",
    definition: templateGame,
  },
];

export function getGameById(id: string): GameCatalogEntry | null {
  return gameCatalog.find((g) => g.id === id) ?? null;
}

export function getGameDefinition(id: string): GameDefinition | null {
  return getGameById(id)?.definition ?? null;
}
