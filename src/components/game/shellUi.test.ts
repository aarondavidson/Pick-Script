import { describe, expect, it } from "vitest";
import { getShellCanvasFx, getShellComplete, getShellIntro } from "./shellUi";

const loader = () => Promise.resolve({ default: () => null });

describe("shellUi", () => {
  it("returns null when the pack opts out", () => {
    expect(getShellComplete({})).toBeNull();
    expect(getShellComplete({ shell: { complete: "generic" } })).toBeNull();
    expect(getShellIntro({ shell: { intro: false } })).toBeNull();
    expect(getShellCanvasFx({ shell: {} })).toBeNull();
  });

  it("builds one stable lazy component per pack loader", () => {
    const def = { shell: { intro: loader, complete: loader } };
    const a = getShellIntro(def);
    expect(a).not.toBeNull();
    expect(getShellIntro(def)).toBe(a);
    expect(getShellComplete(def)).toBe(a);
  });
});
