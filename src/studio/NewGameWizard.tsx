import { useEffect, useState } from "react";
import { suggestId } from "@/authoring/codegen";
import {
  PACK_TEMPLATES,
  createPackFromTemplate,
  type PackTemplateId,
} from "@/authoring/packTemplates";
import {
  GENRE_PRESETS,
  applyGenrePreset,
  type GenrePresetId,
} from "@/authoring/genrePresets";
import {
  SETTING_KITS,
  applySettingKit,
  type SettingKitId,
} from "@/authoring/settingKits";
import type { JsonPackDocument } from "@/engine/jsonPack";

export interface NewGameWizardProps {
  open: boolean;
  onClose: () => void;
  onCreate: (doc: JsonPackDocument) => void;
  /** Pre-select template (e.g. funnel → short-mystery) */
  defaultTemplate?: PackTemplateId;
}

function isPackTemplateId(id: string | undefined): id is PackTemplateId {
  return !!id && PACK_TEMPLATES.some((t) => t.id === id);
}

function resolveTemplate(
  hint: PackTemplateId | undefined
): PackTemplateId {
  return isPackTemplateId(hint) ? hint : "short-mystery";
}

/**
 * Modal: genre → setting → starter template → id/title.
 */
export function NewGameWizard({
  open,
  onClose,
  onCreate,
  defaultTemplate,
}: NewGameWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [genreId, setGenreId] = useState<GenrePresetId>("mobile-mystery");
  const [settingId, setSettingId] = useState<SettingKitId>("water");
  const [templateId, setTemplateId] = useState<PackTemplateId>(() =>
    resolveTemplate(defaultTemplate)
  );
  const [title, setTitle] = useState("My Adventure");
  const [packId, setPackId] = useState("my-adventure");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    if (!open) return;
    setTemplateId(resolveTemplate(defaultTemplate));
  }, [open, defaultTemplate]);

  if (!open) return null;

  const reset = () => {
    setStep(1);
    setGenreId("mobile-mystery");
    setSettingId("water");
    setTemplateId(resolveTemplate(defaultTemplate));
    setTitle("My Adventure");
    setPackId("my-adventure");
    setSubtitle("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const create = () => {
    let doc = createPackFromTemplate({
      id: packId,
      title,
      subtitle: subtitle || undefined,
      templateId,
    });
    doc = applyGenrePreset(doc, genreId);
    doc = applySettingKit(doc, settingId);
    onCreate(doc);
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-game-wizard-title"
    >
      <div className="w-full max-w-lg border border-game-border bg-background shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
          <div>
            <h2
              id="new-game-wizard-title"
              className="pixel-font text-sm text-accent"
            >
              New game wizard
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Step {step} of 4 — tone, place, starter, title.
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground min-h-[36px] px-2"
            onClick={close}
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pick a tone — mystery, comedy, sunny, or minimal. Sets the verb
                bar. Place comes next.
              </p>
              <ul className="space-y-2">
                {GENRE_PRESETS.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setGenreId(g.id)}
                      className={`w-full text-left border px-3 py-3 min-h-[44px] ${
                        genreId === g.id
                          ? "border-accent bg-accent/10"
                          : "border-game-border hover:bg-secondary/30"
                      }`}
                    >
                      <span className="pixel-font text-xs text-accent block">
                        {g.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        tone: {g.tone} · verbMode: {g.verbMode}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 block leading-relaxed">
                        {g.blurb}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="pixel-font text-xs min-h-[40px] px-4 border-2 border-accent text-accent"
                  onClick={() => setStep(2)}
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Where does it take place? Seeds start-room music and particles —
                space, forest, cyberpunk, California, Deep South, water, and
                more.
              </p>
              <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {SETTING_KITS.map((k) => (
                  <li key={k.id}>
                    <button
                      type="button"
                      onClick={() => setSettingId(k.id)}
                      className={`w-full text-left border px-3 py-3 min-h-[44px] ${
                        settingId === k.id
                          ? "border-accent bg-accent/10"
                          : "border-game-border hover:bg-secondary/30"
                      }`}
                    >
                      <span className="pixel-font text-xs text-accent block">
                        {k.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {k.suggestedMusic} · {k.suggestedParticles}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 block leading-relaxed">
                        {k.blurb}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="pixel-font text-xs min-h-[40px] px-4 border-2 border-accent text-accent"
                  onClick={() => setStep(3)}
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pick a starter. Templates only seed rooms and a first puzzle.
              </p>
              <ul className="space-y-2">
                {PACK_TEMPLATES.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      className={`w-full text-left border px-3 py-3 min-h-[44px] ${
                        templateId === t.id
                          ? "border-accent bg-accent/10"
                          : "border-game-border hover:bg-secondary/30"
                      }`}
                    >
                      <span className="pixel-font text-xs text-accent block">
                        {t.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t.genre}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 block leading-relaxed">
                        {t.blurb}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
                  onClick={() => setStep(2)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="pixel-font text-xs min-h-[40px] px-4 border-2 border-accent text-accent"
                  onClick={() => setStep(4)}
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="grid gap-3">
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Title</span>
                  <input
                    className="w-full bg-background border border-border px-3 py-2 min-h-[44px]"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setPackId(suggestId(e.target.value, "my-pack"));
                    }}
                    autoFocus
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Pack id</span>
                  <input
                    className="w-full bg-background border border-border px-3 py-2 min-h-[44px]"
                    value={packId}
                    onChange={(e) =>
                      setPackId(suggestId(e.target.value, "my-pack"))
                    }
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">
                    Subtitle (optional)
                  </span>
                  <input
                    className="w-full bg-background border border-border px-3 py-2 min-h-[44px]"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="A short tagline"
                  />
                </label>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
                  onClick={() => setStep(3)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="pixel-font text-xs min-h-[40px] px-4 border-2 border-primary text-primary"
                  onClick={create}
                >
                  Create pack
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
