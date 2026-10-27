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
    void tick;
    return runtime.save.getAllSaves();
  }, [runtime, open, tick]);

  const autosave = useMemo(() => {
    void tick;
    return mode === "load" ? runtime.save.loadAutosave() : null;
  }, [runtime, mode, open, tick]);

  const storageHint =
    backend === "indexeddb"
      ? "Saves use IndexedDB (mirrored to localStorage)."
      : backend === "localStorage"
        ? "Saves use localStorage only — export a backup for extra safety."
        : "Storage is temporary — export a backup before closing this tab.";

  const handleExport = () => {
    const json = runtime.save.exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${runtime.definition.id}-saves.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Save backup downloaded");
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
          label: "Export backup",
          onClick: () => handleExport(),
        },
      });
      return;
    }
    const warn = runtime.save.getLastError();
    if (warn) {
      toast.success(`Saved to slot ${slot}`, { description: warn });
    } else {
      toast.success(`Game saved to slot ${slot}!`);
    }
    void runtime.save.flush();
    setTick((t) => t + 1);
    onClose();
  };

  const handleLoad = (slot: number) => {
    const saveData = runtime.save.loadGame(slot);
    if (!saveData) return;
    if (saveData.incompatible) {
      toast.error(saveData.incompatibleReason ?? "Incompatible save.");
      return;
    }
    replaceGameState(saveData.data);
    toast.success(
      `Game loaded from slot ${slot}${
        saveData.version ? ` (v${saveData.version})` : ""
      }!`
    );
    onClose();
  };

  const handleLoadAutosave = () => {
    const saveData = runtime.save.loadAutosave();
    if (!saveData) return;
    if (saveData.incompatible) {
      toast.error(saveData.incompatibleReason ?? "Incompatible autosave.");
      return;
    }
    replaceGameState(saveData.data);
    toast.success("Autosave loaded!");
    onClose();
  };

  const handleDelete = (slot: number, e: React.MouseEvent) => {
    e.stopPropagation();
    runtime.save.deleteSave(slot);
    toast.success(`Save slot ${slot} deleted!`);
    setTick((t) => t + 1);
  };

  const handleDeleteAutosave = (e: React.MouseEvent) => {
    e.stopPropagation();
    runtime.save.deleteAutosave();
    toast.success("Autosave deleted!");
    setTick((t) => t + 1);
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const result = runtime.save.importBackup(text);
      if (!result.ok) {
        toast.error(result.error ?? "Import failed");
        return;
      }
      await runtime.save.flush();
      setTick((t) => t + 1);
      toast.success(`Imported ${result.imported} save(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
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
            {mode === "save" ? "Save Game" : "Load Game"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {storageHint} Backups work across browsers and survive cleared site
          data.
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
            Export backup
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pixel-font"
            onClick={() => importRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-1" />
            Import backup
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
                    Autosave
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
                      Slot {slotNumber}
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
                            {save.incompatibleReason ?? "Incompatible version"}
                          </p>
                        ) : (
                          <p className="text-xs text-accent mt-1">
                            {save.data.inventory.length} items •{" "}
                            {Object.keys(save.data.flags).length} flags
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {mode === "save" ? "Click to save" : "Empty slot"}
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
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};
