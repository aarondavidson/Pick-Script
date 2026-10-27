import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { toast } from "@/hooks/use-toast";
import { isAuthoringEnabled } from "@/studio/studioAccess";
import { PICK } from "@/product/branding";

interface DebugContextType {
  /** P.I.C.K. Author mode (hotspot overlay, flags, copy snippets) */
  debugMode: boolean;
  /** False in public production builds (no studio unlock) */
  authoringAvailable: boolean;
  toggleDebugMode: () => void;
  setDebugMode: (enabled: boolean) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider = ({ children }: { children: ReactNode }) => {
  const [debugMode, setDebugModeState] = useState(false);
  const [authoringAvailable, setAuthoringAvailable] = useState(() =>
    isAuthoringEnabled()
  );

  useEffect(() => {
    const sync = () => setAuthoringAvailable(isAuthoringEnabled());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("studio-access-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("studio-access-changed", sync);
    };
  }, []);

  const setDebugMode = useCallback(
    (enabled: boolean) => {
      if (!isAuthoringEnabled()) {
        toast({
          title: `${PICK.acronym} Author unavailable`,
          description:
            "Authoring is off in this build. Use npm run dev or unlock /pick.",
          variant: "destructive",
        });
        return;
      }
      setDebugModeState(enabled);
      toast({
        title: enabled
          ? `${PICK.acronym} Author on`
          : `${PICK.acronym} Author off`,
        description: enabled
          ? "Drag hotspots, copy %, inspect flags. Ctrl+Shift+H to close."
          : `Ctrl+Shift+H or Settings → ${PICK.acronym} Author to reopen.`,
      });
    },
    []
  );

  const toggleDebugMode = useCallback(() => {
    if (!isAuthoringEnabled()) {
      toast({
        title: `${PICK.acronym} Author unavailable`,
        description:
          "Authoring is off in this build. Use npm run dev or unlock /pick.",
        variant: "destructive",
      });
      return;
    }
    setDebugModeState((prev) => {
      const next = !prev;
      toast({
        title: next
          ? `${PICK.acronym} Author on`
          : `${PICK.acronym} Author off`,
        description: next
          ? "Drag hotspots, copy %, inspect flags. Ctrl+Shift+H to close."
          : `Ctrl+Shift+H or Settings → ${PICK.acronym} Author to reopen.`,
      });
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        toggleDebugMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleDebugMode]);

  useEffect(() => {
    if (!authoringAvailable && debugMode) {
      setDebugModeState(false);
    }
  }, [authoringAvailable, debugMode]);

  return (
    <DebugContext.Provider
      value={{
        debugMode: authoringAvailable && debugMode,
        authoringAvailable,
        toggleDebugMode,
        setDebugMode,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
};

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
};
