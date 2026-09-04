// Our Team section — names/titles/tags extracted from a reference image
// (text only, not that image's grouped-row design — see TeamCarousel.astro
// for how this project's own 2-row opposite-direction marquee actually
// lays these out). `subtitle` is genuinely optional — only 3 of Leadership's
// 4 people have a second (Athena Infonomics) role line in the source image;
// everyone else has a single title line only.
//
// Photos imported from src/assets (not public/) so Astro's build-time image
// pipeline actually processes them — same convention as src/data/steps.ts.
// User-uploaded originals landed in public/images/team/ first and were
// moved here for that reason (Harsh's arrived later, straight into
// src/assets/images/team/ already). `photo` stays optional on the type
// even though everyone now has one — TeamCard.astro's initials fallback is
// still there for whenever the next new hire's photo lags their bio.
import type { ImageMetadata } from 'astro';
import deepaPhoto from '../assets/images/team/deepa.jpeg';
import vijayPhoto from '../assets/images/team/vijay.jpeg';
import nakulPhoto from '../assets/images/team/nakul.png';
import sudhanshuPhoto from '../assets/images/team/sudhanshu.jpeg';
import kowshikPhoto from '../assets/images/team/kowshik.png';
import prasaanthPhoto from '../assets/images/team/prasaanth.png';
import suvabrataPhoto from '../assets/images/team/suvabrata.png';
import harshPhoto from '../assets/images/team/harsh.jpg';
import francisPhoto from '../assets/images/team/francis.jpeg';
import rajeshPhoto from '../assets/images/team/rajesh.jpeg';
import ankitPhoto from '../assets/images/team/ankit.png';
import anupamaPhoto from '../assets/images/team/anupama.jpeg';
import siddharthaPhoto from '../assets/images/team/Siddhartha.jpeg';
import gitikaPhoto from '../assets/images/team/Gitika Sharan.jpeg';

export type TeamTag = 'Leadership' | 'AI & Digital Transformation' | 'Evaluation & Consulting';

export interface TeamMember {
  name: string;
  title: string;
  subtitle?: string;
  tag: TeamTag;
  photo?: ImageMetadata;
  photoPosition?: string;
  // Real per-person LinkedIn profile URLs (client-supplied, 2026-08-11) —
  // TeamCard.astro still falls back to '#' for anyone without one, but
  // everyone currently has one.
  linkedin?: string;
}

export const team: TeamMember[] = [
  { name: 'Deepa Karthykeyan', title: 'Co-Founder, APLYD', subtitle: 'Co-Founder & Partner, Athena Infonomics', tag: 'Leadership', photo: deepaPhoto, linkedin: 'https://in.linkedin.com/pub/deepa-karthykeyan/b7/b2/bb6' },
  { name: 'Vijay Bhalaki', title: 'Co-Founder, APLYD', subtitle: 'Co-Founder & Partner, Athena Infonomics', tag: 'Leadership', photo: vijayPhoto, linkedin: 'https://in.linkedin.com/in/vijay-bhalaki-46297913' },
  { name: 'Nakul Jain', title: 'Co-Founder & CEO, APLYD', subtitle: 'Partner, Athena Infonomics', tag: 'Leadership', photo: nakulPhoto, linkedin: 'https://www.linkedin.com/in/nakul-jain/' },
  { name: 'Dr Sudhanshu Joshi', title: 'Partner, Athena Infonomics', tag: 'Leadership', photo: sudhanshuPhoto, linkedin: 'https://www.linkedin.com/pub/sudhanshu-joshi/4/a15/b52' },
  { name: 'Kowshik Ganesh', title: 'Director, Products & Innovation', tag: 'AI & Digital Transformation', photo: kowshikPhoto, linkedin: 'https://linkedin.com/in/kowshik-ganesh-30b0b580' },
  { name: 'Prasaanth Balraj', title: 'Associate Director, AI & Digital Transformation', tag: 'AI & Digital Transformation', photo: prasaanthPhoto, linkedin: 'https://linkedin.com/in/prasaanth-balraj-025664150' },
  { name: 'Suvabrata Roy', title: 'Associate Director, Technology Solutions', tag: 'AI & Digital Transformation', photo: suvabrataPhoto, linkedin: 'https://www.linkedin.com/in/suvabrata-roy-b9085514/' },
  { name: 'Dr Harsh Vats', title: 'Program Manager, AI Transformation', tag: 'AI & Digital Transformation', photo: harshPhoto, linkedin: 'https://www.linkedin.com/in/harsh-vats-programofficer' },
  { name: 'Siddhartha Kumar', title: 'Manager, Strategic Operations', tag: 'AI & Digital Transformation', photo: siddharthaPhoto, linkedin: 'https://www.linkedin.com/in/siddhartha-kumar-5365091a0' },
  { name: 'Gitika Sharan', title: 'Head, Marketing & Strategic Communications', tag: 'AI & Digital Transformation', photo: gitikaPhoto, photoPosition: '50% 20%', linkedin: 'https://www.linkedin.com/in/gitika-sharan-6a329013/' },
  { name: 'Dr Francis Xavier Rathinam', title: 'Senior Director, Global MERL Practice', tag: 'Evaluation & Consulting', photo: francisPhoto, linkedin: 'https://www.linkedin.com/in/francis-xavier-rathinam-2289101/' },
  { name: 'Dr Rajesh Khanna', title: 'Director, Local Governance & MERL', tag: 'Evaluation & Consulting', photo: rajeshPhoto, linkedin: 'https://www.linkedin.com/in/rajesh-khanna28' },
  { name: 'Ankit Chatri', title: 'Director, Government Partnerships', tag: 'Evaluation & Consulting', photo: ankitPhoto, linkedin: 'https://www.linkedin.com/in/ankit-chatri-8a797315' },
  { name: 'Anupama Ramaswamy', title: 'Director, MERL', tag: 'Evaluation & Consulting', photo: anupamaPhoto, linkedin: 'https://www.linkedin.com/in/anupama-ramaswamy-2b129723/' },
];

// Split into the 2 marquee rows (TeamCarousel.astro) by alternating through
// the list above (odd/even index) rather than keeping each tag's 4 people
// together — so each row gets a mix of all 3 tags instead of one row
// reading as "just Leadership" — 2 of each tag per row either way.
export const teamRowA: TeamMember[] = team.filter((_, i) => i % 2 === 0);
export const teamRowB: TeamMember[] = team.filter((_, i) => i % 2 === 1);
