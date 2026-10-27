import { useState } from "react";
import { suggestId } from "@/authoring/codegen";
import type {
  JsonPackAchievement,
  JsonPackDocument,
  JsonPackQuest,
} from "@/engine/jsonPack";

export interface PackProgressPanelProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
}

/**
 * Achievements + quests for JSON packs (journal UI + optional flag auto-unlock).
 */
export function PackProgressPanel({ doc, onChange }: PackProgressPanelProps) {
  const achievements = doc.achievements ?? [];
  const quests = doc.quests ?? [];

  const [achTitle, setAchTitle] = useState("First key");
  const [achDesc, setAchDesc] = useState("Picked up something useful.");
  const [achFlag, setAchFlag] = useState("got_brass_key");

  const [questTitle, setQuestTitle] = useState("Escape the attic");
  const [questDesc, setQuestDesc] = useState("Find a way out.");
  const [questObj, setQuestObj] = useState("Find the key\nOpen the chest");
  const [questObjFlags, setQuestObjFlags] = useState(
    "got_brass_key\nchest_open"
  );
  const [questFlag, setQuestFlag] = useState("chest_open");

  const setAchievements = (next: JsonPackAchievement[]) => {
    onChange({ ...doc, achievements: next });
  };
  const setQuests = (next: JsonPackQuest[]) => {
    onChange({ ...doc, quests: next });
  };

  const addAchievement = () => {
    const id = suggestId(achTitle, `ach_${achievements.length + 1}`);
    const unique = achievements.some((a) => a.id === id)
      ? `${id}_${achievements.length}`
      : id;
    setAchievements([
      ...achievements,
      {
        id: unique,
        title: achTitle.trim() || unique,
        description: achDesc.trim() || achTitle.trim() || unique,
        unlockFlag: achFlag.trim() || undefined,
      },
    ]);
  };

  const addQuest = () => {
    const id = suggestId(questTitle, `quest_${quests.length + 1}`);
    const unique = quests.some((q) => q.id === id)
      ? `${id}_${quests.length}`
      : id;
    const objectives = questObj
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (!objectives.length) return;
    const objectiveFlags = questObjFlags
      .split("\n")
      .map((s) => s.trim())
      .slice(0, objectives.length);
    setQuests([
      ...quests,
      {
        id: unique,
        title: questTitle.trim() || unique,
        description: questDesc.trim() || questTitle.trim() || unique,
        objectives,
        ...(objectiveFlags.some(Boolean) ? { objectiveFlags } : {}),
        completeFlag: questFlag.trim() || undefined,
      },
    ]);
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-4">
      <div>
        <h3 className="pixel-font text-sm text-accent">
          Quests & achievements
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Quests drive the always-on <strong className="font-normal text-foreground">Objective</strong>{" "}
          bar. Pair each objective line with a flag so steps clear as puzzles
          resolve. Achievements use <code className="text-accent">unlockFlag</code>.
        </p>
      </div>

      <label className="block text-xs space-y-1 max-w-md">
        <span className="pixel-font text-xs text-primary">Game ends when flag</span>
        <input
          className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
          value={doc.winFlag ?? ""}
          onChange={(e) =>
            onChange({ ...doc, winFlag: e.target.value.trim() || undefined })
          }
          placeholder="escaped_lighthouse"
        />
        <span className="text-muted-foreground block">
          When this flag turns on, players see the win screen (with your
          credits). Set it from the final puzzle, dialogue or cutscene.
        </span>
      </label>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="pixel-font text-xs text-primary">Achievements</h4>
          <ul className="space-y-2 max-h-36 overflow-y-auto text-xs">
            {achievements.length === 0 && (
              <li className="text-muted-foreground">None yet.</li>
            )}
            {achievements.map((a) => (
              <li
                key={a.id}
                className="border border-border/50 px-2 py-1.5 flex justify-between gap-2"
              >
                <span>
                  <span className="text-accent">{a.title}</span>
                  {a.unlockFlag ? ` · flag ${a.unlockFlag}` : ""}
                </span>
                <button
                  type="button"
                  className="text-destructive shrink-0"
                  onClick={() =>
                    setAchievements(achievements.filter((x) => x.id !== a.id))
                  }
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Title</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={achTitle}
              onChange={(e) => setAchTitle(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Description</span>
            <input
              className="w-full bg-background border border-border px-2 py-2"
              value={achDesc}
              onChange={(e) => setAchDesc(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Unlock when flag</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
              value={achFlag}
              onChange={(e) => setAchFlag(e.target.value)}
              placeholder="got_brass_key"
            />
          </label>
          <button
            type="button"
            onClick={addAchievement}
            className="pixel-font text-xs min-h-[40px] w-full border border-accent text-accent"
          >
            Add achievement
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="pixel-font text-xs text-primary">Quests</h4>
          <ul className="space-y-2 max-h-36 overflow-y-auto text-xs">
            {quests.length === 0 && (
              <li className="text-muted-foreground">None yet.</li>
            )}
            {quests.map((q) => (
              <li
                key={q.id}
                className="border border-border/50 px-2 py-1.5 flex justify-between gap-2"
              >
                <span>
                  <span className="text-accent">{q.title}</span>
                  {" · "}
                  {q.objectives.length} obj
                  {q.completeFlag ? ` · flag ${q.completeFlag}` : ""}
                </span>
                <button
                  type="button"
                  className="text-destructive shrink-0"
                  onClick={() => setQuests(quests.filter((x) => x.id !== q.id))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Title</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={questTitle}
              onChange={(e) => setQuestTitle(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Description</span>
            <input
              className="w-full bg-background border border-border px-2 py-2"
              value={questDesc}
              onChange={(e) => setQuestDesc(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">
              Objectives (one per line)
            </span>
            <textarea
              className="w-full bg-background border border-border px-2 py-2 min-h-[72px] text-xs"
              value={questObj}
              onChange={(e) => setQuestObj(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">
              Objective flags (one per line, same order)
            </span>
            <textarea
              className="w-full bg-background border border-border px-2 py-2 min-h-[56px] text-xs font-mono"
              value={questObjFlags}
              onChange={(e) => setQuestObjFlags(e.target.value)}
              placeholder="got_brass_key&#10;chest_open"
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Complete when flag</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
              value={questFlag}
              onChange={(e) => setQuestFlag(e.target.value)}
              placeholder="chest_open"
            />
          </label>
          <button
            type="button"
            onClick={addQuest}
            className="pixel-font text-xs min-h-[40px] w-full border border-accent text-accent"
          >
            Add quest
          </button>
        </div>
      </div>
    </section>
  );
}
