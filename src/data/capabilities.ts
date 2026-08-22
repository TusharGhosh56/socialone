// src/data/capabilities.ts — Master dataset for all 3 institutional sectors
export interface CapabilityItem {
  num: string;
  id: string;
  title: string;
  tag: string;
  lead: string;
  p1: string;
  p2: string;
  highlights: string[];
  flowSteps: { title: string; desc: string }[];
}

export interface InstitutionalBarrier {
  id: string;
  title: string;
  symptom: string;
  solution: string;
  mechanism: string;
}

export interface SectorData {
  id: 'government' | 'nonprofits' | 'philanthropy';
  label: string;
  href: string;
  pillBadge: string;
  heroH1: string;
  heroLead: string;
  sectionEyebrow: string;
  sectionTitle: string;
  sectionLead: string;
  sectorTag: string;
  capabilities: CapabilityItem[];
  barriers: InstitutionalBarrier[];
  ctaLabel: string;
  ctaTitle: string;
  ctaDesc: string;
  ctaHref: string;
  ctaButtonText: string;
}

export const sectorDataList: Record<'government' | 'nonprofits' | 'philanthropy', SectorData> = {
  government: {
    id: 'government',
    label: 'For Government',
    href: '/services/our-capabilities/government',
    pillBadge: 'Our Capabilities · For Government',
    heroH1: 'For government: build AI into public systems and capability',
    heroLead: 'We work with government institutions across the full AI implementation journey, from assessing readiness and identifying the right use cases to building systems and establishing the capability to operate and improve them over time.',
    sectionEyebrow: 'Government AI Capabilities',
    sectionTitle: 'Four interconnected capabilities for public scale',
    sectionLead: "The four capabilities below represent the key components of that journey. Engagements may draw on one or several, depending on the institution's needs. In practice, they are closely connected, with evidence and learning from one informing the next.",
    sectorTag: 'Government Systems',
    capabilities: [
      {
        num: '01',
        id: 'readiness',
        title: 'AI portfolio and readiness',
        tag: 'Strategic Scoping & Mandate',
        lead: 'Establishing a clear, evidence-based foundation for public AI investment before resources are committed.',
        p1: "Before anything is built, we assess where AI can create meaningful value and what it will take to implement it effectively. This includes the institution's mandate, data maturity and ownership, existing infrastructure, workflows and workforce.",
        p2: 'We use this assessment to identify and prioritise the decisions and services where AI has a credible role, and develop a sequenced roadmap covering use cases, data and infrastructure requirements, and procurement. The aim is to establish a clear basis for investment before resources are committed to implementation.',
        highlights: [
          'Institutional Mandate & Policy Assessment',
          'Data Maturity, Governance & Sovereign Ownership',
          'Infrastructure & Operational Workflow Gap Analysis',
          'Sequenced Procurement & Investment Roadmap'
        ],
        flowSteps: [
          { title: 'Mandate Scoping', desc: 'Identify high-value public decisions' },
          { title: 'Data Audit', desc: 'Assess registry maturity & governance' },
          { title: 'Friction Analysis', desc: 'Evaluate operational complexity' },
          { title: 'Delivery Roadmap', desc: 'Sequenced implementation plan' }
        ]
      },
      {
        num: '02',
        id: 'solutions',
        title: 'Public-service solutions',
        tag: 'Production-Grade AI Systems',
        lead: 'Documented, interoperable systems engineered around frontline public service delivery.',
        p1: 'When a use case is ready to move forward, we design and build solutions around the needs of the public service. This can include advisory and planning systems, triage and supervision tools, and data integrations that connect with existing MIS and operational systems.',
        p2: 'Interoperability, security and decision rights are addressed as part of the system design, alongside the product and technical architecture. The result is a documented solution with the architecture, requirements and controls needed for implementation, operation and future development.',
        highlights: [
          'Advisory, Planning & Citizen Triage Systems',
          'MIS & Legacy Registry Pipeline Integration',
          'Interoperability & Data Standards Frameworks',
          'Security Controls & Transparent Decision Rights'
        ],
        flowSteps: [
          { title: 'MIS Integration', desc: 'Connect to administrative pipelines' },
          { title: 'AI Engineering', desc: 'Build triage & advisory engines' },
          { title: 'Security & Access', desc: 'Define access & decision rights' },
          { title: 'Live Integration', desc: 'Deploy to existing infrastructure' }
        ]
      },
      {
        num: '03',
        id: 'field-design',
        title: 'Field evidence and service design',
        tag: 'Frontline Context & Co-Design',
        lead: 'Studying actual delivery settings to shape systems around the people who run and use public services.',
        p1: 'Effective public services depend on how systems work in practice. We study users and workflows in their actual delivery settings, bringing together evidence from frontline teams and the people who use the service.',
        p2: 'This evidence informs co-design and prototyping with the people who will operate and use the system. We also establish the supporting foundations required for responsible implementation, including data standards, security controls, governance and standard operating procedures. The focus is not only on the tool, but on the service environment in which it needs to work.',
        highlights: [
          'Frontline Workflow & Caseload Observation',
          'Ground-Level Co-Design & Rapid Prototyping',
          'Standard Operating Procedures (SOPs) & Guardrails',
          'Responsible AI Governance & Security Protocols'
        ],
        flowSteps: [
          { title: 'Field Shadowing', desc: 'Observe real caseload delivery' },
          { title: 'Case Tracing', desc: 'Map last-mile bottlenecks' },
          { title: 'Operator Lab', desc: 'Co-design with frontline staff' },
          { title: 'SOP Baseline', desc: 'Operationalize standard routines' }
        ]
      },
      {
        num: '04',
        id: 'ownership',
        title: 'Capability and ownership',
        tag: 'Institutional Handover & Quality Assurance',
        lead: 'Leaving public institutions with durable operating routines and independent quality assurance.',
        p1: 'Sustained adoption requires institutional capability, not continued dependence on an external provider. We build ownership into the engagement from the outset, with clear product responsibilities, user training and the support structures required to operate the system.',
        p2: 'We also help institutions develop the capacity to assess model quality, fairness and public outcomes over time. The objective is to leave teams with the knowledge, operating routines and assurance mechanisms needed to manage and improve the system independently.',
        highlights: [
          'Workforce Training & Operational Playbooks',
          'Institutional Governance & Oversight Transfer',
          'Ongoing Quality, Fairness & Safety Audits',
          'Independent Public Value & Outcome Monitoring'
        ],
        flowSteps: [
          { title: 'Skill Transfer', desc: 'Train internal operators & leads' },
          { title: 'Sovereign Handover', desc: 'Transfer code, docs & workflows' },
          { title: 'Fairness Audit', desc: 'Verify safety, bias & accuracy' },
          { title: 'Sustained Run', desc: 'Institution owns and operates' }
        ]
      },
    ],
    barriers: [
      {
        id: 'legacy-data',
        title: 'Fragmented Legacy MIS & Siloed Registries',
        symptom: 'Public data sits locked in disjointed SQL databases, legacy spreadsheets, and state-level registries with variable formats.',
        solution: 'We engineer custom ETL pipelines and interoperable data integration layers that connect cleanly into existing government MIS without demanding multi-year core infrastructure overhauls.',
        mechanism: 'Standards-compliant API gateways, automated schema harmonization, and sovereign institutional data custody.'
      },
      {
        id: 'frontline-adoption',
        title: 'Frontline Resistance & Caseload Friction',
        symptom: 'Field workers and frontline caseworkers abandon top-down software tools because they slow down already overwhelming caseloads.',
        solution: 'We shadow frontline workers in the field and co-design tools directly alongside them, building offline-resilient, streamlined interfaces that reduce administrative burden rather than adding to it.',
        mechanism: 'Last-mile workflow observation, contextual usability testing, and practical standard operating procedures (SOPs).'
      },
      {
        id: 'vendor-lockin',
        title: 'Vendor Lock-in & Data Sovereignty Risks',
        symptom: 'Government agencies become permanently dependent on closed proprietary platforms with escalating licensing and unmodifiable models.',
        solution: 'APLYD designs every engagement with its own conclusion. We hand over the complete codebase, architecture documentation, and operational routines directly to the institution.',
        mechanism: 'Open architecture standards, sovereign cloud deployment, and structured capability transfer workshops.'
      },
      {
        id: 'fairness-scrutiny',
        title: 'Public Scrutiny, Fairness & Auditability',
        symptom: 'Concerns over algorithmic bias, opaque decision-making, and regulatory compliance stall AI deployment into live public services.',
        solution: 'We establish human-in-the-loop oversight, transparent decision rights, and enforce structurally independent third-party audits of safety and fairness.',
        mechanism: 'Explainable decision logging, structural assurance separation, and regular model fairness readouts.'
      }
    ],
    ctaLabel: 'Case Evidence',
    ctaTitle: 'See these capabilities deployed in real public services.',
    ctaDesc: 'Explore how APLYD delivers population-scale AI across agriculture, health, education, and social infrastructure.',
    ctaHref: '/ai-in-action/public-services-government',
    ctaButtonText: 'See it in practice'
  },
  nonprofits: {
    id: 'nonprofits',
    label: 'For Nonprofits',
    href: '/services/our-capabilities/nonprofits',
    pillBadge: 'Our Capabilities · For Nonprofits',
    heroH1: 'For nonprofits: make AI useful across strategy and delivery',
    heroLead: 'We work with nonprofits and development organisations to apply AI across strategy, programme operations and delivery. Our work spans the journey from identifying where AI can create value to building the systems, capabilities and safeguards required for responsible adoption, and measuring what changes in practice.',
    sectionEyebrow: 'Nonprofit AI Capabilities',
    sectionTitle: 'Four practical capabilities for mission impact',
    sectionLead: 'Designed for the operational constraints and diverse field realities of international development and civil society organisations.',
    sectorTag: 'Nonprofit & Development',
    capabilities: [
      {
        num: '01',
        id: 'strategy',
        title: 'Strategy and prioritisation',
        tag: 'Evidence Synthesis & Leverage',
        lead: 'Synthesising programme evidence to identify where AI creates meaningful strategic leverage.',
        p1: 'Organisations often have substantial programme evidence across evaluations, partner reports and operational data, but limited capacity to bring it together for strategic decision-making. We synthesise this evidence to identify decisions where AI can create meaningful value, and assess opportunities against organisational priorities, resources and readiness.',
        p2: 'We then develop an AI opportunity portfolio and, where useful, use scenario analysis to support strategic and resource decisions. The resulting roadmap sequences adoption around clear priorities, evidence and organisational capacity.',
        highlights: [
          'Portfolio-Wide Evidence Synthesis & Extraction',
          'AI Opportunity Prioritisation & Impact Matrix',
          'Strategic Scenario & Resource Feasibility Analysis',
          'Capacity-Aligned, Sequenced Adoption Roadmap'
        ],
        flowSteps: [
          { title: 'Evidence Ingestion', desc: 'Synthesise evaluation & partner reports' },
          { title: 'Portfolio Matrix', desc: 'Prioritise high-leverage decisions' },
          { title: 'Scenario Analysis', desc: 'Model operational & resource impact' },
          { title: 'Adoption Roadmap', desc: 'Sequenced organisational plan' }
        ]
      },
      {
        num: '02',
        id: 'operations',
        title: 'Operations and partner support',
        tag: 'Workflow Systems & Copilots',
        lead: 'Designing knowledge retrieval systems and operational copilots for frontline delivery partners.',
        p1: 'We begin by understanding the workflows through which programmes are delivered, including the roles, information and processes that support day-to-day operations. This informs the design of knowledge retrieval systems, programme operations copilots and tools that strengthen coordination and support across partner networks.',
        p2: 'Solutions are prototyped in real delivery environments and designed around the practical conditions of implementation, including differences in data, connectivity and organisational capacity. The objective is to develop systems that integrate with existing workflows and can be adopted across diverse delivery contexts.',
        highlights: [
          'Institutional Knowledge Retrieval & Synthesis Systems',
          'Programme Operations & Partner Support Copilots',
          'Cross-Partner Coordination & Reporting Tools',
          'Low-Bandwidth, Offline-Resilient Architecture'
        ],
        flowSteps: [
          { title: 'Workflow Mapping', desc: 'Study partner delivery realities' },
          { title: 'Knowledge Engine', desc: 'Build institutional retrieval RAG' },
          { title: 'Copilot Build', desc: 'Design operational workflow tools' },
          { title: 'Partner Rollout', desc: 'Deploy across diverse field contexts' }
        ]
      },
      {
        num: '03',
        id: 'responsible-ai',
        title: 'Responsible adoption',
        tag: 'Governance & Human Oversight',
        lead: 'Embedding privacy, safety, and equity safeguards into everyday operating routines.',
        p1: 'Responsible adoption begins with understanding the conditions in which an AI system will operate. We assess data maturity, define appropriate human oversight and evaluate technology options against requirements for privacy, safety and equity, alongside functional and operational considerations.',
        p2: "We establish the governance arrangements, safeguards and operating procedures required for responsible use, while building the capability of product owners and users to manage the system in practice. This embeds responsibility within the organisation's operating model rather than treating it as a separate compliance exercise.",
        highlights: [
          'Human-in-the-Loop Oversight Protocols & Thresholds',
          'Data Privacy, Beneficiary Safety & Equity Audits',
          'Practical Standard Operating Procedures for AI',
          'Internal Product Owner Capability Building'
        ],
        flowSteps: [
          { title: 'Maturity Audit', desc: 'Assess data & privacy risks' },
          { title: 'Oversight Rules', desc: 'Establish human-in-the-loop gates' },
          { title: 'SOP Integration', desc: 'Embed ethics into daily routines' },
          { title: 'Owner Enablement', desc: 'Train internal product stewards' }
        ]
      },
      {
        num: '04',
        id: 'learning-scale',
        title: 'Learning and scale',
        tag: 'Continuous Measurement & Iteration',
        lead: 'Translating real-world adoption evidence into structured improvements and responsible expansion.',
        p1: 'Once a system is in use, we assess performance across the model, users, workflows and the outcomes it is intended to support. This provides evidence on system performance, adoption, operational constraints and areas requiring improvement.',
        p2: 'Findings are translated into an improvement backlog and used to inform decisions on further development and scale. Expansion is based on evidence of performance, adoption and organisational readiness, rather than deployment alone.',
        highlights: [
          'Multi-Dimensional Performance & Adoption Tracking',
          'Workflow Telemetry & Outcome Measurement',
          'Evidence-Driven Continuous Improvement Backlog',
          'Readiness-Gated Scaling Milestones'
        ],
        flowSteps: [
          { title: 'Telemetry Readout', desc: 'Track real frontline adoption' },
          { title: 'Gap Discovery', desc: 'Isolate workflow friction points' },
          { title: 'Improvement Loop', desc: 'Iterate model & product backlog' },
          { title: 'Gated Scale', desc: 'Scale only on verified readiness' }
        ]
      },
    ],
    barriers: [
      {
        id: 'trapped-evidence',
        title: 'Trapped Programme Evidence & Evaluation Silos',
        symptom: 'Years of evaluation studies, partner reports, and operational datasets sit trapped in unsearchable PDF archives and spreadsheets.',
        solution: 'We build secure institutional knowledge retrieval systems and semantic search engines that surface evidence at the exact moment strategic decisions are made.',
        mechanism: 'Citation-grounded retrieval architectures, automated evaluation indexing, and verified hallucination guardrails.'
      },
      {
        id: 'partner-heterogeneity',
        title: 'Uneven Partner Technical Capacity & Connectivity',
        symptom: 'Downstream implementation partners operate in low-bandwidth regions on basic mobile devices, abandoning heavy enterprise software.',
        solution: 'We engineer lightweight, offline-resilient copilots and intuitive chat/voice workflows tailored to the actual digital realities of frontline teams.',
        mechanism: 'Edge caching, asynchronous data syncing, multi-lingual prompting, and simplified operator interfaces.'
      },
      {
        id: 'beneficiary-vulnerability',
        title: 'Beneficiary Data Protection & Ethical Risks',
        symptom: 'Handling vulnerable population data creates severe ethical, legal, and reputational risks if managed through generic commercial AI tools.',
        solution: 'We implement zero-retention data pipelines, automated PII scrubbing, and embed human-in-the-loop oversight directly into standard operating procedures.',
        mechanism: 'Differential privacy filters, sovereign cloud hosting, and transparent ethical governance playbooks.'
      },
      {
        id: 'pilot-dependency',
        title: 'Grant Expiry & Post-Pilot Stagnation',
        symptom: 'AI solutions collapse the moment grant funding cycles end because external contractors held all technical and operational know-how.',
        solution: 'We train in-house product owners from day one and build self-sustaining operating routines so the organization runs the tool independently.',
        mechanism: 'Comprehensive technical handbooks, staff upskilling bootcamps, and documented open-source infrastructure.'
      }
    ],
    ctaLabel: 'Case Evidence',
    ctaTitle: 'See responsible AI deployed with civil society leaders.',
    ctaDesc: 'Discover how our evaluation and responsible AI frameworks support data-driven decision-making across global programmes.',
    ctaHref: '/ai-in-action/monitoring-evaluation-responsible-ai',
    ctaButtonText: 'See it in practice'
  },
  philanthropy: {
    id: 'philanthropy',
    label: 'For Philanthropy',
    href: '/services/our-capabilities/philanthropy',
    pillBadge: 'Our Capabilities · For Philanthropy',
    heroH1: 'For philanthropy: turn portfolio evidence into better decisions',
    heroLead: 'We work with funders who want their portfolios to make better decisions, not simply to fund more technology. The four capabilities below move from reading the evidence across a portfolio to the independent assurance that keeps the next allocation honest.',
    sectionEyebrow: 'Philanthropy & Funder Capabilities',
    sectionTitle: 'Four pillars for durable philanthropic impact',
    sectionLead: 'Helping foundations, development finance institutions, and philanthropic trusts build shared public goods and evaluate what truly works.',
    sectorTag: 'Philanthropy & Funders',
    capabilities: [
      {
        num: '01',
        id: 'portfolio-strategy',
        title: 'Portfolio strategy',
        tag: 'Capital Allocation & Focus',
        lead: 'Reading evidence across the entire grant portfolio to inform capital allocation and sector leverage.',
        p1: "A fund's influence tends to concentrate in a handful of decisions that move money and shape a field. We read the evidence across the whole portfolio to find those decisions, rather than treating each grant in isolation, and look for where AI could strengthen them.",
        p2: "The opportunity view we build is grounded in the fund's own strategy, not a generic technology agenda dropped on top of it. What a funder is left with is a clear line from evidence, to the decisions that matter, to the roadmap that would fund them.",
        highlights: [
          'Cross-Portfolio Evidence Synthesis & Decision Mapping',
          'High-Leverage Capital Allocation Opportunity Analysis',
          'Funder-Specific Strategic AI Roadmaps',
          'Field-Level Technology Landscaping & Scoping'
        ],
        flowSteps: [
          { title: 'Portfolio Audit', desc: 'Read evidence across all active grants' },
          { title: 'Decision Mapping', desc: 'Isolate pivotal capital allocation choices' },
          { title: 'Strategy Grounding', desc: 'Align with funder core mission' },
          { title: 'Funder Roadmap', desc: 'Structured investment & funding plan' }
        ]
      },
      {
        num: '02',
        id: 'ecosystem-infra',
        title: 'Ecosystem infrastructure',
        tag: 'Shared Digital Public Goods',
        lead: 'Designing shared data platforms and public digital goods that serve multiple grantees sustainably.',
        p1: 'Funders often pay several grantees to build the same thing four times over, then wonder why none of it is maintained. Where a data system, a shared tool or a knowledge platform could serve many grantees at once, we design and build it as shared infrastructure.',
        p2: 'That includes a clear model for how the infrastructure is governed, reused and kept alive after the initial grant. Done well, it spreads cost, raises the floor for smaller grantees who could never build it alone, and leaves something durable in the field rather than a set of one-off tools that expire with their funding.',
        highlights: [
          'Shared Open Data Systems & Interoperable Platforms',
          'Cross-Grantee Reusable AI Tooling & APIs',
          'Post-Grant Infrastructure Governance Models',
          'Field-Wide Capacity & Equity Enhancement'
        ],
        flowSteps: [
          { title: 'Redundancy Audit', desc: 'Identify duplicated grantee spend' },
          { title: 'Common Platform', desc: 'Engineer shared modular digital assets' },
          { title: 'Governance Design', desc: 'Establish multi-grantee stewardship' },
          { title: 'Field Longevity', desc: 'Durable infrastructure outlasting grants' }
        ]
      },
      {
        num: '03',
        id: 'grantee-capability',
        title: 'Grantee capability',
        tag: 'Ownership & Practical Guardrails',
        lead: 'Empowering grantee teams to genuinely hold, operate, and sustain the systems they are given.',
        p1: 'Tools that grantees do not truly own tend to stall the moment a grant ends. We run workshops and hands-on support so grantees genuinely hold the tools they are given, understand how they work, and can keep them running.',
        p2: 'Alongside that, we set responsible-AI guardrails practical enough for a stretched team to actually follow, rather than a compliance checklist that gets ignored. The aim is capability that outlasts the funding, not a dependency that has to be renewed with every cycle.',
        highlights: [
          'Hands-on Grantee Technical Workshops & Clinics',
          'Pragmatic, Contextual Responsible-AI Guardrails',
          'Operational Tool Handover & Maintenance Protocols',
          'Self-Sustaining Operating Routines for Non-Engineers'
        ],
        flowSteps: [
          { title: 'Hands-on Clinics', desc: 'Interactive workshops with grantee teams' },
          { title: 'Practical Ethics', desc: 'Pragmatic, usable responsible-AI rules' },
          { title: 'Tool Handover', desc: 'Full transfer of operational ownership' },
          { title: 'Self-Sufficiency', desc: 'Durable capacity beyond funding cycle' }
        ]
      },
      {
        num: '04',
        id: 'independent-assurance',
        title: 'Independent assurance',
        tag: 'Objective Evidence & Readouts',
        lead: 'Measuring what actually changed on the ground to keep every future allocation honest.',
        p1: 'Finally, we measure what actually changed for the people a portfolio is meant to serve, not just what was built or delivered. We test quality, fairness and adoption, and report back plainly, including when the honest answer is that something did not work.',
        p2: "Because we keep this work separate from delivery, a funder gets a read it can trust and defend, and each allocation is better informed than the last. Over time, that is what turns a portfolio's evidence into better decisions rather than better reporting.",
        highlights: [
          'Rigorous Model Quality, Safety & Fairness Audits',
          'Real-World Population Adoption & Telemetry Readouts',
          'Unbiased, Third-Party Impact Measurement Reports',
          'Allocation Guidance & Evidence Feedback Loops'
        ],
        flowSteps: [
          { title: 'Objective Audit', desc: 'Independent testing of quality & bias' },
          { title: 'Adoption Telemetry', desc: 'Measure real-world beneficiary uptake' },
          { title: 'Plain-Truth Readout', desc: 'Transparent reporting of what worked' },
          { title: 'Informed Allocation', desc: 'Evidence guides the next grant cycle' }
        ]
      },
    ],
    barriers: [
      {
        id: 'duplicate-spend',
        title: 'Duplicated Grantee Spending & Shelfware',
        symptom: 'Funders fund multiple grantees to build fragmented, custom tools that replicate each other and decay after grant completion.',
        solution: 'We architect shared digital public infrastructure and common data platforms that serve multiple grantees at scale, cutting redundant spend.',
        mechanism: 'Shared open-source architectures, standardized APIs, and post-grant multi-stakeholder governance models.'
      },
      {
        id: 'grantee-abandonment',
        title: 'Grantee Tool Abandonment Post-Funding',
        symptom: 'Stretched grantee teams receive complex systems they lack the engineering capacity to maintain once technical assistance ends.',
        solution: 'We run practical technical clinics and institute lightweight, maintainable architectures with clear operating guardrails.',
        mechanism: 'Operator bootcamps, low-maintenance infrastructure design, and pragmatic responsible-AI playbooks.'
      },
      {
        id: 'conflicted-reporting',
        title: 'Vendor Conflict of Interest & Vanity Metrics',
        symptom: 'Technology providers evaluate their own builds, highlighting vanity deployment stats while hiding poor field adoption and algorithmic bias.',
        solution: 'We enforce structural separation: we never evaluate systems we build, and never build systems we evaluate, guaranteeing candid truth.',
        mechanism: 'Independent third-party evaluation methodologies, population impact metrics, and objective improve/hold/stop readouts.'
      },
      {
        id: 'evidence-gap',
        title: 'Evidence-Free Next Round Allocations',
        symptom: 'Capital allocation decisions are made in isolated silos without learning from the empirical outcome data of prior funding rounds.',
        solution: 'We build an integrated evidence synthesis loop that translates ground-level performance into actionable intelligence for the next allocation.',
        mechanism: 'Cross-portfolio evidence syntheses, outcome tracking dashboards, and evidence-informed RFP design frameworks.'
      }
    ],
    ctaLabel: 'Case Evidence',
    ctaTitle: 'Explore portfolio evaluation and shared digital goods in action.',
    ctaDesc: 'Learn how APLYD and Athena Infonomics support multilateral funds, global foundations, and institutional partners worldwide.',
    ctaHref: '/ai-in-action/monitoring-evaluation-responsible-ai',
    ctaButtonText: 'See it in practice'
  }
};
