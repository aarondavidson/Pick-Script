import { useState } from "react";
import {
  PACK_TEMPLATES,
  createPackFromTemplate,
  exportTemplatePackJson,
  type PackTemplateId,
} from "@/authoring/packTemplates";
import type { JsonPackDocument } from "@/engine/jsonPack";
import { diagnosePack } from "@/engine/packDoctor";
import { toast } from "@/hooks/use-toast";

export interface PackStarterGalleryProps {
  onLoad: (doc: JsonPackDocument) => void;
}

/**
 * Browse genre starter kits — load into draft or download .pack.json.
 */
export function PackStarterGallery({ onLoad }: PackStarterGalleryProps) {
  const [open, setOpen] = useState(true);
  const [genre, setGenre] = useState<string>("all");

  const genres = ["all", ...new Set(PACK_TEMPLATES.map((t) => t.genre))];
  const list =
    genre === "all"
      ? PACK_TEMPLATES
      : PACK_TEMPLATES.filter((t) => t.genre === genre);

  const load = (id: PackTemplateId) => {
    const meta = PACK_TEMPLATES.find((t) => t.id === id)!;
    const doc = createPackFromTemplate({
      id: `starter-${id}`,
      title: meta.title,
      templateId: id,
    });
    const report = diagnosePack(doc);
    onLoad(doc);
    toast({
      title: `Loaded “${meta.title}”`,
      description:
        report.summary.missingRoomArt > 0
          ? `${report.summary.missingRoomArt} room(s) still need art — see Ship checklist.`
          : "Starter ready — customize rooms and hotspots.",
    });
  };

  const download = (id: PackTemplateId) => {
    const meta = PACK_TEMPLATES.find((t) => t.id === id)!;
    const json = exportTemplatePackJson(id);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `starter-${id}.pack.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded starter",
      description: `${meta.title} · import via launcher or Pack → Import`,
    });
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="pixel-font text-sm text-accent">Starter gallery</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Genre kits with puzzles pre-wired. Art is intentionally missing —
            the Ship checklist lists every blank room so you know what to paint.
          </p>
        </div>
        <button
          type="button"
          className="text-[10px] text-muted-foreground underline"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <>
          <div className="flex flex-wrap gap-1">
            {genres.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(g)}
                className={`pixel-font text-[10px] min-h-[32px] px-2 border ${
                  genre === g
                    ? "border-accent text-accent"
                    : "border-game-border text-muted-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {list.map((t) => (
              <li
                key={t.id}
                className="border border-border/60 px-3 py-2 space-y-2"
              >
                <div>
                  <div className="pixel-font text-[11px] text-foreground">
                    {t.title}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {t.blurb}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {t.genre}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="pixel-font text-[10px] min-h-[36px] px-2 border-2 border-accent text-accent"
                    onClick={() => load(t.id)}
                  >
                    Load into draft
                  </button>
                  <button
                    type="button"
                    className="pixel-font text-[10px] min-h-[36px] px-2 border border-game-border"
                    onClick={() => download(t.id)}
                  >
                    Download .pack.json
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
