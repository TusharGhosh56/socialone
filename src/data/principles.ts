// Why APLYD's 4 principle cards — now repurposed as The Challenge's 4 reasons
// AI initiatives stall (§2, moved into place of the old friction-card
// Challenge section — see index.astro's "3 · THE CHALLENGE" comment). Icons
// kept from the original set and reordered to match the new copy's own
// order (people → users left out of the data, institution → doesn't fit
// existing systems, seedling → no ownership/capability after launch,
// shield → no independent verification) rather than introducing new icon
// artwork for a repurposed section.
// Icon name type now lives in PrincipleIcon.astro (shared with the
// Principles section's EngagementPrincipleCard) — re-exported here so
// existing imports of `PrincipleIcon` from this file keep working.
import type { IconName } from '../components/PrincipleIcon.astro';
export type PrincipleIcon = IconName;

// The card's centred ambient motif (PrincipleItem.astro) — reused from
// FlowChart's own per-station animations (src/components/FlowChart/
// flowChart.ts), NOT tied to `icon` above. Explicit per-card mapping per
// product decision: card 1→data, 2→institution, 3→ownership, 4→workflow
// (card 4's badge icon is 'shield' but its motif is Workflow — intentional,
// not a mismatch to fix).
export type PrincipleMotif = 'data' | 'institution' | 'workflow' | 'ownership';

export interface Principle {
  lead: string;
  body: string;
  icon: PrincipleIcon;
  motif: PrincipleMotif;
}

export const principles: Principle[] = [
  {
    lead: 'The data does not represent the users',
    body: 'AI is only as good as the data behind it. When people are missing from the data, they are often left out of the outcomes.',
    icon: 'people',
    motif: 'data',
  },
  {
    lead: 'The solution does not fit the institution',
    body: "AI must fit existing policies, workflows and public systems. If it doesn't, adoption slows and the solution is rarely used.",
    icon: 'institution',
    motif: 'institution',
  },
  {
    lead: 'No one owns it after launch',
    body: 'Lasting impact depends on institutional ownership, not vendor dependence. Teams need the capability to operate and improve AI themselves.',
    icon: 'seedling',
    motif: 'ownership',
  },
  {
    lead: 'No one verifies whether it worked',
    body: 'Without independent measurement, institutions cannot know what created value, what needs improvement, or what should scale.',
    icon: 'shield',
    motif: 'workflow',
  },
];
