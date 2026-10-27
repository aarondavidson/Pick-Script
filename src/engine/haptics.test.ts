import { describe, expect, it } from "vitest";
import {
  hapticForSoundKey,
  isHapticStyle,
  sanitizeHapticStyle,
} from "./haptics";

describe("engine haptics", () => {
  it("validates styles", () => {
    expect(isHapticStyle("medium")).toBe(true);
    expect(isHapticStyle("boom")).toBe(false);
    expect(sanitizeHapticStyle("success")).toBe("success");
    expect(sanitizeHapticStyle("nope")).toBeUndefined();
  });

  it("maps SFX keys to default styles", () => {
    expect(hapticForSoundKey("pickup")).toBe("heavy");
    expect(hapticForSoundKey("success")).toBe("success");
    expect(hapticForSoundKey("error")).toBe("error");
    expect(hapticForSoundKey("creak")).toBe("medium");
    expect(hapticForSoundKey("custom_whoosh")).toBe("light");
    expect(hapticForSoundKey(undefined)).toBeUndefined();
  });
});
