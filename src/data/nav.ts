// Primary nav — anchors to on-page sections (§6.1).
export interface NavLink {
  label: string;
  href: string;
}

export const navLinks: NavLink[] = [
<<<<<<< Updated upstream
  { label: 'The Challenge', href: '#why-aplyd' },
  { label: 'What We Do', href: '#what-we-do' },
  { label: 'AI in Action', href: '#ai-in-action' },
  // Was '#about' — that anchor stopped resolving to anything once the
  // Foundation section got archived (see index.astro's "ARCHIVED —
  // ORIGINAL FOUNDATION SECTION"). Points at the hero's own top anchor for
  // now, per explicit "for now" instruction — revisit once there's a real
  // destination for this link again. This and every other '#...' href in
  // this file only resolves on the homepage — Header.astro and
  // Footer.astro both run every href through their own identical
  // `linkHref()` helper, which prepends '/' when rendered on any other page
  // (e.g. '/#top'), so the link still lands on the right homepage section
  // instead of silently doing nothing.
  { label: 'About Us', href: '#top' },
=======
  {
    label: 'About APLYD',
    children: [
      {
        label: 'Built for Government',
        href: '/about/built-for-government',
        description: 'Applied AI within real policy and operating constraints.',
      },
      {
        label: '16 Years of Proof',
        href: '/about/16-years-of-proof',
        description: 'Evidence, digital systems and last-mile data heritage.',
      },
      {
        label: 'Purpose & Direction',
        href: '/about/purpose-and-direction',
        description: 'Mission and vision for institutional intelligence.',
      },
      {
        label: 'How We Work',
        href: '/about/how-we-work',
        description: 'Four operating principles behind every engagement.',
      },
      {
        label: 'The People Behind APLYD',
        href: '/about/people',
        description: 'Specialists across AI, delivery and evaluation.',
      },
    ],
  },
  {
    label: 'Services',
    children: [
      {
        label: 'Our Approach',
        href: '/services/our-approach',
        description: 'How we move from strategy and build to independent assurance.',
      },
      {
        label: 'Our Capabilities',
        href: '/services/our-capabilities',
        description: 'Applied AI capabilities across Government, Nonprofits, and Philanthropy.',
      },
    ],
  },
  {
    label: 'AI in Action',
    children: [
      {
        label: 'Education',
        href: '/ai-in-action/education',
        description: 'AI evaluation, learning systems and literacy models.',
      },
      {
        label: 'Agriculture',
        href: '/ai-in-action/agriculture',
        description: 'Farmer advisory hubs and farmer-centric data governance.',
      },
      {
        label: 'MSMEs',
        href: '/ai-in-action/msmes',
        description: 'Readiness diagnosis and national adoption roadmaps.',
      },
      {
        label: 'Utilities',
        href: '/ai-in-action/utilities',
        description: 'Shared operational sandboxes for pre-procurement testing.',
      },
      {
        label: 'Public Services / Government',
        href: '/ai-in-action/public-services-government',
        description: 'Citizen service assistants and municipal integrations.',
      },
      {
        label: 'M&E / Responsible AI',
        href: '/ai-in-action/monitoring-evaluation-responsible-ai',
        description: 'Evidence portals, fairness audits and agrifood research.',
      },
    ],
  },
>>>>>>> Stashed changes
];

export const primaryCta = { label: 'Partner With APLYD', href: '/contact' };
