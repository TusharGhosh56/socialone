// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Canonical site URL. §16: aplyd.ai vs aplyd.org unconfirmed — defaulting to
// aplyd.ai. Change this single value to update canonical + JSON-LD.
export const SITE = 'https://aplyd.ai';

// NOTE (§12): the spec suggests @astrojs/sitemap, but its current release
// targets Astro 5's routes hook and crashes under Astro 4. For a single-page
// site a hand-authored public/sitemap.xml is more robust and dependency-free.
// If the site grows to many routes, re-add the integration on a matching
// Astro/sitemap pairing.

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  // Bind dev server to all interfaces so 127.0.0.1 and localhost both resolve.
  server: { host: true },
  integrations: [
    // applyBaseStyles:false — we own the base layer in src/styles/global.css.
    tailwind({ applyBaseStyles: false }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
});
