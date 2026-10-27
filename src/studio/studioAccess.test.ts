import { afterEach, describe, expect, it } from "vitest";
import {
  __setStudioAccessTestOverrides,
  getStudioSecret,
  isAuthoringEnabled,
  isStudioBuildEnabled,
  lockStudio,
  tryUnlockFromSearch,
  unlockStudio,
} from "./studioAccess";

describe("studioAccess", () => {
  afterEach(() => {
    lockStudio();
    __setStudioAccessTestOverrides(null);
  });

  it("enables authoring in DEV/test without secret", () => {
    expect(isStudioBuildEnabled()).toBe(true);
    expect(isAuthoringEnabled()).toBe(true);
  });

  it("requires passphrase when secret override is set", () => {
    __setStudioAccessTestOverrides({ buildEnabled: true, secret: "s3cret" });
    expect(getStudioSecret()).toBe("s3cret");
    lockStudio();
    expect(isAuthoringEnabled()).toBe(false);
    expect(unlockStudio("wrong")).toBe(false);
    expect(unlockStudio("s3cret")).toBe(true);
    expect(isAuthoringEnabled()).toBe(true);
  });

  it("unlocks from ?unlock= query", () => {
    __setStudioAccessTestOverrides({ buildEnabled: true, secret: "gate" });
    lockStudio();
    expect(tryUnlockFromSearch("?unlock=gate")).toBe(true);
    expect(isAuthoringEnabled()).toBe(true);
  });

  it("stays locked when build flag is off", () => {
    __setStudioAccessTestOverrides({ buildEnabled: false, secret: "" });
    expect(isStudioBuildEnabled()).toBe(false);
    expect(isAuthoringEnabled()).toBe(false);
    expect(unlockStudio("anything")).toBe(false);
  });
});
