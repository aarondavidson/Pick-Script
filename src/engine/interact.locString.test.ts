import { describe, expect, it } from "vitest";
import { resolveInteraction } from "./interact";
import { createInitialState } from "./state";
import { templateGame } from "@/games/_template/manifest";

const note = templateGame.rooms.start!.hotspots!.find((h) => h.id === "note")!;

describe("state-gated, translatable responses", () => {
  it("first Use on the template note gives the key with matching text", () => {
    const state = createInitialState(templateGame);
    const r = resolveInteraction(note, "use", state, templateGame, "en");
    expect(r.message).toMatch(/brass key was stuck underneath/);
    expect(r.patch?.inventory?.some((i) => i.id === "starter_key")).toBe(true);
  });

  it("after the key, Use says it was already taken", () => {
    const state = createInitialState(templateGame);
    const after = { ...state, flags: { ...state.flags, gotKey: true } };
    expect(resolveInteraction(note, "use", after, templateGame, "en").message).toMatch(
      /already took the key/
    );
  });

  it("translates the state function's catalog key", () => {
    const state = createInitialState(templateGame);
    expect(resolveInteraction(note, "use", state, templateGame, "es").message).toMatch(
      /llave pegada debajo/
    );
  });
});
