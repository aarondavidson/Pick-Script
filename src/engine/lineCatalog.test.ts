import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import {
  applyTranslateStub,
  exportStringsCsv,
  extractPackStrings,
  mergeLocaleIntoPack,
  parseStringsCsv,
  ensureDialogueVoiceKeys,
  stubTranslateText,
} from "./lineCatalog";
import { applySettingKit } from "@/authoring/settingKits";
import { estimateSpeechMs } from "./speech";

describe("lineCatalog", () => {
  it("stubTranslateText builds a TODO placeholder", () => {
    expect(stubTranslateText("Ahoy!", "es")).toBe("[TODO es] Ahoy!");
    expect(stubTranslateText("  Hi  ", "fr")).toBe("[TODO fr] Hi");
  });

  it("applyTranslateStub fills i18n messages and seeds default locale", () => {
    let doc = createEmptyJsonPack({ id: "t", title: "T", startRoom: "dock" });
    doc = applyTranslateStub(doc, "es", "dlg.dock.npc.hi", "Ahoy!");
    expect(doc.i18n?.messages?.es?.["dlg.dock.npc.hi"]).toBe(
      "[TODO es] Ahoy!"
    );
    expect(doc.i18n?.messages?.en?.["dlg.dock.npc.hi"]).toBe("Ahoy!");
    expect(doc.i18n?.defaultLocale).toBe("en");
  });

  it("CSV round-trip tolerates BOM and empty optional cells", () => {
    const rows = [
      {
        lineId: "dlg.a.b.c",
        kind: "dialogue" as const,
        text: "Hello, world",
        voiceKey: undefined,
        roomId: "a",
        hotspotId: "",
      },
    ];
    const csv = exportStringsCsv(rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const parsed = parseStringsCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.lineId).toBe("dlg.a.b.c");
    expect(parsed[0]!.text).toBe("Hello, world");
    expect(parsed[0]!.voiceKey).toBeUndefined();
    expect(parsed[0]!.roomId).toBe("a");
    expect(parsed[0]!.hotspotId).toBeUndefined();

    // Explicit BOM + empty middle cells + blank line + short row.
    const messy =
      "\uFEFFlineId,kind,text,voiceKey,roomId,hotspotId\r\n" +
      "look.r.h,look,A look,,,h\r\n" +
      "\r\n" +
      'dlg.x.y.z,dialogue,"Quoted, text"\n' +
      ",dialogue,missing-id-skipped\n";
    const messyParsed = parseStringsCsv(messy);
    expect(messyParsed.map((r) => r.lineId)).toEqual([
      "look.r.h",
      "dlg.x.y.z",
    ]);
    expect(messyParsed[0]!.hotspotId).toBe("h");
    expect(messyParsed[0]!.voiceKey).toBeUndefined();
    expect(messyParsed[1]!.text).toBe("Quoted, text");
  });

  it("extracts dialogue with stable ids and voice keys", () => {
    let doc = createEmptyJsonPack({ id: "t", title: "T", startRoom: "dock" });
    doc = {
      ...doc,
      rooms: {
        dock: {
          id: "dock",
          name: "Dock",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "npc",
              name: "Sailor",
              x: 40,
              y: 40,
              width: 10,
              height: 20,
              kind: "character",
              lookText: "A sailor.",
              dialogue: {
                speaker: "Sailor",
                lines: [
                  {
                    id: "hi",
                    text: "Ahoy!",
                    choices: [{ text: "Bye", nextId: "END" }],
                  },
                ],
              },
            },
          ],
        },
      },
    };
    doc = ensureDialogueVoiceKeys(doc);
    const rows = extractPackStrings(doc);
    expect(rows.some((r) => r.lineId === "dlg.dock.npc.hi")).toBe(true);
    expect(
      rows.find((r) => r.lineId === "dlg.dock.npc.hi")?.voiceKey
    ).toBe("voice.dock.npc.hi");
    expect(rows.some((r) => r.kind === "choice")).toBe(true);

    const csv = exportStringsCsv(rows);
    const parsed = parseStringsCsv(csv);
    expect(parsed.length).toBe(rows.length);

    const es = mergeLocaleIntoPack(doc, "es", [
      { lineId: "dlg.dock.npc.hi", kind: "dialogue", text: "¡Hola!" },
    ]);
    expect(es.i18n?.messages?.es?.["dlg.dock.npc.hi"]).toBe("¡Hola!");

    const game = createGameFromJson(doc);
    const node = game.rooms.dock!.hotspots.find((h) => h.id === "npc")!
      .dialogue!.nodes.hi!;
    expect(node.lineKey).toBe("dlg.dock.npc.hi");
    expect(node.voiceKey).toBe("voice.dock.npc.hi");
    expect(game.i18n?.messages?.en?.["dlg.dock.npc.hi"]).toBe("Ahoy!");
  });

  it("estimates speech duration from text", () => {
    expect(estimateSpeechMs("Hi")).toBeGreaterThanOrEqual(1200);
    expect(estimateSpeechMs("One two three four five six seven")).toBeGreaterThan(
      estimateSpeechMs("Hi")
    );
  });
});

describe("settingKits", () => {
  it("seeds space / california / cyberpunk atmosphere", () => {
    let doc = createEmptyJsonPack({
      id: "s",
      title: "S",
      startRoom: "start",
    });
    doc = {
      ...doc,
      rooms: {
        start: {
          id: "start",
          name: "Start",
          description: "A new room.",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [],
        },
      },
    };
    const space = applySettingKit(doc, "space");
    expect(space.rooms.start?.particles).toBe("stars");
    expect(space.audio?.music?.start).toBe("ambient");

    const cal = applySettingKit(doc, "california");
    expect(cal.rooms.start?.particles).toBe("sparkle");
    expect(cal.audio?.music?.start).toBe("upbeat");

    const cyber = applySettingKit(doc, "cyberpunk");
    expect(cyber.rooms.start?.particles).toBe("sparks");
  });
});
