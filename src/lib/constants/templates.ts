// ─── Group template definitions ───────────────────────────────────
// Icon names reference lucide-react component names.
// Labels/descriptions are locale keys (see locales/en/groups.json).

import type { GroupTemplate } from "@/lib/types";

export interface TemplateDefinition {
  id: GroupTemplate;
  /** Locale key for the template label */
  labelKey: string;
  /** Locale key for the template description */
  descKey: string;
  /** lucide-react icon name */
  icon: string;
  /** Whether this template tracks balances between members */
  tracksBalances: boolean;
}

export const GROUP_TEMPLATES: TemplateDefinition[] = [
  { id: "trip", labelKey: "groups.templates.trip", descKey: "groups.templates.tripDesc", icon: "Plane", tracksBalances: true },
  { id: "turf", labelKey: "groups.templates.turf", descKey: "groups.templates.turfDesc", icon: "Dumbbell", tracksBalances: true },
  { id: "casual", labelKey: "groups.templates.casual", descKey: "groups.templates.casualDesc", icon: "Coffee", tracksBalances: true },
  { id: "household", labelKey: "groups.templates.household", descKey: "groups.templates.householdDesc", icon: "Home", tracksBalances: false },
];

export function getTemplateDefinition(id: GroupTemplate): TemplateDefinition | undefined {
  return GROUP_TEMPLATES.find((t) => t.id === id);
}
