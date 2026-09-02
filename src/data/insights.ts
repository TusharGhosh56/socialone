// src/data/insights.ts — Comprehensive Data Architecture for Insights & Perspectives
import type { ImageMetadata } from 'astro';

// Team Author Headshots
import nakulPhoto from '../assets/images/team/nakul.png';
import deepaPhoto from '../assets/images/team/deepa.jpeg';
import francisPhoto from '../assets/images/team/francis.jpeg';
import suvabrataPhoto from '../assets/images/team/suvabrata.png';
import kowshikPhoto from '../assets/images/team/kowshik.png';
import harshPhoto from '../assets/images/team/harsh.jpg';
import rajeshPhoto from '../assets/images/team/rajesh.jpeg';
import vijayPhoto from '../assets/images/team/vijay.jpeg';

// Editorial Cover & Archive Photography
import sovereigntyImg from '../assets/images/built-for-gov/sovereignty.png';
import eduEvaluationImg from '../assets/images/cases/02-education-evaluation-india.jpg';
import agriImg from '../assets/images/cases/01-agriculture-india.jpg';
import waterImg from '../assets/images/cases/water-utility.jpg';
import buildingImg from '../assets/images/how-we-work-page/building.png';
import transformImg from '../assets/images/cases/transform.jpg';
import researchImg from '../assets/images/capabilities/case-field-research.jpg';

export interface Author {
  name: string;
  role: string;
  avatar?: ImageMetadata;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  formattedDate: string;
  readTime: string;
  author: Author;
  image: ImageMetadata;
  featured?: boolean;
}

export interface CoverStory extends Article {
  pillars: {
    title: string;
    description: string;
    icon: string;
  }[];
}

export interface ResearchReport {
  id: string;
  reportCode: string; // e.g. APLYD-FR-2026-01
  title: string;
  lead: string;
  type: 'Policy Blueprint' | 'Evaluation Framework' | 'Technical Whitepaper' | 'Field Evidence Brief';
  sector: 'Government' | 'Education' | 'Agriculture' | 'Utilities' | 'MSMEs' | 'Responsible AI';
  pages: string;
  fileSize: string;
  date: string;
  authors: string[];
  abstract: string;
  keyStats?: {
    stat: string;
    label: string;
  }[];
  downloadUrl: string;
  bibtex: string;
}

export interface NewsDispatch {
  id: string;
  title: string;
  lead: string;
  date: string;
  formattedDate: string;
  category: 'Deployment' | 'Partnership' | 'Keynote' | 'Media';
  location: string;
  body: string[];
  externalUrl?: string;
  quote?: {
    text: string;
    attribution: string;
  };
}

// ---------------------------------------------------------------------------
// 1. ARTICLES & JOURNAL DATA
// ---------------------------------------------------------------------------

export const coverStory: CoverStory = {
  id: 'sovereign-ai-playbook',
  slug: 'sovereign-ai-playbook',
  title: 'From Pilot to Public Infrastructure: The Playbook for Institutional AI Deployment',
  excerpt: 'How public systems bridge the divide from isolated machine learning experiments to hardened, sovereign national infrastructure that civil servants trust and control.',
  category: 'Sovereign AI',
  date: '2026-09-01',
  formattedDate: 'SEP 01, 2026',
  readTime: '9 min read',
  author: {
    name: 'Nakul Jain',
    role: 'Co-Founder & CEO, APLYD',
    avatar: nakulPhoto,
  },
  image: sovereigntyImg,
  featured: true,
  pillars: [
    {
      title: 'Sovereign Architecture',
      description: 'Cloud-agnostic deployment patterns ensuring full institutional IP ownership, citizen data residency, and zero vendor lock-in.',
      icon: 'shield',
    },
    {
      title: 'Frontline Caseworker Adoption',
      description: 'Designing human-in-the-loop workflows where municipal officers and caseworkers retain ultimate authority over algorithmic recommendations.',
      icon: 'users',
    },
    {
      title: 'Pre-Deployment Bias Auditing',
      description: 'Independent evaluation assessing accuracy, dialect robustness, and demographic fairness before public procurement.',
      icon: 'check-circle',
    },
    {
      title: 'Sovereign Codebase Handover',
      description: 'Transferring 100% production code, automated CI/CD pipelines, and internal engineering documentation to state technical teams.',
      icon: 'terminal',
    },
  ],
};

export const archiveArticles: Article[] = [
  {
    id: 'speech-recognition-dialects',
    slug: 'speech-recognition-dialects',
    title: 'Benchmarking Speech Recognition Models Across Low-Resource Dialects',
    excerpt: 'Evaluating model accuracy, phoneme error rates, and dialectal fairness across 8,000 Hindi and Gujarati audio samples before classroom rollout.',
    category: 'Responsible AI',
    date: '2026-08-26',
    formattedDate: 'AUG 26, 2026',
    readTime: '7 min read',
    author: {
      name: 'Dr. Francis Xavier Rathinam',
      role: 'Senior Director, Global MERL Practice',
      avatar: francisPhoto,
    },
    image: eduEvaluationImg,
  },
  {
    id: 'data-interoperability-agrifood',
    slug: 'data-interoperability-agrifood',
    title: 'Data Interoperability for Frontline Agrifood Planning Hubs',
    excerpt: 'Structuring farmer telemetry, weather forecasts, and market pricing into a unified data fabric for frontline agricultural extension officers.',
    category: 'Public Systems',
    date: '2026-08-14',
    formattedDate: 'AUG 14, 2026',
    readTime: '6 min read',
    author: {
      name: 'Suvabrata Roy',
      role: 'Associate Director, Technology Solutions',
      avatar: suvabrataPhoto,
    },
    image: agriImg,
  },
  {
    id: 'digital-sandboxes-procurement',
    slug: 'digital-sandboxes-procurement',
    title: 'Digital Sandboxes: The Antidote to Speculative Public AI Procurement',
    excerpt: 'Why municipal utilities must stress-test vendor algorithms against historical operational telemetry before executing multi-year contracts.',
    category: 'Policy & Procurement',
    date: '2026-07-30',
    formattedDate: 'JUL 30, 2026',
    readTime: '8 min read',
    author: {
      name: 'Kowshik Ganesh',
      role: 'Director, Products & Innovation',
      avatar: kowshikPhoto,
    },
    image: waterImg,
  },
  {
    id: 'sovereign-codebase-handover',
    slug: 'sovereign-codebase-handover',
    title: 'The Sovereign Codebase Handover: Eliminating Institutional Dependency',
    excerpt: 'How APLYD transfers 100% IP, documentation, and internal CI/CD pipelines to state IT teams upon deployment completion.',
    category: 'System Architecture',
    date: '2026-07-18',
    formattedDate: 'JUL 18, 2026',
    readTime: '5 min read',
    author: {
      name: 'Nakul Jain',
      role: 'Co-Founder & CEO, APLYD',
      avatar: nakulPhoto,
    },
    image: buildingImg,
  },
  {
    id: 'citizen-services-grievance-routing',
    slug: 'citizen-services-grievance-routing',
    title: 'Frontline Caseworker Empowerment vs. Unchecked Algorithmic Automation',
    excerpt: 'Case evidence from Kampala: why conversational interfaces succeed only when paired with authenticated municipal backend workflows.',
    category: 'Frontline Delivery',
    date: '2026-06-28',
    formattedDate: 'JUN 28, 2026',
    readTime: '6 min read',
    author: {
      name: 'Deepa Karthykeyan',
      role: 'Co-Founder, APLYD',
      avatar: deepaPhoto,
    },
    image: transformImg,
  },
  {
    id: 'adversarial-stress-testing',
    slug: 'adversarial-stress-testing',
    title: 'Adversarial Stress-Testing for Social Protection Algorithms',
    excerpt: 'Detecting demographic exclusion, false-negative clustering, and model drift in automated welfare disbursement systems across rural districts.',
    category: 'Responsible AI',
    date: '2026-06-10',
    formattedDate: 'JUN 10, 2026',
    readTime: '10 min read',
    author: {
      name: 'Dr. Harsh Vats',
      role: 'Program Manager, AI Transformation',
      avatar: harshPhoto,
    },
    image: researchImg,
  },
];

export const articleCategories = [
  'All Articles',
  'Sovereign AI',
  'Responsible AI',
  'Public Systems',
  'Policy & Procurement',
  'System Architecture',
  'Frontline Delivery',
];

// ---------------------------------------------------------------------------
// 2. RESEARCH & REPORTS DATA
// ---------------------------------------------------------------------------

export const flagshipReport: ResearchReport = {
  id: 'sovereign-ai-benchmark-2026',
  reportCode: 'APLYD-FR-2026-01',
  title: 'The 2026 Global Sovereign AI Benchmark: Institutional Readiness Across 28 Nations',
  lead: 'An empirical investigation into national compute self-sufficiency, public dataset stewardship, and algorithmic governance across low- and middle-income economies.',
  type: 'Policy Blueprint',
  sector: 'Government',
  pages: '148 Pages',
  fileSize: '8.4 MB PDF',
  date: 'August 2026',
  authors: ['Dr. Francis Xavier Rathinam', 'Nakul Jain', 'Deepa Karthykeyan', 'Dr. Sudhanshu Joshi'],
  abstract: 'This benchmark provides the first comprehensive empirical evaluation of national sovereign AI readiness. Analyzing institutional infrastructure, data residency mandates, and operational AI deployments across 28 governments in Africa, Asia, and Latin America, the study reveals critical vulnerabilities in public-sector procurement while outlining proven architectural remedies for long-term algorithmic independence.',
  keyStats: [
    { stat: '28', label: 'Developing Nations Benchmarked' },
    { stat: '82%', label: 'Public Systems Facing Vendor Lock-in' },
    { stat: '3.4x', label: 'Long-term Savings via Sovereign Codebases' },
  ],
  downloadUrl: '#download-benchmark-2026',
  bibtex: `@techreport{aplyd2026sovereign,
  author = {Rathinam, Francis Xavier and Jain, Nakul and Karthykeyan, Deepa and Joshi, Sudhanshu},
  title = {The 2026 Global Sovereign AI Benchmark: Institutional Readiness Across 28 Nations},
  institution = {APLYD by Athena Infonomics},
  year = {2026},
  number = {APLYD-FR-2026-01},
  url = {https://aplyd.com/insights/research-and-reports#sovereign-ai-benchmark-2026}
}`,
};

export const researchReports: ResearchReport[] = [
  {
    id: 'speech-literacy-evaluation',
    reportCode: 'APLYD-RR-2026-03',
    title: 'Algorithmic Fairness in Primary Education: A Multi-Dialect Evaluation Protocol',
    lead: 'Standardized methodology for evaluating speech-to-text literacy models across non-standard dialects, acoustic variations, and gender representations in public classrooms.',
    type: 'Evaluation Framework',
    sector: 'Education',
    pages: '64 Pages',
    fileSize: '4.2 MB PDF',
    date: 'July 2026',
    authors: ['Dr. Harsh Vats', 'Dr. Francis Xavier Rathinam', 'Anupama Ramaswamy'],
    abstract: 'This protocol provides public education authorities with an empirical framework for evaluating speech-enabled literacy assessments. We detail quantitative testing procedures across ~8,000 recordings in Hindi and Gujarati, highlighting methods to detect and remediate dialectal bias prior to high-stakes classroom adoption.',
    downloadUrl: '#download-speech-literacy',
    bibtex: `@techreport{vats2026algorithmic,
  author = {Vats, Harsh and Rathinam, Francis Xavier and Ramaswamy, Anupama},
  title = {Algorithmic Fairness in Primary Education: A Multi-Dialect Evaluation Protocol},
  institution = {APLYD by Athena Infonomics},
  year = {2026},
  number = {APLYD-RR-2026-03}
}`,
  },
  {
    id: 'utility-sandboxes-framework',
    reportCode: 'APLYD-RR-2026-02',
    title: 'Municipal Utility AI Sandboxes: Framework for Empirical Pre-Procurement',
    lead: 'Operational blueprint for establishing secure, data-isolated environments where public utilities can benchmark commercial leakage detection and pressure models before contracting.',
    type: 'Policy Blueprint',
    sector: 'Utilities',
    pages: '52 Pages',
    fileSize: '3.6 MB PDF',
    date: 'May 2026',
    authors: ['Kowshik Ganesh', 'Suvabrata Roy', 'Vijay Bhalaki'],
    abstract: 'Procuring commercial AI for municipal water utilities carries severe financial and operational risk when claims are tested only post-contract. This framework outlines the architecture, data de-identification, and validation metrics needed to run a 90-day sandbox using real SCADA telemetry.',
    downloadUrl: '#download-utility-sandboxes',
    bibtex: `@techreport{ganesh2026utility,
  author = {Ganesh, Kowshik and Roy, Suvabrata and Bhalaki, Vijay},
  title = {Municipal Utility AI Sandboxes: Framework for Empirical Pre-Procurement},
  institution = {APLYD by Athena Infonomics},
  year = {2026},
  number = {APLYD-RR-2026-02}
}`,
  },
  {
    id: 'farmer-data-governance',
    reportCode: 'APLYD-RR-2025-08',
    title: 'Farmer-Centric Data Governance: Legal, Technical, and Consent Architectures',
    lead: 'Architectural specifications for protecting smallholder data sovereignty, establishing collective consent protocols, and preventing extractive data practices across agrifood ecosystems.',
    type: 'Technical Whitepaper',
    sector: 'Agriculture',
    pages: '78 Pages',
    fileSize: '5.1 MB PDF',
    date: 'December 2025',
    authors: ['Dr. Rajesh Khanna', 'Suvabrata Roy', 'Dr. Sudhanshu Joshi'],
    abstract: 'Smallholder farmers frequently generate valuable telemetry without retaining ownership or receiving fair economic value. Developed in collaboration with multilateral funders, this whitepaper defines legal consent contracts, API access tiers, and tokenized governance primitives that enforce farmer rights.',
    downloadUrl: '#download-farmer-data',
    bibtex: `@techreport{khanna2025farmer,
  author = {Khanna, Rajesh and Roy, Suvabrata and Joshi, Sudhanshu},
  title = {Farmer-Centric Data Governance: Legal, Technical, and Consent Architectures},
  institution = {APLYD by Athena Infonomics},
  year = {2025},
  number = {APLYD-RR-2025-08}
}`,
  },
  {
    id: 'msme-ai-readiness-survey',
    reportCode: 'APLYD-RR-2025-05',
    title: 'MSME AI Readiness Diagnostic: Survey of 1,200 Micro-Manufacturers',
    lead: 'Field findings on equipment telemetry maturity, edge compute constraints, and working capital barriers to automated visual quality control in precision manufacturing.',
    type: 'Field Evidence Brief',
    sector: 'MSMEs',
    pages: '44 Pages',
    fileSize: '2.9 MB PDF',
    date: 'October 2025',
    authors: ['Vijay Bhalaki', 'Nakul Jain', 'Ankit Chatri'],
    abstract: 'Drawing on on-site diagnostics across 1,200 manufacturing enterprises in 6 industrial clusters, this brief details the actual technical and financial readiness for AI deployment. We outline practical modular upgrades that yield immediate ROI without capital-intensive machinery replacement.',
    downloadUrl: '#download-msme-diagnostic',
    bibtex: `@techreport{bhalaki2025msme,
  author = {Bhalaki, Vijay and Jain, Nakul and Chatri, Ankit},
  title = {MSME AI Readiness Diagnostic: Survey of 1,200 Micro-Manufacturers},
  institution = {APLYD by Athena Infonomics},
  year = {2025},
  number = {APLYD-RR-2025-05}
}`,
  },
];

// ---------------------------------------------------------------------------
// 3. NEWS & DISPATCHES DATA
// ---------------------------------------------------------------------------

export const newsDispatches: NewsDispatch[] = [
  {
    id: 'east-africa-utility-partnership',
    title: 'APLYD Signs Strategic Framework with East African Utility Data Collaborative',
    lead: 'A consortium of 7 municipal water authorities across Africa formally adopts APLYD’s shared AI sandbox framework to validate machine learning leak-detection algorithms.',
    date: '2026-08-28',
    formattedDate: 'AUG 28, 2026',
    category: 'Partnership',
    location: 'Nairobi, Kenya',
    body: [
      'The East African Utility Data Collaborative has selected APLYD to design and deploy an open-architecture AI testing sandbox across participating water utilities. The initiative will allow public utilities to benchmark predictive pressure and non-revenue water algorithms against real operational telemetry in a secure, pre-procurement environment.',
      'By evaluating performance metrics and false-alarm rates prior to signing commercial software licenses, member utilities expect to reduce procurement cycle risks and accelerate the adoption of verified leak-mitigation systems.',
    ],
    quote: {
      text: 'Public utilities cannot afford to gamble public capital on unverified black-box algorithms. This shared sandbox creates a rigorous, evidence-first procurement barrier that protects public infrastructure.',
      attribution: 'Kowshik Ganesh, Director of Products & Innovation, APLYD',
    },
  },
  {
    id: 'geneva-un-digital-compact',
    title: 'Dr. Francis Xavier Rathinam Keynotes UN Global Digital Compact Panel on Algorithmic Auditing',
    lead: 'Presenting empirical findings on independent algorithmic assurance and dialect fairness in public service deployments at the Palais des Nations.',
    date: '2026-08-12',
    formattedDate: 'AUG 12, 2026',
    category: 'Keynote',
    location: 'Geneva, Switzerland',
    body: [
      'Speaking before senior delegates, multilateral advisors, and digital ministers at the United Nations in Geneva, Dr. Francis Xavier Rathinam presented APLYD’s framework for independent pre-deployment algorithmic assurance.',
      'Drawing on recent evaluations of literacy and social-welfare models, Dr. Rathinam emphasized that algorithmic audits must move beyond laboratory accuracy benchmarks to test performance under genuine frontline operating constraints and marginalized demographic contexts.',
    ],
    quote: {
      text: 'True responsible AI is not a set of voluntary ethical principles; it is an empirical engineering discipline of rigorous pre-deployment stress-testing, dialect verification, and institutional accountability.',
      attribution: 'Dr. Francis Xavier Rathinam, Senior Director, Global MERL Practice, APLYD',
    },
  },
  {
    id: 'kampala-250k-transactions',
    title: 'Deployment Milestone: Kampala Citizen Assistant Surpasses 250,000 Verified Service Interactions',
    lead: 'The GenAI-enabled municipal WhatsApp and Telegram service assistant reaches a key operational milestone with 94% first-contact resolution.',
    date: '2026-07-22',
    formattedDate: 'JUL 22, 2026',
    category: 'Deployment',
    location: 'Kampala, Uganda',
    body: [
      'The Kampala Capital City Authority (KCCA) and APLYD announced today that the city’s conversational public services assistant has processed over 250,000 citizen inquiries, property registrations, and trade license status checks.',
      'Built with authenticated API bridges into KCCA municipal backends, the system ensures zero hallucination on official records while reducing average citizen wait times from 4.5 days to under 3 minutes.',
    ],
    quote: {
      text: 'Connecting citizens to government services through everyday mobile channels has transformed civic engagement across Kampala while maintaining complete data confidentiality.',
      attribution: 'Deepa Karthykeyan, Co-Founder, APLYD',
    },
  },
  {
    id: 'financial-times-high-growth-2026',
    title: 'Financial Times Recognizes Athena Infonomics and APLYD Among High-Growth Leaders',
    lead: 'Featured on the prestigious FT Asia-Pacific High-Growth Companies ranking for the fourth consecutive year, reflecting sustained global expansion in applied intelligence.',
    date: '2026-07-05',
    formattedDate: 'JUL 05, 2026',
    category: 'Media',
    location: 'London & New Delhi',
    body: [
      'The Financial Times and Statista have included Athena Infonomics and its applied AI practice APLYD in the annual FT High-Growth Companies Asia-Pacific list for 2026.',
      'The ranking recognizes organizations demonstrating compound revenue growth, institutional integrity, and transformative delivery across global public and multilateral markets.',
    ],
  },
  {
    id: 'india-ai-mission-msme-launch',
    title: 'Launch of National MSME AI Diagnostic Roadmap with MeitY and IndiaAI Mission',
    lead: 'Release of practical diagnostic toolkits, incentive structures, and readiness playbooks tailored for small and medium manufacturing enterprises.',
    date: '2026-06-15',
    formattedDate: 'JUN 15, 2026',
    category: 'Deployment',
    location: 'New Delhi, India',
    body: [
      'In collaboration with the IndiaAI Mission under the Ministry of Electronics and Information Technology (MeitY), APLYD has unveiled the national AI readiness roadmap for small manufacturers.',
      'The framework provides enterprise clusters with accessible self-assessment tools, edge-compute implementation guides, and curated government incentive pathways to foster domestic manufacturing competitiveness.',
    ],
  },
  {
    id: 'bogota-sovereign-ai-summit',
    title: 'APLYD Convenes Ministerial Working Group on Sovereign Foundation Models in Bogotá',
    lead: 'Senior technology officials from six Latin American ministries meet to align on open-weights model deployment, compute pooling, and civil service AI capability.',
    date: '2026-05-30',
    formattedDate: 'MAY 30, 2026',
    category: 'Keynote',
    location: 'Bogotá, Colombia',
    body: [
      'At an executive roundtable convened in Bogotá, APLYD leadership shared blueprints for building state-owned sovereign AI capabilities. Discussions centered on open-weights model fine-tuning for regional legal codes, indigenous language preservation, and safeguarding sovereign intellectual property.',
    ],
  },
];
