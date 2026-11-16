import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGame } from "@/contexts/GameContext";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { uiText } from "@/engine/uiStrings";

interface SaveLoadMenuProps {
  open: boolean;
  onClose: () => void;
  mode: "save" | "load";
}

export const SaveLoadMenu = ({ open, onClose, mode }: SaveLoadMenuProps) => {
  const { gameState, replaceGameState, runtime } = useGame();
  const [tick, setTick] = useState(0);
  const [backend, setBackend] = useState(runtime.save.getBackend());
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    void runtime.save.ready.then(() => {
      setBackend(runtime.save.getBackend());
      setTick((t) => t + 1);
    });
  }, [open, runtime]);

  const saves = useMemo(() => {
    // Re-read from storage whenever the menu opens or a save changes
    void tick;
    void open;
    return runtime.save.getAllSaves();
  }, [runtime, open, tick]);

  const autosave = useMemo(() => {
    // Re-read from storage whenever the menu opens or a save changes
    void tick;
    void open;
    return mode === "load" ? runtime.save.loadAutosave() : null;
  }, [runtime, mode, open, tick]);

  const mirrorName = runtime.save.getMirrorName();
  const storageHint = mirrorName
    ? uiText("ui.save.storage_device", { name: mirrorName })
    : backend === "indexeddb"
      ? uiText("ui.save.storage_idb") : backend === "localStorage"
        ? uiText("ui.save.storage_ls") : uiText("ui.save.storage_memory");

  const handleExport = () => {
    const json = runtime.save.exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${runtime.definition.id}-saves.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(uiText("ui.save.exported"));
  };

  const handleSave = (slot: number) => {
    const currentLocation = runtime.getRoom(gameState.currentLocation);
    const ok = runtime.save.saveGame(
      slot,
      gameState,
      currentLocation?.name || "Unknown"
    );
    if (!ok) {
      const err =
        runtime.save.getLastError() ??
        "Could not save — storage full or blocked.";
      toast.error(err, {
        duration: 10_000,
        action: {
          label: uiText("ui.save.export"),
          onClick: () => handleExport(),
        },
      });
      return;
    }
    const warn = runtime.save.getLastError();
    if (warn) {
      toast.success(uiText("ui.save.saved_slot", { slot }), { description: warn });
    } else {
      toast.success(uiText("ui.save.saved_slot_ok", { slot }));
    }
    void runtime.save.flush();
    setTick((t) => t + 1);
    onClose();
  };

  const handleLoad = (slot: number) => {
    const saveData = runtime.save.loadGame(slot);
    if (!saveData) return;
    if (saveData.incompatible) {
      toast.error(saveData.incompatibleReason ?? uiText("ui.save.incompatible"));
      return;
    }
    replaceGameState(saveData.data);
    toast.success(
      saveData.version
        ? uiText("ui.save.loaded_slot_version", {
            slot,
            version: saveData.version,
          })
        : uiText("ui.save.loaded_slot", { slot })
    );
    onClose();
  };

  const handleLoadAutosave = () => {
    const saveData = runtime.save.loadAutosave();
    if (!saveData) return;
    if (saveData.incompatible) {
      toast.error(saveData.incompatibleReason ?? uiText("ui.save.autosave_incompatible"));
      return;
    }
    replaceGameState(saveData.data);
    toast.success(uiText("ui.save.autosave_loaded"));
    onClose();
  };

  const handleDelete = (slot: number, e: React.MouseEvent) => {
    e.stopPropagation();
    runtime.save.deleteSave(slot);
    toast.success(uiText("ui.save.deleted_slot", { slot }));
    setTick((t) => t + 1);
  };

  const handleDeleteAutosave = (e: React.MouseEvent) => {
    e.stopPropagation();
    runtime.save.deleteAutosave();
    toast.success(uiText("ui.save.autosave_deleted"));
    setTick((t) => t + 1);
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const result = runtime.save.importBackup(text);
      if (!result.ok) {
        toast.error(result.error ?? uiText("ui.save.import_failed"));
        return;
      }
      await runtime.save.flush();
      setTick((t) => t + 1);
      toast.success(uiText("ui.save.imported", { count: result.imported }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : uiText("ui.save.import_failed"));
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-game-ui border-2 border-game-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pixel-font text-2xl text-accent">
            {mode === "save" ? uiText("ui.save.save_game") : uiText("ui.save.load_game")}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {storageHint} {uiText("ui.save.backup_help")}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pixel-font"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-1" />
            {uiText("ui.save.export")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pixel-font"
            onClick={() => importRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-1" />
            {uiText("ui.save.import")}
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) =>
              void handleImportFile(e.target.files?.[0] ?? null)
            }
          />
        </div>

        <div className="space-y-3">
          {mode === "load" && autosave && (
            <div
              className="bg-accent/10 border border-accent/40 p-4 rounded hover:bg-accent/20 transition-colors cursor-pointer relative group"
              onClick={handleLoadAutosave}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="pixel-font text-foreground text-lg">
                    {uiText("ui.save.autosave")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {autosave.locationName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(autosave.timestamp)}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="pixel-font opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleDeleteAutosave}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {saves.map((save, index) => {
            const slotNumber = index + 1;

            return (
              <div
                key={slotNumber}
                className="bg-secondary/30 border border-border p-4 rounded hover:bg-secondary/50 transition-colors cursor-pointer relative group"
                onClick={() =>
                  mode === "save"
                    ? handleSave(slotNumber)
                    : save
                      ? handleLoad(slotNumber)
                      : null
                }
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="pixel-font text-foreground text-lg">
                      {uiText("ui.save.slot", { slot: slotNumber })}
                    </h3>
                    {save ? (
                      <>
                        <p className="text-sm text-muted-foreground mt-1">
                          {save.locationName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(save.timestamp)}
                          {save.version ? ` • v${save.version}` : ""}
                        </p>
                        {save.incompatible ? (
                          <p className="text-xs text-destructive mt-1">
                            {save.incompatibleReason ?? uiText("ui.save.incompatible_version")}
                          </p>
                        ) : (
                          <p className="text-xs text-accent mt-1">
                            {uiText("ui.save.slot_summary", {
                              items: save.data.inventory.length,
                              flags: Object.keys(save.data.flags).length,
                            })}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {mode === "save" ? uiText("ui.save.click_to_save") : uiText("ui.save.empty_slot")}
                      </p>
                    )}
                  </div>

                  {save && mode === "load" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="pixel-font opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(slotNumber, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="pixel-font w-full"
          onClick={onClose}
        >
          {uiText("ui.common.cancel")}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
