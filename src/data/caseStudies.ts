// src/data/caseStudies.ts — 100% Exact User Copy for all AI in Action Case Studies

export interface CaseStudyItem {
  id: string;
  title: string;
  client: string;
  sector: string;
  capabilities: string;
  type: string;
  geography: string;
  summary: string;
  context: string;
  whatWeDid: string;
  whyItMatters: string;
}

export interface CaseStudyCategory {
  id: string;
  slug: string;
  title: string;
  navLabel: string;
  metaTitle: string;
  metaDescription: string;
  lead: string;
  caseStudies: CaseStudyItem[];
}

export const caseStudyCategories: Record<string, CaseStudyCategory> = {
  education: {
    id: 'education',
    slug: 'education',
    navLabel: 'Education',
    title: 'AI in education',
    metaTitle: 'AI in Education | Case Study | APLYD',
    metaDescription: "Explore APLYD's work in AI for education, including AI evaluation, responsible deployment, learning systems and evidence-led implementation.",
    lead: 'We apply AI in education with a focus on evidence, evaluation and responsible deployment. Our work assesses model accuracy, fairness and performance in real learning contexts before systems are taken into wider use.',
    caseStudies: [
      {
        id: 'oral-reading-fluency',
        title: 'Independent evaluation of an oral reading fluency model',
        client: 'Wadhwani AI',
        sector: 'Education; M&E / Responsible AI',
        capabilities: 'Independent assurance',
        type: 'Independent evaluation',
        geography: 'India',
        summary: 'Before a speech-based literacy model is deployed at scale, its accuracy and fairness need to be independently assessed. APLYD evaluated the system without involvement in its development.',
        context: 'Oral reading fluency tools use speech models to assess children’s reading performance. At scale, differences in model performance across learner groups can affect the reliability and fairness of the resulting assessments.',
        whatWeDid: 'We independently evaluated the model across approximately 8,000 Hindi and Gujarati recordings, assessing accuracy and bias across grades, dialects and gender groups before deployment.',
        whyItMatters: 'Independent evaluation provides an evidence base for deployment decisions by separating assessment from development. In this case, the model was assessed for accuracy and bias before wider use, providing evidence on its performance across different learner groups.'
      }
    ]
  },
  agriculture: {
    id: 'agriculture',
    slug: 'agriculture',
    navLabel: 'Agriculture',
    title: 'AI in agriculture',
    metaTitle: 'AI in Agriculture | Case Studies | APLYD',
    metaDescription: "Explore APLYD's work applying AI in agriculture through farmer advisory, data governance, responsible adoption and evidence-led solutions across agrifood systems.",
    lead: 'Applying AI in agriculture requires more than technical capability. It requires an understanding of farmer needs, delivery systems, data governance and the conditions for adoption. Our work spans farmer advisory, farmer-centric data governance and building the evidence base for responsible AI adoption across agrifood systems.',
    caseStudies: [
      {
        id: 'andhra-pradesh-rythu-seva',
        title: 'AI advisory in agriculture, Andhra Pradesh',
        client: 'Government of Andhra Pradesh',
        sector: 'Agriculture; Public Services / Government',
        capabilities: 'Public-service solutions; field evidence and service design',
        type: 'Advisory and system design',
        geography: 'India',
        summary: 'Andhra Pradesh’s Rythu Seva Kendras are farmer service centres that support agricultural advice and services. APLYD advised the government on strengthening these centres as data-driven planning and advisory hubs, using AI and digital systems within existing public delivery structures.',
        context: 'Rythu Seva Kendras provide a direct channel for agricultural services and farmer support. The objective was to strengthen these centres with better use of data and technology, while ensuring the approach could work across a large and diverse farming population.',
        whatWeDid: 'We advised on the design of data-driven planning hubs built around the existing centres, including advisory services, data pipelines and decision-support tools. The approach was designed to integrate AI with existing workflows and retain human oversight within service delivery.',
        whyItMatters: 'The work demonstrates how AI and data systems can be integrated into existing public-service infrastructure rather than developed as standalone applications. It combines digital decision support with established frontline delivery channels, creating a basis for more data-informed agricultural services at scale.'
      },
      {
        id: 'farmer-centric-data-governance',
        title: 'Farmer-centric data governance',
        client: 'Gates Foundation',
        sector: 'Agriculture; M&E / Responsible AI',
        capabilities: 'Responsible adoption; governance',
        type: 'Governance framework',
        geography: 'Global',
        summary: 'Agricultural data is becoming increasingly important to how programmes are designed and delivered. That makes clear governance around data rights, consent and value-sharing essential. APLYD developed farmer-first frameworks to support this across agricultural programmes.',
        context: 'As agricultural programmes generate and use more data, institutions need clear frameworks for how that data is governed, including questions of rights, consent and value-sharing.',
        whatWeDid: 'We developed farmer-first data-governance frameworks that define how rights, consent and value-sharing should be addressed across agricultural programmes. The frameworks establish clearer principles for how agricultural data is governed and how the interests of farmers are considered within that process.',
        whyItMatters: 'Responsible use of agricultural data depends on the governance structures established around it. By addressing rights, consent and value-sharing at the programme level, institutions can create a stronger foundation for responsible data use and future AI applications.'
      }
    ]
  },
  msmes: {
    id: 'msmes',
    slug: 'msmes',
    navLabel: 'MSMEs',
    title: 'AI for MSMEs',
    metaTitle: 'AI for MSMEs | Case Study | APLYD',
    metaDescription: "Explore APLYD's work helping MSMEs assess AI readiness, identify adoption opportunities and develop practical pathways for responsible AI implementation.",
    lead: 'For MSMEs, moving from AI interest to adoption requires a clear understanding of readiness, constraints and implementation requirements. Our work focuses on identifying where AI can add value and building practical pathways for adoption.',
    caseStudies: [
      {
        id: 'india-msme-adoption',
        title: "Advancing AI adoption among India's MSMEs",
        client: 'MeitY, IndiaAI Mission',
        sector: 'MSMEs; Public Services / Government',
        capabilities: 'AI portfolio and readiness',
        type: 'Advisory and roadmap',
        geography: 'India',
        summary: 'Small manufacturers are an important part of India’s industrial base, but AI adoption requires a clear understanding of their readiness, constraints and capacity to implement. For the IndiaAI Mission, APLYD assessed where small manufacturers stood and what would support broader adoption.',
        context: 'The IndiaAI Mission needed a clearer understanding of AI-readiness across small manufacturers and the factors that influence their ability to adopt AI. The challenge was to move from broad ambition to an evidence-based view of what adoption would require in practice.',
        whatWeDid: 'We diagnosed AI-readiness across small manufacturers and developed a field-tested adoption roadmap for the IndiaAI Mission. The roadmap brought together practical playbooks, incentives and capacity-building plans, structured around the conditions and requirements identified through the assessment.',
        whyItMatters: 'Broadening AI adoption requires more than setting a national ambition. It requires an evidence-based understanding of readiness and a practical pathway for implementation. This work provided the IndiaAI Mission with a grounded basis for supporting AI adoption among MSMEs.'
      }
    ]
  },
  utilities: {
    id: 'utilities',
    slug: 'utilities',
    navLabel: 'Utilities',
    title: 'AI for utilities',
    metaTitle: 'AI for Utilities | Case Study | APLYD',
    metaDescription: "Explore APLYD's work in AI for utilities, focused on operational data, AI readiness, testing, responsible adoption and evidence-led implementation.",
    lead: 'For utilities, AI applications need to be assessed against real operational conditions before they are taken into procurement. Our work focuses on creating environments where AI can be tested against operational data, generating evidence to inform adoption decisions.',
    caseStudies: [
      {
        id: 'water-utilities-sandbox',
        title: 'A shared AI sandbox for water utilities',
        client: 'Africa Utility Data Collaborative',
        sector: 'Utilities; Public Services / Government',
        capabilities: 'Ecosystem infrastructure',
        type: 'Shared infrastructure',
        geography: 'Africa',
        summary: 'AI applications for utilities need to be assessed in the context in which they will operate. APLYD supported the development of a shared environment where utilities across Africa could test AI applications against operational data before committing to procurement.',
        context: 'Utilities need evidence on how AI applications perform against their operational data and requirements before making procurement decisions. A shared testing environment can help institutions assess applications under relevant conditions before wider adoption.',
        whatWeDid: 'We developed a shared environment where utilities across Africa could test AI applications against operational data before committing to procurement. This created a common setting for utilities to assess applications and generate evidence to inform procurement decisions.',
        whyItMatters: 'Testing before procurement gives utilities a more informed basis for evaluating AI applications and comparing their suitability to operational requirements. A shared environment also creates an opportunity to build knowledge and evidence that can be relevant across multiple utilities.'
      }
    ]
  },
  'public-services-government': {
    id: 'public-services-government',
    slug: 'public-services-government',
    navLabel: 'Public Services',
    title: 'AI for public services and government',
    metaTitle: 'AI for Public Services & Government | Case Studies | APLYD',
    metaDescription: "Explore APLYD's work applying AI in public services and government, from public systems and decision-making to citizen services and institutional adoption.",
    lead: 'Our work focuses on applying AI within public systems, frontline decision-making and citizen-facing services. The examples span different government contexts, including citizen services, agriculture and MSME adoption.',
    caseStudies: [
      {
        id: 'kampala-citizen-assistant',
        title: 'A GenAI citizen services assistant for Kampala',
        client: 'Kampala Capital City Authority, Uganda',
        sector: 'Public Services / Government',
        capabilities: 'Public-service solutions',
        type: 'Product / deployment',
        geography: 'Uganda',
        summary: 'The Kampala Capital City Authority wanted to extend access to city services through channels familiar to residents. APLYD developed a WhatsApp and Telegram assistant integrated with authority systems to support key service interactions.',
        context: 'Access to public services increasingly depends on how effectively digital channels connect citizens with government systems. The objective was to provide a more accessible interface while maintaining the security and system integration required for public-service transactions.',
        whatWeDid: 'We developed a WhatsApp and Telegram assistant covering registration, ticketing, document submission and status tracking. The assistant was integrated with authority systems through authenticated APIs, enabling service requests and updates to connect with existing government workflows.',
        whyItMatters: 'Effective citizen-facing AI depends on more than the conversational interface. It requires secure integration with the systems and processes behind the service. This approach combined a familiar digital channel with authenticated connections to government systems, supporting practical access to city services.'
      }
    ]
  },
  'monitoring-evaluation-responsible-ai': {
    id: 'monitoring-evaluation-responsible-ai',
    slug: 'monitoring-evaluation-responsible-ai',
    navLabel: 'M&E / Responsible AI',
    title: 'Monitoring, evaluation and responsible AI',
    metaTitle: 'AI Evaluation & Responsible AI | Case Studies | APLYD',
    metaDescription: "Explore APLYD's work in AI evaluation and responsible AI, including evidence, measurement, governance, assurance and responsible adoption.",
    lead: 'Our evaluation experience informs how we assess AI for performance, safety, fairness and impact. We build the evidence and governance needed to support responsible adoption and informed decisions on improvement and scale.',
    caseStudies: [
      {
        id: 'mel-evidence-portal',
        title: 'An AI evidence portal for a MEL programme',
        client: 'Gates Foundation',
        sector: 'M&E / Responsible AI',
        capabilities: 'Operations and partner support; knowledge architecture',
        type: 'Product / knowledge platform',
        geography: 'Global',
        summary: 'M&E programmes generate substantial volumes of evidence across reports, evaluations and field documents. APLYD developed a knowledge platform to make that evidence easier to retrieve, synthesise and use in programme decision-making.',
        context: 'M&E programmes accumulate evidence across multiple reports, evaluations and programme documents. Bringing this evidence together to identify patterns, findings and lessons can be time-intensive, particularly when information is distributed across different formats and sources.',
        whatWeDid: 'We developed a knowledge platform with a domain-tuned model adapted to the programme’s terminology, methods and document structures. This enables teams to retrieve and synthesise relevant findings across programme documentation without reviewing every document in full.',
        whyItMatters: 'The usefulness of a knowledge system depends on how well it reflects the language, methods and context of the programme it serves. By adapting the model to that domain, the platform supports more efficient evidence synthesis and makes programme knowledge easier to access for decision-making.'
      },
      {
        id: 'agrifood-systems-evaluation',
        title: 'AI across food and agriculture systems',
        client: '3ie and University of Birmingham',
        sector: 'M&E / Responsible AI; Agriculture',
        capabilities: 'Independent assurance; evidence review',
        type: 'Research study',
        geography: 'Low- and middle-income countries',
        summary: 'AI in agrifood systems is evolving rapidly, but decisions on adoption need to be grounded in evidence about where it can create value and under what conditions. APLYD contributed to a mixed-methods study examining AI across agrifood systems in low- and middle-income countries.',
        context: 'AI applications are emerging across agrifood systems in low- and middle-income countries, creating a need for stronger evidence on their use, relevance and implications for smallholder-focused programmes.',
        whatWeDid: 'We contributed to a mixed-methods study of AI across agrifood systems in low- and middle-income countries, helping build an evidence base for responsible, pro-smallholder adoption.',
        whyItMatters: 'Responsible adoption requires a clearer understanding of where AI can contribute and the conditions required for it to deliver value. Evidence from cross-sector and country contexts can help governments, funders and other institutions make more informed decisions about the role of AI in agrifood systems.'
      }
    ]
  }
};
