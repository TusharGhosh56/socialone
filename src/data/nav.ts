// Primary nav — anchors to on-page sections (§6.1).
export interface NavLink {
  label: string;
  href: string;
}

export const navLinks: NavLink[] = [
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
];

export const primaryCta = { label: 'Partner With APLYD', href: '/contact' };
