import { describe, expect, it } from "vitest";
import {
  getModalityPlayer,
  modalityRegistry,
  registerModalityPlayer,
} from "./modalityRegistry";

describe("modalityRegistry", () => {
  it("looks up built-in modality players by id", () => {
    expect(getModalityPlayer("pixel-invaders")).toBe(
      modalityRegistry["pixel-invaders"]
    );
    expect(getModalityPlayer("hacking")).toBe(modalityRegistry.hacking);
    expect(getModalityPlayer("missing-minigame")).toBeUndefined();
  });

  it("registerModalityPlayer overwrites an entry", () => {
    const stub = {
      Component: (() => null) as never,
      isAlreadyWon: () => false,
    };
    registerModalityPlayer("test-modality", stub);
    expect(getModalityPlayer("test-modality")).toBe(stub);
    delete modalityRegistry["test-modality"];
  });
});
