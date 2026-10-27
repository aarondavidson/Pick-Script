/**
 * Plain-language first-error help so new authors don’t abandon on jargon.
 */

/** Turn a technical validation string into a short “what to do”. */
export function humanizeValidationMessage(message: string): string {
  const m = message.trim();
  if (/startRoom/i.test(m)) {
    return "Pick a starting room that exists in your room list.";
  }
  if (/pickup hotspot.*itemId|missing itemId/i.test(m)) {
    return "That pickup needs an item id — use the Intent Wizard → Get item.";
  }
  if (/has no image|placeholder/i.test(m)) {
    return "Upload room art (or Pixels → Send to pack) before publishing.";
  }
  if (/link (from|to) unknown|unknown room/i.test(m)) {
    return "A room link points at a missing room — fix or delete the link.";
  }
  if (/combination/i.test(m)) {
    return "A combine recipe is incomplete — open Polish → Puzzles.";
  }
  if (/will do nothing|never matches|handlers never fire/i.test(m)) {
    return "A hotspot won’t react — add Look text or run the Intent Wizard.";
  }
  if (/under 4%|hard to tap/i.test(m)) {
    return "A hotspot is too small for phones — enlarge it on the stage.";
  }
  if (/Pack must be|schemaVersion|missing id|missing title/i.test(m)) {
    return "Pack meta is incomplete — set id and title in the Pack section.";
  }
  // Keep original as fallback (still useful)
  return m.length > 160 ? `${m.slice(0, 157)}…` : m;
}

export function scrollToPackValidation(): void {
  const el = document.getElementById("pack-validation");
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}
