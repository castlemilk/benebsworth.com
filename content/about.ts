import type { About } from '@/lib/gen/content'

export const about: About = {
  bio: "Highly self-driven engineer who is continually exploring new learnings. This place acts as a space for playing around with new ideas, and actively building my capability to robustly execute on entrepreneurial endeavors. I obtain great satisfaction from bringing new creations to fruition. I'm glad you've stopped by.",
  timeline: [
    {
      when: 'December 2023 — present',
      title: 'Senior Software Engineer · Atlassian',
      detail:
        'Working in the Micros platform team — responsible for the running and support of Atlassian products and services on top of AWS. Building and operating the internal platform, developer tooling, and orchestration that thousands of Atlassian services deploy and run on.',
      logo: '/about/logos/atlassian-logo.png',
      company: 'Atlassian',
      color: '#2684ff',
      kind: 'work',
      tech: ['Go', 'TypeScript', 'Kubernetes', 'EKS', 'GKE', 'Istio', 'Prometheus', 'CI/CD', 'Spinnaker'],
    },
    {
      when: 'October 2020 — April 2024',
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
  ],
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
      url: 'https://2019.container.camp/au/speakers/ben-ebsworth/',
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
  skills: [
    'Go', 'TypeScript', 'JavaScript', 'Python', 'Java', 'Spring Boot',
    'React', 'Next.js', 'Node.js',
    'Microservices', 'Distributed Systems', 'Event-Driven Architecture', 'System Design',
    'gRPC', 'REST APIs', 'GraphQL', 'TDD',
    'Kubernetes', 'EKS', 'GKE', 'Istio', 'Docker', 'Spinnaker',
    'AWS', 'GCP', 'Terraform',
    'CI/CD', 'SRE', 'SLI/SLO', 'Observability', 'Prometheus', 'Grafana',
    'PostgreSQL', 'DynamoDB', 'Kafka',
  ],
}
