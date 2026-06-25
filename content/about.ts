import type { About } from '@/lib/gen/content'
import { buildSkills, SELF, type SkillMeta } from '@/lib/skill-provenance'

const timeline: About['timeline'] = [
  {
    when: '2024 — present',
    title: 'Senior Software Engineer, Kubernetes Platform · Atlassian',
    detail:
      "Atlassian's Kubernetes platform team — responsible for service deployment and operating large fleets of clusters. Building the core services that enable deployment, release validation, and richer observability across the fleet.",
    logo: '/about/logos/atlassian-logo.png',
    company: 'Atlassian',
    color: '#2684ff',
    kind: 'work',
    tech: ['Go', 'Kubernetes', 'AWS', 'GCP', 'Python', 'Terraform', 'Istio'],
  },
  {
    when: 'December 2023 — 2024',
    title: 'Senior Software Engineer, Micros Platform · Atlassian',
    detail:
      "Core team for Micros — Atlassian's internal PaaS, running 4000+ services on AWS. Built and operated the internal platform, developer tooling, and orchestration that thousands of Atlassian services deploy and run on.",
    logo: '/about/logos/atlassian-logo.png',
    company: 'Atlassian',
    color: '#2684ff',
    kind: 'work',
    tech: ['Go', 'TypeScript', 'Kubernetes', 'EKS', 'GKE', 'Istio', 'Prometheus', 'CI/CD', 'Spinnaker'],
  },
  {
    when: 'October 2020 — December 2023',
    title: 'Senior Site Reliability Engineer · Atlassian',
    detail:
      "Site reliability engineering across Atlassian's platform — incident response and root-cause analysis, defining SLIs/SLOs, and building the observability for large-scale, high-throughput services.",
    logo: '/about/logos/atlassian-logo.png',
    company: 'Atlassian',
    color: '#2684ff',
    kind: 'work',
    tech: ['Java', 'Spring Boot', 'Go', 'SRE', 'SLI/SLO', 'Observability', 'CI/CD', 'EC2', 'SQS'],
  },
  {
    when: 'September 2018 — October 2020',
    title: 'Senior DevOps/FullStack Engineer · Digio',
    detail:
      "Leading the development and deployment of a set of production grade platform components on GCP. Facilitating adoption and consumption of the platform through a series of developer tooling and frameworks to streamline onboarding. Delivered the first production-grade GKE/GCP based platform for one of Australia's biggest banks.",
    logo: '/about/logos/digio-logo.png',
    company: 'Digio',
    color: '#00e0b8',
    kind: 'work',
    tech: ['Istio', 'Kubernetes', 'GKE', 'GCP', 'Fluentbit', 'Jenkins', 'Docker', 'Prometheus', 'Python', 'Spinnaker', 'OAuth2', 'JWT', 'Java', 'Groovy', 'Go', 'SpringBoot', 'Postgres', 'Distributed Tracing'],
  },
  {
    when: 'April 2018 — September 2018',
    title: 'DevOps/FullStack Engineer · Digio',
    detail:
      "Building highly automated and robust production grade platforms on top of Kubernetes. Utilising service-mesh technologies such as Istio to enable sophisticated microservice architectures. Enabling next-generation monitoring/observability capabilities, CI/CD pipelines, and security practices. Led the delivery of Australia's first Istio deployment into production.",
    logo: '/about/logos/digio-logo.png',
    company: 'Digio',
    color: '#00e0b8',
    kind: 'work',
    tech: ['Istio', 'Kubernetes', 'Elasticsearch', 'AWS', 'Fluentbit', 'Jenkins', 'Docker', 'Prometheus', 'Python', 'Dex', 'OAuth2', 'Okta', 'Java', 'Groovy', 'SpringBoot'],
  },
  {
    when: 'August 2016 — April 2018',
    title: 'DevOps/Full-Stack Engineer · Telstra',
    detail:
      'Leading the build and development of a small private cloud environment (4000 vCPU, 4 PB storage), as well as building the application layer on top which carried out large-scale message ingestion and transformation (capable of over 300k EPS).',
    logo: '/about/logos/telstra-logo.png',
    company: 'Telstra',
    color: '#7c5cff',
    kind: 'work',
    tech: ['OpenStack', 'Kafka', 'Jenkins', 'Elasticsearch', 'Ceph', 'Ansible', 'Kafka Streams', 'Prometheus', 'Python', 'Spark', 'Java', 'S3'],
  },
  {
    when: 'February 2015 — July 2016',
    title: 'Graduate Engineer · Telstra',
    detail:
      'Primarily working with networking/telecommunication technologies — Cisco, Juniper, Palo Alto, and Checkpoint, and the respective CLI/GUI/automation tooling. Responsible for building out a range of small automation tools using Python and the Python SSH library Paramiko.',
    logo: '/about/logos/telstra-logo.png',
    company: 'Telstra',
    color: '#7c5cff',
    kind: 'work',
    tech: ['Python', 'Ansible', 'Paramiko', 'Cisco', 'Juniper', 'TCP/IP'],
  },
  {
    when: 'November 2014',
    title: 'B.Eng. Electrical & Computer Systems Engineering (Honours) · Monash University',
    detail:
      'Thorough curriculum providing deep experimental and hands-on experience with the design, build, and analysis of complex real-time systems, embedded electronics, and analogue electronics, alongside a foundational knowledge in computer science.',
    logo: '/about/logos/monash-logo.png',
    company: 'Monash University',
    color: '#ff7a59',
    kind: 'education',
    tech: ['Analogue Electronics', 'C++', 'RTOS & Embedded', 'FPGA Design', 'Optimisation', 'MATLAB', 'Telecommunications'],
  },
  {
    when: '2009 — 2013',
    title: 'B.Sc. Applied Mathematics & Experimental Physics · Monash University',
    detail:
      'In-depth exposure to low-level scientific theory in physics — quantum mechanics, particle physics, condensed matter, and cosmology. The applied mathematics major focused on statistical and computational analysis with strong coverage of partial and ordinary differential equations, with heavy emphasis on experimentation and report writing.',
    logo: '/about/logos/monash-logo.png',
    company: 'Monash University',
    color: '#ff7a59',
    kind: 'education',
    tech: ['Partial DEs', 'Ordinary DEs', 'Statistics', 'Linear Algebra', 'Condensed Matter', 'Quantum Mechanics', 'Particle Physics'],
  },
]

// Per-skill metadata. Work/education sources are derived from `timeline` by
// name match (see lib/skill-provenance); `extra` adds company sources the match
// can't reach plus personal provenance (SELF). Notes are hand-written.
const SKILL_META: SkillMeta[] = [
  // ── Languages ───────────────────────────────────────────────────────────
  { name: 'Go', category: 'Languages', note: 'My day-to-day language for platform services and CLIs.' },
  { name: 'TypeScript', category: 'Languages', note: 'Everything browser-facing and a lot of tooling — including this site.', extra: [SELF] },
  { name: 'JavaScript', category: 'Languages', note: 'The substrate under the typed layer; quick scripts and interop.', extra: [SELF] },
  { name: 'Python', category: 'Languages', note: 'Automation, data work, and glue since my first networking tools.' },
  { name: 'Java', category: 'Languages', note: 'JVM services and Spring across a decade of platform work.' },
  { name: 'Spring Boot', category: 'Languages', note: 'The framework behind most of the JVM services I have shipped.' },
  { name: 'C / C++', category: 'Languages', note: 'From embedded firmware and real-time systems at university.', extra: ['Monash University'] },

  // ── Web ─────────────────────────────────────────────────────────────────
  { name: 'React', category: 'Web', note: 'The view layer for my side projects and this site.', extra: [SELF] },
  { name: 'Next.js', category: 'Web', note: 'This site runs on it — App Router, static export, MDX labs.', extra: [SELF] },
  { name: 'Node.js', category: 'Web', note: 'Build tooling, scripts, and API glue.', extra: [SELF] },

  // ── Architecture ────────────────────────────────────────────────────────
  { name: 'Microservices', category: 'Architecture', note: 'Designing and operating service fleets at platform scale.', extra: ['Atlassian', 'Digio'] },
  { name: 'Distributed Systems', category: 'Architecture', note: 'Consensus, partitioning, and the failure modes that come at scale.', extra: ['Atlassian', 'Telstra'] },
  { name: 'Event-Driven Architecture', category: 'Architecture', note: 'Async pipelines and stream processing — Kafka at Telstra onward.', extra: ['Telstra', 'Atlassian'] },
  { name: 'System Design', category: 'Architecture', note: 'Trading off consistency, cost, and blast radius.', extra: ['Atlassian', 'Digio'] },
  { name: 'gRPC', category: 'Architecture', note: 'Typed service-to-service contracts and codegen.', extra: ['Atlassian', SELF] },
  { name: 'REST APIs', category: 'Architecture', note: 'The default contract for most services I have built.', extra: ['Digio', 'Atlassian'] },
  { name: 'GraphQL', category: 'Architecture', note: 'Aggregating backends for frontends.', extra: [SELF] },
  { name: 'TDD', category: 'Architecture', note: 'Tests first — how I keep platform changes safe to ship.', extra: ['Atlassian', SELF] },

  // ── AI-Native ───────────────────────────────────────────────────────────
  { name: 'AI-Native', category: 'AI-Native', note: 'I build with LLMs and agents as core toolchain, not a bolt-on.', since: '2023 → now', extra: [SELF] },
  { name: 'LLMs', category: 'AI-Native', note: 'A daily driver for building, prototyping, and shipping.', since: '2023 → now', extra: [SELF] },
  { name: 'AI Agents', category: 'AI-Native', note: 'Multi-step agents wired into real tools and codebases.', since: '2023 → now', extra: [SELF] },
  { name: 'RAG', category: 'AI-Native', note: 'Retrieval pipelines over private corpora.', since: '2023 → now', extra: [SELF] },
  { name: 'MCP', category: 'AI-Native', note: 'Model Context Protocol servers and tools for agent integrations.', since: '2024 → now', extra: [SELF] },
  { name: 'Anthropic & OpenAI APIs', category: 'AI-Native', note: 'The model APIs behind my AI-native projects.', since: '2023 → now', extra: [SELF] },
  { name: 'Prompt Engineering', category: 'AI-Native', note: 'Structured prompting, tool schemas, and evals.', since: '2023 → now', extra: [SELF] },
  { name: 'Embeddings / Vector Search', category: 'AI-Native', note: 'Semantic search and similarity over embeddings.', since: '2023 → now', extra: [SELF] },

  // ── Hardware & Signals ──────────────────────────────────────────────────
  { name: 'Embedded Systems', category: 'Hardware & Signals', note: 'Bare-metal and RTOS firmware from my engineering degree.', extra: ['Monash University'] },
  { name: 'RTOS', category: 'Hardware & Signals', note: 'Real-time scheduling and the constraints of embedded targets.', extra: ['Monash University'] },
  { name: 'FPGA', category: 'Hardware & Signals', note: 'Digital design and HDL synthesis.', extra: ['Monash University'] },
  { name: 'Analogue & Digital Electronics', category: 'Hardware & Signals', note: 'Circuit design and analysis — the foundation I build up from.', extra: ['Monash University'] },
  { name: 'Signal Processing', category: 'Hardware & Signals', note: 'Filters, transforms, and modulation — the basis of my lab essays.', extra: ['Monash University', SELF] },

  // ── Orchestration ───────────────────────────────────────────────────────
  { name: 'Kubernetes', category: 'Orchestration', note: 'Fleet-scale orchestration — how I earn my keep; CKA & CKAD certified.' },
  { name: 'EKS', category: 'Orchestration', note: 'Managed Kubernetes on AWS, at Micros scale.' },
  { name: 'GKE', category: 'Orchestration', note: "Managed Kubernetes on GCP — delivered a major bank's first GKE platform." },
  { name: 'Istio', category: 'Orchestration', note: "Service mesh in production — Australia's first, which I delivered." },
  { name: 'Docker', category: 'Orchestration', note: 'Containerising and shipping services since 2018.' },
  { name: 'Spinnaker', category: 'Orchestration', note: 'Continuous delivery and progressive rollouts.' },

  // ── Cloud & IaC ─────────────────────────────────────────────────────────
  { name: 'AWS', category: 'Cloud & IaC', note: 'Four AWS certifications; the cloud under Micros and 4000+ services.' },
  { name: 'GCP', category: 'Cloud & IaC', note: 'Three GCP professional certifications; production GKE platforms.' },
  { name: 'Terraform', category: 'Cloud & IaC', note: 'Infrastructure as code across cloud accounts — including this site.', extra: [SELF] },

  // ── Reliability ─────────────────────────────────────────────────────────
  { name: 'CI/CD', category: 'Reliability', note: 'Pipelines from commit to production, safely.', extra: ['Digio'] },
  { name: 'SRE', category: 'Reliability', note: 'Years on-call: incident response, RCA, and resilience.' },
  { name: 'SLI/SLO', category: 'Reliability', note: 'Defining and enforcing the reliability targets that matter.' },
  { name: 'Observability', category: 'Reliability', note: 'Metrics, traces, and logs for high-throughput systems.', extra: ['Digio'] },
  { name: 'Prometheus', category: 'Reliability', note: 'Metrics and alerting across every platform I have run.' },
  { name: 'Grafana', category: 'Reliability', note: 'Dashboards for fleet and service health.', extra: ['Atlassian', SELF] },

  // ── Data ────────────────────────────────────────────────────────────────
  { name: 'PostgreSQL', category: 'Data', note: 'The relational default for my services.', extra: [SELF] },
  { name: 'DynamoDB', category: 'Data', note: 'Key-value at scale on AWS.', extra: ['Atlassian'] },
  { name: 'Kafka', category: 'Data', note: 'High-throughput streaming — over 300k events/sec at Telstra.' },
]

export const about: About = {
  bio: "Self-driven engineer who builds across the whole stack of computing — from electrical and embedded hardware, up through distributed software platforms, to the product and developer experience on top. An electrical & computer systems background grounds how I design and build; years operating large-scale platforms shape how I make it reliable; and I work AI-native, treating LLMs and agents as a core part of the toolchain rather than a bolt-on. This place is where I explore new ideas and sharpen my ability to take creations from concept to production. I'm glad you've stopped by.",
  timeline,
  speaking: [
    {
      title: 'Kubernetes Meetup',
      description:
        'Describing the practical experiences and contextual relevance of Istio in enterprise environments — the likely first Istio deployment in Australia that I was responsible for delivering to production.',
      url: 'https://melbkubernetes.org/istion-in-the-real-world/',
      date: 'Melbourne, Australia — September 2018',
      image: '/about/speaking/kubernetes-meetup.png',
    },
    {
      title: 'Google Cloud Summit',
      description:
        'Demonstrating Istio in action with a fullstack application and carrying out an example continuous delivery workflow via canary releases.',
      url: 'https://www.youtube.com/watch?v=PXgMofDT5To',
      date: 'Sydney, Australia — September 2018',
      image: '/about/speaking/google-cloud-summit.png',
    },
    {
      title: 'Container Camp',
      description:
        'Overview of the current Kubernetes-centric ecosystem of CI/CD tools, with an end-to-end practical example of implementing a feature-rich workflow in Tekton.',
      url: 'https://www.youtube.com/watch?v=1ZcrSeA6nDQ',
      date: 'Sydney, Australia — July 2019',
      image: '/about/speaking/container-camp.png',
    },
    {
      title: 'Kubernetes Meetup',
      description:
        'Overview of the Kubernetes ecosystem for enabling continuous delivery, with an example showing the local developer experience being promoted through pipelines to a "production" environment.',
      url: 'https://www.meetup.com/Melbourne-Kubernetes-Meetup/events/263929562/',
      date: 'Melbourne, Australia — August 2019',
      image: '/about/speaking/kubernetes-meetup.png',
    },
    {
      title: 'CNCF | Kubernetes Forum',
      description:
        'Advanced session — "Open Policy Agent Templating and Testing". Exploring in depth the pathways to productionising OPA policy and gaining confidence through robust end-to-end integration testing.',
      url: 'https://youtu.be/tGDAuij5RvE',
      date: 'Sydney, Australia — December 2019',
      image: '/about/speaking/kubernetes-forum.png',
    },
  ],
  certifications: [
    { title: 'AWS Certified Developer — Associate', issuer: 'Amazon Web Services', url: 'https://www.certmetrics.com/amazon/public/badge.aspx?i=2&t=c&d=2018-04-05&ci=AWS00461528', badge: '/about/certs/aws-developer-associate.png' },
    { title: 'AWS Certified SysOps Administrator — Associate', issuer: 'Amazon Web Services', url: 'https://www.certmetrics.com/amazon/public/badge.aspx?i=3&t=c&d=2018-04-16&ci=AWS00461528', badge: '/about/certs/aws-sysops-associate.png' },
    { title: 'AWS Certified Solutions Architect — Associate', issuer: 'Amazon Web Services', url: 'https://www.certmetrics.com/amazon/public/badge.aspx?i=1&t=c&d=2018-03-27&ci=AWS00461528', badge: '/about/certs/aws-sol-architect-associate.png' },
    { title: 'AWS Certified Solutions Architect — Professional', issuer: 'Amazon Web Services', url: 'https://www.certmetrics.com/amazon/public/badge.aspx?i=4&t=c&d=2018-07-23&ci=AWS00461528', badge: '/about/certs/aws-sol-architect-professional.png' },
    { title: 'Professional Cloud Architect', issuer: 'Google Cloud', url: 'https://www.credential.net/n61f0yqq', badge: '/about/certs/gcp-cloud-architect-professional.png' },
    { title: 'Professional Data Engineer', issuer: 'Google Cloud', url: 'https://www.credential.net/b0ggnqiq', badge: '/about/certs/gcp-data-engineer-professional.png' },
    { title: 'Professional Cloud Developer', issuer: 'Google Cloud', url: 'https://www.credential.net/9pdnh3wk', badge: '/about/certs/gcp-cloud-developer-professional.png' },
    { title: 'Certified Kubernetes Administrator (CKA)', issuer: 'CNCF', url: 'https://benebsworth.com/pdf/CKA_Certificate.pdf', badge: '/about/certs/cka.png' },
    { title: 'Certified Kubernetes Application Developer (CKAD)', issuer: 'CNCF', url: 'https://benebsworth.com/pdf/CKAD_Certificate.pdf', badge: '/about/certs/ckad.png' },
  ],
  skills: buildSkills(SKILL_META, timeline),
}
