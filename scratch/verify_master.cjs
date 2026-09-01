const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');

const expectedH1s = [
  { path: 'about/built-for-government/index.html', h1: 'Built for government, and the institutions that serve at scale' },
  { path: 'about/16-years-of-proof/index.html', h1: 'Sixteen years of delivery behind a new kind of AI practice' },
  { path: 'about/purpose-and-direction/index.html', h1: "Why we exist, and where we're headed" },
  { path: 'about/how-we-work/index.html', h1: 'Four principles behind every engagement' },
  { path: 'about/people/index.html', h1: 'Specialists across AI, delivery and evaluation' },
  { path: 'services/our-approach/index.html', h1: 'From the decision worth improving to a system that lasts' },
  { path: 'services/our-capabilities/government/index.html', h1: 'For government: build AI into public systems and capability' },
  { path: 'services/our-capabilities/nonprofits/index.html', h1: 'For nonprofits: make AI useful across strategy and delivery' },
  { path: 'services/our-capabilities/philanthropy/index.html', h1: 'For philanthropy: turn portfolio evidence into better decisions' },
  { path: 'ai-in-action/education/index.html', h1: 'AI in education' },
  { path: 'ai-in-action/agriculture/index.html', h1: 'AI in agriculture' },
  { path: 'ai-in-action/msmes/index.html', h1: 'AI for MSMEs' },
  { path: 'ai-in-action/utilities/index.html', h1: 'AI for utilities' },
  { path: 'ai-in-action/public-services-government/index.html', h1: 'AI for public services and government' },
  { path: 'ai-in-action/monitoring-evaluation-responsible-ai/index.html', h1: 'Monitoring, evaluation and responsible AI' }
];

console.log('--- VERIFYING EXACT H1s ACROSS ALL CORE PAGES ---');
let allH1sPassed = true;
expectedH1s.forEach(item => {
  const filePath = path.join(distDir, item.path);
  if (!fs.existsSync(filePath)) {
    console.error(`MISSING FILE: ${item.path}`);
    allH1sPassed = false;
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(item.h1)) {
    console.log(`[PASS] ${item.path} -> "${item.h1}"`);
  } else {
    console.error(`[FAIL] ${item.path} DOES NOT contain "${item.h1}"`);
    allH1sPassed = false;
  }
});

console.log('\n--- VERIFYING EXACT CTA DESTINATIONS ---');
const expectedCtas = [
  { path: 'about/built-for-government/index.html', link: '/about/how-we-work', label: 'See how we work' },
  { path: 'about/16-years-of-proof/index.html', link: '/services/our-capabilities/government', label: 'See what we build' },
  { path: 'about/purpose-and-direction/index.html', link: '/services/our-approach', label: 'See our approach' },
  { path: 'about/how-we-work/index.html', link: '/services/our-capabilities/government', label: 'Explore our capabilities' },
  { path: 'about/people/index.html', link: '/get-in-touch', label: 'Partner With APLYD' },
  { path: 'services/our-approach/index.html', link: '/services/our-capabilities/government', label: 'Explore our capabilities' }
];

let allCtasPassed = true;
expectedCtas.forEach(item => {
  const filePath = path.join(distDir, item.path);
  const content = fs.readFileSync(filePath, 'utf8');
  const hasLink = content.includes(item.link);
  const hasLabel = content.includes(item.label);
  if (hasLink && hasLabel) {
    console.log(`[PASS] ${item.path} -> CTA "${item.label}" [${item.link}]`);
  } else {
    console.error(`[FAIL] ${item.path} -> Missing CTA ${item.label} [${item.link}] (hasLink: ${hasLink}, hasLabel: ${hasLabel})`);
    allCtasPassed = false;
  }
});
