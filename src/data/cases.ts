// AI in Action — case studies, now a peek/slide carousel (CaseCarousel.astro
// + src/scripts/caseCarousel.ts) rather than a static 3-up grid. Copy
// verbatim. TODO: individual case-study pages (§16) — until those exist,
// `href` stays a placeholder on-page anchor.
//
// 8 real case studies now (was 3, cycled to pad out to 10 placeholder slots
// — that padding is gone now that real content exists for the rest, per
// this file's own earlier TODO). CaseCarousel doesn't care how many items
// it's given (`const N = cases.length` in that component), so no component
// changes needed for the count to have changed.
import type { ImageMetadata } from 'astro';
import img01 from '../assets/images/cases/01-agriculture-india.jpg';
import img02 from '../assets/images/cases/02-education-evaluation-india.jpg';
import img03 from '../assets/images/cases/03-education-mexico.jpg';
import img04 from '../assets/images/cases/04-msme.jpg';
import img05 from '../assets/images/cases/05-farmer.jpg';
import img06 from '../assets/images/cases/06-learning.jpg';
import img07 from '../assets/images/cases/07-skilling.jpg';
import img08 from '../assets/images/cases/08-agriculture-systems.jpg';

export interface CaseStudy {
  title: string;
  body: string;
  tag: string;
  href: string;
  image: ImageMetadata;
}

export const cases: CaseStudy[] = [
  {
    title: 'Andhra Pradesh, India — AI advisory in agriculture',
    body: 'Transforming Rythu Seva Kendras into data-driven service and planning hubs for farmers, with interoperable data, human-in-the-loop AI, and real-time monitoring.',
    tag: 'Agriculture · India',
    href: '#ai-in-action', // TODO: link to individual case-study page
    image: img01,
  },
  {
    title: 'Hindi & Gujarati, India — Independent model evaluation',
    body: 'Evaluated an AI-enabled Oral Reading Fluency solution across ~8,000 audio files, testing accuracy and fairness across grades, dialects, and gender groups.',
    tag: 'Education · Evaluation · India',
    href: '#ai-in-action', // TODO: link to individual case-study page
    image: img02,
  },
  {
    title: 'Guanajuato, Mexico — Equitable AI in education',
    body: 'Strengthened an early-warning system for student dropout, using fairness tooling to detect gender bias and build practical safeguards for public officials.',
    tag: 'Education · Mexico',
    href: '#ai-in-action', // TODO: link to individual case-study page
    image: img03,
  },
  {
    title: 'Advancing AI adoption in MSMEs',
    body: 'Diagnosed AI-readiness across small manufacturers and built a field-tested adoption roadmap of playbooks, incentives and capacity plans, for the IndiaAI Mission.',
    tag: 'Government · India',
    href: '#ai-in-action', // TODO: link to individual case-study page
    image: img04,
  },
  {
    title: 'Farmer-Centric Data Governance',
    body: 'Developed farmer-first data-governance frameworks that define rights, consent and value-sharing for agricultural data across programmes.',
    tag: 'Ethics & Infra · Global',
    href: '#ai-in-action', // TODO: link to individual case-study page
    image: img05,
  },
  {
    title: 'AI for Agriculture Learning Series',
    body: 'Convened a global Community of Practice to share evidence and practical playbooks for deploying AI in smallholder agriculture.',
    tag: 'Skilling and Data · Global',
    href: '#ai-in-action', // TODO: link to individual case-study page
    image: img06,
  },
  {
    title: 'National AI Skilling Programme',
    body: 'Designed and delivered an AI-skilling curriculum for 400,000 learners, with assessment tools and trainer support built for national scale.',
    tag: 'Skilling and Data · India',
    href: '#ai-in-action', // TODO: link to individual case-study page
    image: img07,
  },
  {
    title: 'AI in food & agriculture systems',
    body: 'A mixed-methods study of AI across agrifood systems in low- and middle-income countries: the evidence base for responsible, pro-smallholder adoption.',
    tag: 'Ethics & Infra · Global',
    href: '#ai-in-action', // TODO: link to individual case-study page
    image: img08,
  },
];
