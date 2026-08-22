/** @type {import('tailwindcss').Config} */
// Tokens mirror src/styles/global.css (§4). The CSS vars are the source of
// truth for runtime theming; these mirror them so Tailwind utilities exist.
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'deep-navy': '#1A2150',
        navy: '#232B65',
        'mid-navy': '#4A538A',
        'pale-navy': '#E8EAF1',
        'deep-gold': '#A87826',
        gold: '#D19C33',
        'pale-gold': '#F5E9D1',
        ink: '#0A0A0A',
        ash: '#6B6B6B',
        smoke: '#C8C8C2',
        hair: '#E4E4DF',
        paper: '#F5F5F2',
        'off-white': '#FAFAF7',
        white: '#FFFFFF',
      },
      fontFamily: {
        // Lato self-hosted via @fontsource; system fallbacks for FOUT window.
        sans: ['Lato', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // Fluid type scale (§4.2) — clamp(min, pref, max).
        //
        // `hero` implements the brand guidelines' explicit website Hero Type
        // spec (Digital Application → Website): Lato Light, 64–96px,
        // line-height 1.05. The vw term is tuned so the rendered size lands
        // INSIDE that band across the desktop range the spec is written for —
        // 6.5vw is 66.6px at a 1024px viewport (narrowest desktop) and 93.6px
        // at 1440px (the guidelines' own webgrid width), with the 6rem/96px
        // ceiling taking over above ~1477px. The 2.75rem floor is deliberately
        // below the stated band: 64px is unusable on a 390px phone, and 64–96px
        // is a desktop hero spec rather than a mobile minimum.
        // letterSpacing is -0.01em, not `display`'s -0.02em — Lato Light at
        // ~90px needs far less optical tightening than Lato Black did at 56px,
        // and over-tightening a Light weight closes up its counters.
        hero: ['clamp(2.75rem, 6.5vw, 6rem)', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
        display: ['clamp(2.1rem, 4.25vw, 3.5rem)', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        // Ceiling pulled 3.25rem -> 2.75rem (52px -> 44px) to restore the step
        // the guidelines' six-step hierarchy defines between Display (36) and
        // Headline (28) — a 0.778 ratio. Against `display`'s 56px ceiling, 52px
        // was a 0.93 ratio, i.e. Headline sat almost level with Display (most
        // visible on the contact page, whose h1 is `text-display`); 44px puts it
        // at 0.786, essentially the specified ratio. 44px Bold is still a
        // confident section heading rather than a shouted one.
        h2: ['clamp(2rem, 3.2vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        h3: ['clamp(1.25rem, 2vw, 1.6rem)', { lineHeight: '1.2' }],
        lede: ['clamp(1.15rem, 2vw, 1.6rem)', { lineHeight: '1.4' }],
        body: ['1.0625rem', { lineHeight: '1.6' }],
        small: ['0.875rem', { lineHeight: '1.5' }],
        eyebrow: ['0.8125rem', { lineHeight: '1', letterSpacing: '0.14em' }],
        metric: ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1' }],
      },
      maxWidth: {
        // 1440px per the guidelines' website webgrid spec (12 columns / 1440px
        // max / 80px outer margins) — mirrors .container-x in global.css, which
        // is what actually lays the page out.
        container: '1440px',
        prose: '720px',
        measure: '68ch',
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px',
        pill: '999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(26,33,80,.06)',
        md: '0 8px 24px -8px rgba(26,33,80,.12)',
        lg: '0 24px 60px -20px rgba(26,33,80,.20)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: {
        micro: '150ms',
        base: '280ms',
        reveal: '600ms',
      },
      spacing: {
        // 8pt scale supplements Tailwind defaults where the spec names values.
        section: 'clamp(5rem, 10vw, 9rem)',
        gutter: 'clamp(1.25rem, 5vw, 4rem)',
      },
    },
  },
  plugins: [],
};
