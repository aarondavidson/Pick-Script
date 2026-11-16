import { useState } from "react";
import { Link } from "react-router-dom";

const HIDE_KEY = "pick_studio_hide_first_game_guide";

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

function storeHidden(hidden: boolean): void {
  try {
    if (hidden) localStorage.setItem(HIDE_KEY, "1");
    else localStorage.removeItem(HIDE_KEY);
  } catch {
    /* private mode — preference just won't persist */
  }
}

export interface FirstGameFunnelProps {
  /** Where the card sits — tweaks CTAs slightly */
  variant?: "launcher" | "studio";
}

/**
 * Hero card: Make a game in 30 minutes — theme → template → ship → play.
 * In the Studio it can be hidden (remembered) so returning builders land on
 * their tools instead of the tutorial.
 */
export function FirstGameFunnel({ variant = "launcher" }: FirstGameFunnelProps) {
  const studioBase = "/pick";
  const inStudio = variant === "studio";
  const [hidden, setHidden] = useState(() => inStudio && readHidden());

  const toggle = (next: boolean) => {
    storeHidden(next);
    setHidden(next);
  };

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => toggle(false)}
        className="pixel-font text-[11px] min-h-[44px] px-3 border border-dashed border-accent/50 text-muted-foreground hover:text-accent"
      >
        First time here? Show the 30-minute guide
      </button>
    );
  }

  return (
    <section
      className="border-2 border-accent/70 bg-accent/10 px-4 py-5 space-y-3"
      aria-label="Make a game in 30 minutes"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="pixel-font text-[10px] text-primary uppercase tracking-[0.2em]">
          First game · 30 minutes
        </p>
        {inStudio && (
          <button
            type="button"
            onClick={() => toggle(true)}
            className="pixel-font text-[11px] text-muted-foreground hover:text-accent underline -my-2 min-h-[44px] px-1"
          >
            Hide guide
          </button>
        )}
      </div>
      <h2 className="pixel-font text-xl md:text-2xl text-accent">
        Make a game in 30 minutes
      </h2>
      <ol className="text-sm text-muted-foreground leading-relaxed list-decimal list-inside space-y-2">
        <li>
          <span className="text-foreground">Pick a theme and make your art</span>
          {" — one picture per room, drawn or from any AI image tool. "}
          <Link to={`${studioBase}?funnel=1`} className="text-primary underline">
            Open the art guide
          </Link>
        </li>
        <li>
          <span className="text-foreground">Start from the mystery template</span>
          {" — five linked rooms and a key puzzle that already work. "}
          <Link
            to={`${studioBase}?new=short-mystery`}
            className="text-primary underline"
          >
            Use the template
          </Link>
        </li>
        <li>
          <span className="text-foreground">Drop your art in, then play</span>
          {" — the ship checklist tells you what is still missing."}
        </li>
      </ol>
      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          to={`${studioBase}?funnel=1&new=short-mystery`}
          className="inline-flex pixel-font text-sm min-h-[44px] items-center border-2 border-accent px-4 py-2 text-accent hover:bg-accent/15 transition-colors"
        >
          {inStudio ? "Start a new game →" : "Start making →"}
        </Link>
        <Link
          to="/play/attic-study"
          className="inline-flex pixel-font text-sm min-h-[44px] items-center border border-game-border px-4 py-2 text-muted-foreground hover:border-accent/50 hover:text-accent transition-colors"
        >
          Play a sample first
        </Link>
      </div>
    </section>
  );
}
