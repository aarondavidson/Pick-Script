import { useEffect, useMemo, useRef, useState } from "react";
import type { JsonPackDocument } from "@/engine/jsonPack";
import {
  ensureDialogueVoiceKeys,
  exportStringsCsv,
  extractPackStrings,
  mergeLocaleIntoPack,
  parseStringsCsv,
} from "@/engine/lineCatalog";
import { toast } from "@/hooks/use-toast";
import {
  hasLocalePreview,
  localePreviewChoices,
  previewLocaleString,
} from "@/studio/localePreview";

export interface StringsExportBarProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
  /** Optional dialogue / catalog key to preview (e.g. selected line). */
  previewKey?: string;
  /** Source-language text shown when the locale lacks a translation. */
  previewFallback?: string;
}

/**
 * Export source strings CSV for VA / translators; import a locale CSV.
 * Compact locale preview when the pack has 2+ i18n locales.
 */
export function StringsExportBar({
  doc,
  onChange,
  previewKey,
  previewFallback,
}: StringsExportBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [locale, setLocale] = useState("es");
  const locales = localePreviewChoices(doc.i18n);
  const showPreview = hasLocalePreview(doc.i18n);
  const defaultPreviewLocale =
    doc.i18n?.defaultLocale && locales.includes(doc.i18n.defaultLocale)
      ? locales.find((l) => l !== doc.i18n!.defaultLocale) ?? locales[0]!
      : locales[0] ?? "en";
  const [previewLocale, setPreviewLocale] = useState(defaultPreviewLocale);
  const [demoKey, setDemoKey] = useState(
    previewKey?.trim() || "dlg.room.npc.hello"
  );

  useEffect(() => {
    if (previewKey?.trim()) setDemoKey(previewKey.trim());
  }, [previewKey]);

  const localesLenRef = useRef(locales.length);
  useEffect(() => {
    if (!locales.length) return;
    const grew = locales.length > localesLenRef.current;
    localesLenRef.current = locales.length;
    // New locale (e.g. Translate stub) → jump preview to non-default.
    if (grew && locales.length >= 2) {
      setPreviewLocale(defaultPreviewLocale);
      return;
    }
    if (!locales.includes(previewLocale)) {
      setPreviewLocale(defaultPreviewLocale);
    }
  }, [locales, previewLocale, defaultPreviewLocale]);

  const resolvedKey = (previewKey?.trim() || demoKey).trim();
  const resolvedPreview = useMemo(
    () =>
      previewLocaleString(
        doc.i18n,
        previewLocale,
        resolvedKey,
        previewFallback
      ),
    [doc.i18n, previewLocale, resolvedKey, previewFallback]
  );

  const exportCsv = () => {
    const withKeys = ensureDialogueVoiceKeys(doc);
    if (withKeys !== doc) onChange(withKeys);
    const rows = extractPackStrings(withKeys);
    const csv = exportStringsCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.id || "pack"}-strings.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Exported strings",
      description: `${rows.length} lines → CSV (lineId + voiceKey).`,
    });
  };

  const onImport = async (file: File) => {
    const text = await file.text();
    const rows = parseStringsCsv(text);
    if (!rows.length) {
      toast({
        title: "Import failed",
        description: "No rows found in CSV.",
      });
      return;
    }
    onChange(mergeLocaleIntoPack(doc, locale, rows));
    toast({
      title: "Locale imported",
      description: `${rows.length} strings → i18n.${locale}`,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2 border border-border/60 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="pixel-font text-[10px] text-accent">Strings / VO</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Export CSV for voice actors & translators. Import a locale CSV to
            merge into pack i18n.
          </p>
        </div>
        <button
          type="button"
          className="pixel-font text-[10px] min-h-[36px] px-3 border border-accent text-accent"
          onClick={exportCsv}
        >
          Export CSV
        </button>
        <label className="block text-[10px] space-y-0.5">
          <span className="text-muted-foreground">Locale</span>
          <input
            className="w-16 bg-background border border-border px-1 py-1"
            value={locale}
            onChange={(e) => setLocale(e.target.value.slice(0, 8))}
          />
        </label>
        <button
          type="button"
          className="pixel-font text-[10px] min-h-[36px] px-3 border border-game-border"
          onClick={() => fileRef.current?.click()}
        >
          Import CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap items-end gap-2 border border-border/60 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="pixel-font text-[10px] text-accent">Locale preview</p>
          {!showPreview ? (
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Import CSV / add locales to preview translations live — optional,
              does not block authoring.
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Resolve <code className="text-accent">t(key)</code> against a
              pack locale.
            </p>
          )}
        </div>
        {showPreview && (
          <>
            <label className="block text-[10px] space-y-0.5">
              <span className="text-muted-foreground">Preview locale</span>
              <select
                className="bg-background border border-border px-1 py-1 min-h-[28px]"
                value={previewLocale}
                onChange={(e) => setPreviewLocale(e.target.value)}
              >
                {locales.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] space-y-0.5 min-w-[10rem] flex-1">
              <span className="text-muted-foreground">Key</span>
              <input
                className="w-full bg-background border border-border px-1 py-1 font-mono text-[10px]"
                value={demoKey}
                onChange={(e) => setDemoKey(e.target.value)}
                placeholder="dlg.room.npc.hello"
              />
            </label>
            <div className="min-w-[8rem] max-w-full flex-1 text-[10px]">
              <span className="text-muted-foreground block mb-0.5">
                t({previewLocale})
              </span>
              <p className="border border-border/50 bg-background/60 px-2 py-1 leading-relaxed break-words">
                {resolvedPreview || "—"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
