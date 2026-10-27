import { Link } from "react-router-dom";
import type { StudioTabId, ValidationIssue } from "@/engine/validationHelp";
import { recipeHref, studioTabHref } from "@/engine/validationHelp";
import { humanizeValidationMessage } from "@/studio/plainValidation";

export interface ValidationIssueListProps {
  issues: ValidationIssue[];
  /** Show warnings (default true) */
  showWarnings?: boolean;
  /** Guided mode: plain language + Pack-only fix links (no Recipes) */
  guided?: boolean;
  className?: string;
}

function guidedTab(tab: StudioTabId | undefined): StudioTabId {
  if (!tab) return "pack";
  if (tab === "hotspots" || tab === "combines" || tab === "scene") {
    return "pack";
  }
  return tab;
}

/**
 * Renders validation issues with deep links to Recipes and Studio tabs.
 */
export function ValidationIssueList({
  issues,
  showWarnings = true,
  guided = false,
  className = "",
}: ValidationIssueListProps) {
  const list = showWarnings
    ? issues
    : issues.filter((i) => i.level === "error");
  if (!list.length) return null;

  return (
    <ul className={`space-y-2 text-xs ${className}`}>
      {list.map((issue, idx) => {
        const tab = guided ? guidedTab(issue.studioTab) : issue.studioTab;
        const body = guided
          ? humanizeValidationMessage(issue.message)
          : issue.message;
        return (
          <li
            key={`${issue.level}-${idx}-${issue.message.slice(0, 40)}`}
            className={`border px-2 py-1.5 ${
              issue.level === "error"
                ? "border-destructive/50 text-destructive"
                : "border-border text-muted-foreground"
            }`}
          >
            <div className="leading-relaxed">
              <span className="uppercase tracking-wider text-[9px] mr-2 opacity-70">
                {issue.level}
              </span>
              {body}
            </div>
            {guided && body !== issue.message && (
              <p className="mt-1 text-[10px] text-muted-foreground opacity-80">
                Detail: {issue.message}
              </p>
            )}
            {(tab || (!guided && issue.recipeId)) && (
              <div className="mt-1 flex flex-wrap gap-2">
                {tab && (
                  <Link
                    to={studioTabHref(tab)}
                    className="text-primary underline"
                  >
                    {guided ? "Fix in Pack" : `Studio → ${tab}`}
                  </Link>
                )}
                {!guided && issue.recipeId && (
                  <Link
                    to={recipeHref(issue.recipeId)}
                    className="text-accent underline"
                  >
                    Recipe: {issue.recipeId}
                  </Link>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
