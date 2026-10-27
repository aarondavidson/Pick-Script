import { describe, expect, it } from "vitest";
import { createGame } from "@/engine/createGame";
import { createGameFromJson, validateJsonPack } from "@/engine/jsonPack";
import {
  PACK_TEMPLATES,
  createPackFromTemplate,
  type PackTemplateId,
} from "@/authoring/packTemplates";
import { buildPlaytestChecklist } from "@/authoring/playtestChecklist";
import { diagnosePack } from "@/engine/packDoctor";

const TINY =
  "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

function withArt(doc: ReturnType<typeof createPackFromTemplate>) {
  for (const id of Object.keys(doc.rooms)) {
    doc.rooms[id] = { ...doc.rooms[id]!, image: TINY };
  }
  return doc;
}

describe("packTemplates", () => {
  it("exports eight starters", () => {
    expect(PACK_TEMPLATES.length).toBeGreaterThanOrEqual(8);
  });

  it.each(
    PACK_TEMPLATES.map((t) => t.id) as PackTemplateId[]
  )("template %s validates with art", (templateId) => {
    const doc = withArt(
      createPackFromTemplate({
        id: `${templateId}-test`,
        title: templateId,
        templateId,
      })
    );
    expect(validateJsonPack(doc).ok).toBe(true);
  });

  it("key-door template plays pickup → use-with", () => {
    const doc = withArt(
      createPackFromTemplate({
        id: "key-door-test",
        title: "Key Door",
        templateId: "key-door",
      })
    );
    expect(validateJsonPack(doc).ok).toBe(true);
    expect(doc.verbMode).toBe("coin");
    expect(doc.quests?.[0]?.objectiveFlags).toEqual([
      "got_brass_key",
      "chest_open",
    ]);
    expect(doc.hints?.[0]?.untilFlag).toBe("chest_open");

    const def = createGameFromJson(doc);
    const game = createGame(def);
    let state = game.createInitialState();
    const desk = def.rooms[doc.startRoom]!.hotspots!.find((h) => h.id === "desk")!;
    state = { ...state, ...desk.onInteract?.("use", state) };
    expect(state.inventory.some((i) => i.id === "brass_key")).toBe(true);

    const chest = def.rooms[doc.startRoom]!.hotspots!.find(
      (h) => h.id === "chest"
    )!;
    state = { ...state, ...chest.onUseWith?.("brass_key", state) };
    expect(state.flags.chest_open).toBe(true);
  });

  it("two-room template gates exit on got_hall_pass", () => {
    const doc = withArt(
      createPackFromTemplate({
        id: "two-room-test",
        title: "Two Room",
        templateId: "two-room",
      })
    );
    const link = (doc.links ?? []).find((l) => l.to === "hallway");
    expect(link?.requireFlag).toBe("got_hall_pass");
    const checklist = buildPlaytestChecklist(doc);
    expect(checklist.find((c) => c.id === "pickup")?.done).toBe(true);
    expect(checklist.find((c) => c.id === "puzzle")?.done).toBe(true);
  });

  it("talk-gate compiles setFlag on dialogue choice", () => {
    const doc = withArt(
      createPackFromTemplate({
        id: "talk-gate-test",
        title: "Talk",
        templateId: "talk-gate",
      })
    );
    const def = createGameFromJson(doc);
    const guard = def.rooms[doc.startRoom]!.hotspots!.find(
      (h) => h.id === "guard"
    )!;
    const choice = guard.dialogue!.nodes.hello!.choices!.find(
      (c) => c.choiceId === "sesame"
    )!;
    expect(choice.action).toBeTypeOf("function");
    const result = choice.action!({ flags: {} } as never);
    expect(result?.flags?.guard_convinced).toBe(true);
  });

  it("starters without art surface on setup board", () => {
    const doc = createPackFromTemplate({
      id: "no-art",
      title: "No Art",
      templateId: "map-hub",
    });
    const report = diagnosePack(doc);
    expect(report.summary.missingRoomArt).toBeGreaterThanOrEqual(3);
  });

  it("short-mystery has 5 rooms, gated lighthouse, and a hint", () => {
    const doc = withArt(
      createPackFromTemplate({
        id: "short-mystery-test",
        title: "Harbor Mystery",
        templateId: "short-mystery",
      })
    );
    expect(Object.keys(doc.rooms)).toHaveLength(5);
    expect(doc.rooms.lighthouse).toBeTruthy();
    expect(doc.rooms.boathouse).toBeTruthy();
    expect(doc.verbMode).toBe("coin");
    const gated = (doc.links ?? []).find((l) => l.to === "lighthouse");
    expect(gated?.requireFlag).toBe("got_harbor_key");
    expect(doc.hints?.[0]?.untilFlag).toBe("got_harbor_key");
    expect(doc.hints?.[0]?.tiers?.length).toBeGreaterThanOrEqual(2);
    expect(validateJsonPack(doc).ok).toBe(true);
    const checklist = buildPlaytestChecklist(doc);
    expect(checklist.find((c) => c.id === "pickup")?.done).toBe(true);
    expect(checklist.find((c) => c.id === "puzzle")?.done).toBe(true);
    expect(checklist.find((c) => c.id === "music")?.done).toBe(true);
  });
});
