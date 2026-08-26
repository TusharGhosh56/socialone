// Primary nav — supporting direct links and dropdown menus
export interface NavSubItem {
  label: string;
  href: string;
  description?: string;
}

export interface NavLink {
  label: string;
  href?: string;
  children?: NavSubItem[];
}

export const navLinks: NavLink[] = [
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
    href: '/ai-in-action',
    children: [
      {
        label: 'All Case Studies',
        href: '/ai-in-action',
        description: 'Overview of applied AI across public systems.',
      },
      {
        label: 'Education',
        href: '/ai-in-action/education',
        description: 'Early-warning models and teacher quality analytics.',
      },
      {
        label: 'Agriculture',
        href: '/ai-in-action/agriculture',
        description: 'Farmer advisory hubs and agricultural data governance.',
      },
      {
        label: 'MSMEs & Enterprise',
        href: '/ai-in-action/msmes',
        description: 'AI adoption and productivity diagnostics for MSMEs.',
      },
      {
        label: 'Public Services & Government',
        href: '/ai-in-action/public-services-government',
        description: 'Citizen grievance routing and urban public delivery.',
      },
      {
        label: 'Utilities & Infrastructure',
        href: '/ai-in-action/utilities',
        description: 'Municipal utility telemetry and non-revenue water.',
      },
      {
        label: 'Responsible AI & Assurance',
        href: '/ai-in-action/monitoring-evaluation-responsible-ai',
        description: 'Independent algorithmic auditing, fairness, and safety.',
      },
    ],
  },
];

export const primaryCta = { label: 'Partner With APLYD', href: '/contact' };
