import {
  PackShipChecklist,
  type PackShipChecklistProps,
} from "@/studio/PackShipChecklist";

export type PackSetupPanelProps = PackShipChecklistProps;

/**
 * Ship checklist panel (doctor + playtest + soft-locks).
 * Kept as PackSetupPanel for existing PackTool / #pack-setup wiring.
 */
export function PackSetupPanel(props: PackSetupPanelProps) {
  return <PackShipChecklist {...props} />;
}
