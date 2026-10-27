/**
 * Map validation messages → fix-it links (recipes + studio tabs).
 */

export type StudioTabId =
  | "pack"
  | "pixels"
  | "hotspots"
  | "scene"
  | "audio"
  | "combines";

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
  /** Deep link: /recipes#recipe-<id> */
  recipeId?: string;
  /** Deep link: /pick?tab=<id> (alias /studio) */
  studioTab?: StudioTabId;
  path?: string;
}

export interface LinkedValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  issues: ValidationIssue[];
}

type Rule = {
  test: (msg: string) => boolean;
  recipeId?: string;
  studioTab?: StudioTabId;
};

const RULES: Rule[] = [
  {
    test: (m) => /startRoom|missing startRoom/i.test(m),
    studioTab: "pack",
    recipeId: "map-travel",
  },
  {
    test: (m) => /exit.*unknown room|link (from|to) unknown/i.test(m),
    studioTab: "pack",
    recipeId: "locked-exit",
  },
  {
    test: (m) => /pickup hotspot.*itemId|missing itemId/i.test(m),
    studioTab: "hotspots",
    recipeId: "get-item",
  },
  {
    test: (m) => /has no image|placeholder will be used/i.test(m),
    studioTab: "pixels",
  },
  {
    test: (m) => /combination/i.test(m),
    studioTab: "combines",
    recipeId: "combine-items",
  },
  {
    test: (m) => /hint /i.test(m),
    recipeId: "hints",
  },
  {
    test: (m) => /use-with|useWith/i.test(m),
    studioTab: "hotspots",
    recipeId: "use-with",
  },
  {
    test: (m) =>
      /will do nothing|never matches|never craftable|handlers never fire|stays blocked/i.test(
        m
      ),
    studioTab: "hotspots",
    recipeId: "use-with",
  },
  {
    test: (m) => /under 4% size|hard to tap/i.test(m),
    studioTab: "hotspots",
  },
  {
    test: (m) => /character hotspot.*no dialogue/i.test(m),
    studioTab: "pack",
  },
  {
    test: (m) => /missing id|missing title|missing version|rooms is empty/i.test(m),
    studioTab: "pack",
  },
  {
    test: (m) => /schemaVersion|Pack must be|Pack missing/i.test(m),
    studioTab: "pack",
  },
  {
    test: (m) => /duplicate hotspot|hotspot without id/i.test(m),
    studioTab: "hotspots",
  },
  {
    test: (m) => /music|ambient|audio/i.test(m),
    studioTab: "audio",
  },
];

function annotate(message: string, level: "error" | "warning"): ValidationIssue {
  for (const rule of RULES) {
    if (rule.test(message)) {
      return {
        level,
        message,
        recipeId: rule.recipeId,
        studioTab: rule.studioTab,
      };
    }
  }
  return { level, message, studioTab: "pack" };
}

/** Attach recipe / studio deep links to a flat validation result. */
export function linkValidationResult(result: {
  ok: boolean;
  errors: string[];
  warnings: string[];
}): LinkedValidationResult {
  const issues: ValidationIssue[] = [
    ...result.errors.map((m) => annotate(m, "error")),
    ...result.warnings.map((m) => annotate(m, "warning")),
  ];
  return {
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    issues,
  };
}

export type StudioTabHrefOpts = {
  /** Pixel/Scene send target, e.g. `room` | `character` */
  send?: string;
};

/** Canonical P.I.C.K. deep link (`/pick`, alias `/studio`). */
export function studioTabHref(
  tab: StudioTabId,
  opts?: StudioTabHrefOpts
): string {
  const params = new URLSearchParams();
  if (tab !== "pack") params.set("tab", tab);
  if (opts?.send) params.set("send", opts.send);
  const q = params.toString();
  return q ? `/pick?${q}` : "/pick";
}

/** In-app recipes gallery (`/pick/recipes`, alias `/recipes`). */
export function recipesGalleryHref(): string {
  return "/pick/recipes";
}

export function recipeHref(recipeId: string): string {
  return `/pick/recipes#recipe-${recipeId}`;
}
