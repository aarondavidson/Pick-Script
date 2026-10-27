import { Link } from "react-router-dom";

/** Shared copy for launcher GUIDED_STEPS + hero card. */
export const FIRST_GAME_FUNNEL_STEPS = [
  "Theme + AI art → /pick?funnel=1 · repo: docs/IMAGE-GEN-STARTER.md",
  "New game → short-mystery (5 rooms, harbor_key) → /pick?new=short-mystery",
  "Art handoff → Ship checklist → Play draft",
] as const;

export interface FirstGameFunnelProps {
  /** Where the card sits — tweaks CTAs slightly */
  variant?: "launcher" | "studio";
}

/**
 * Hero card: Make a game in 30 minutes — theme → short-mystery → ship → play.
 */
export function FirstGameFunnel({ variant = "launcher" }: FirstGameFunnelProps) {
  const studioBase = "/pick";
  return (
    <section
      className="border-2 border-accent/70 bg-accent/10 px-4 py-5 space-y-3"
      aria-label="Make a game in 30 minutes"
    >
      <p className="pixel-font text-[10px] text-primary uppercase tracking-[0.2em]">
        First game · 30 minutes
      </p>
      <h2 className="pixel-font text-xl md:text-2xl text-accent">
        Make a game in 30 minutes
      </h2>
      <ol className="text-sm text-muted-foreground leading-relaxed list-decimal list-inside space-y-2">
        <li>
          <span className="text-foreground">Theme + AI art</span>
          {" — "}
          <Link
            to={`${studioBase}?funnel=1`}
            className="text-primary underline"
          >
            /pick?funnel=1
          </Link>
          {" · repo path "}
          <code className="text-accent text-[11px]">docs/IMAGE-GEN-STARTER.md</code>
        </li>
        <li>
          <span className="text-foreground">New game</span>
          {" — "}
          <code className="text-accent text-[11px]">short-mystery</code>
          {" (5 rooms · "}
          <code className="text-accent text-[11px]">harbor_key</code>
          {") · "}
          <Link
            to={`${studioBase}?new=short-mystery`}
            className="text-primary underline"
          >
            /pick?new=short-mystery
          </Link>
        </li>
        <li>
          <span className="text-foreground">Art handoff → Ship checklist → Play</span>
          {" — assign hub art + key icon, then validate / play draft"}
        </li>
      </ol>
      <div className="flex flex-wrap gap-3 pt-1">
        {variant === "launcher" ? (
          <Link
            to={`${studioBase}?funnel=1&new=short-mystery`}
            className="inline-flex pixel-font text-sm min-h-[44px] items-center border-2 border-accent px-4 py-2 text-accent hover:bg-accent/15 transition-colors"
          >
            Start funnel →
          </Link>
        ) : (
          <Link
            to={`${studioBase}?funnel=1&new=short-mystery`}
            className="inline-flex pixel-font text-sm min-h-[44px] items-center border-2 border-accent px-4 py-2 text-accent hover:bg-accent/15 transition-colors"
          >
            New game · short-mystery →
          </Link>
        )}
        <Link
          to="/play/attic-study"
          className="inline-flex pixel-font text-sm min-h-[44px] items-center border border-game-border px-4 py-2 text-muted-foreground hover:border-accent/50 hover:text-accent transition-colors"
        >
          Play Attic first
        </Link>
      </div>
    </section>
  );
}
