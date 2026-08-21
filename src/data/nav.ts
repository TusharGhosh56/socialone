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
  { label: 'What We Do', href: '#what-we-do' },
  { label: 'AI in Action', href: '#ai-in-action' },
];

export const primaryCta = { label: 'Partner With APLYD', href: '/contact' };

