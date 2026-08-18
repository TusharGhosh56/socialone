// Principles section (was "How We Work") — 4 cards, reusing the exact same
// StepCarousel/StepRow expand-on-hover mechanic and Step shape as the
// archived original how-we-work steps (src/data/steps.ts) rather than a
// separate static layout — see index.astro's "5 · PRINCIPLES" comment for
// why that's the case (an earlier plain-grid version was explicitly
// reverted). Real photos (card_01-web.jpg..card_04-web.jpg, pre-shrunk from
// 7-18MB originals to 2400px-long-edge/~82%-quality JPEGs via sharp, same
// convention as steps.ts's own sources — the untouched originals were
// deleted, not committed) replace the earlier placeholder-reuse of the
// archived how-we-work photos, mapped positionally (card_01 → 1st
// principle, ... card_04 → 4th). Card 4's own focus is set on both states
// per explicit product decision — extreme right+top (`100% 0%`) on both
// collapsed AND expanded, so its subject stays framed the same way
// regardless of which box shape is currently showing it — the other 3 stay
// centred on both (StepRow.astro's own defaults).
import img01 from '../assets/images/how-we-work/card_01-web.jpg';
import img02 from '../assets/images/how-we-work/card_02-web.jpg';
import img03 from '../assets/images/how-we-work/card_03-web.jpg';
import img04 from '../assets/images/how-we-work/card_04-web.jpg';
import type { Step } from './steps';

export const engagementPrinciples: Step[] = [
  {
    icon: 'institution',
    title: 'We work inside institutions',
    body: 'We work alongside government teams, building solutions that fit existing systems and day-to-day operations.',
    image: img01,
  },
  {
    icon: 'seedling',
    title: 'We leave capability behind',
    body: 'Every engagement strengthens the people, processes and systems needed to continue the work independently.',
    image: img02,
  },
  {
    icon: 'evidence',
    title: 'We follow the evidence',
    body: 'We measure what is happening on the ground so decisions are guided by evidence rather than assumptions.',
    image: img03,
  },
  {
    icon: 'shield',
    title: 'We stay independent',
    body: 'Independent evaluation provides an objective view of what is working, where improvements are needed and what is ready to scale.',
    image: img04,
    focusUnexpanded: '100% 0%',
    focusExpanded: '100% 0%',
  },
];
