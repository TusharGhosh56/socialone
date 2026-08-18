// How we work — 4 numbered steps (§9 §5). Copy verbatim.
// Images imported from src/assets (not public/) so Astro's build-time image
// pipeline (astro:assets, Sharp-based) processes them — resizes, generates
// a responsive srcset, and converts to WebP — rather than serving the raw
// files untouched the way anything under public/ would. Source files here
// are already pre-shrunk (2400px long edge, ~82% JPEG quality) from the
// original 15-20MB-each camera/stock originals — the pipeline still
// benefits from a reasonably sized source rather than re-decoding a huge
// one on every build.
import type { ImageMetadata } from 'astro';
import type { IconName } from '../components/PrincipleIcon.astro';
import img01 from '../assets/images/how-we-work/01-assessment-strategy.jpg';
import img02 from '../assets/images/how-we-work/02-field-delivery.jpg';
import img03 from '../assets/images/how-we-work/03-design-build.jpg';
import img04 from '../assets/images/how-we-work/04-evaluation-assurance.jpg';
import img05 from '../assets/images/how-we-work/05-scale-guide.jpg';

// n/icon are both optional and mutually exclusive in practice — StepCarousel's
// badge (top-left, see that file) renders whichever one a given entry sets:
// `n` for this file's own archived step data, `icon` for the Principles
// section's data (src/data/engagementPrinciples.ts), which reuses this same
// Step shape/StepCarousel+StepRow mechanic rather than a separate type.
export interface Step {
  n?: string;
  icon?: IconName;
  title: string;
  body: string;
  image: ImageMetadata;
  // Crop bias, as a raw CSS object-position value (e.g. 'center', '100% 0%',
  // 'right top') — free-form rather than a constrained enum, since requested
  // focal points have already ranged from a simple side-bias to an exact
  // corner. Per-card because a blanket bias doesn't suit every photo's own
  // composition equally. See StepRow.astro's own comment for how these two
  // map to the card's collapsed vs. active state; both default to 'center'
  // when unset (this file's own archived step data never sets either).
  focusUnexpanded?: string;
  focusExpanded?: string;
}

export const steps: Step[] = [
  {
    n: '01',
    title: 'Assessment & Strategy',
    body: 'Assessing needs, defining priorities, and leading implementation from planning to delivery.',
    image: img01,
  },
  {
    n: '02',
    title: 'Field & Delivery',
    body: 'Collecting field data, engaging local stakeholders, and supporting implementation through an embedded delivery network.',
    image: img02,
  },
  {
    n: '03',
    title: 'Design & Build',
    body: 'Building AI models, digital platforms, and public digital infrastructure that support service delivery.',
    image: img03,
  },
  {
    n: '04',
    title: 'Evaluation & Assurance',
    body: 'Independent measurement and audit to assess performance, safety, and impact.',
    image: img04,
  },
  {
    n: '05',
    title: 'Scale & Guide',
    body: 'Running proven solutions in production, strengthening long-term adoption, and scaling impact as demand grows.',
    image: img05,
  },
];
