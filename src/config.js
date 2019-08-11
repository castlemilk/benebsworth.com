import KubernetesLogo from './assets/images/kubernetes.png';
import GCPLogo from './assets/images/GCP.png';
import ReactLogo from './assets/images/react.png';
import DeveloperExperienceLogo from './assets/images/developer-experience.png';
import KnativeLogo from './assets/images/knative.png';
import SkaffoldLogo from './assets/images/skaffold.png';
import KustomizeLogo from './assets/images/kustomize.png';
import ContainersLogo from './assets/images/containers.png';
import TektonLogo from './assets/images/tekton.png';
import TechnologyLogo from './assets/images/technology.png';


export const SEOconfig  = {
    title: 'Ben Ebsworth · Personal Blog and Projects',
    description: '',
    url: 'https://benebsworth.com',
    image: 'https://benebsworth.com/static/logo-512x512.png',
    twitter: '@sycli',
    fbAppID: ''


}
export const headerCards = [
    {
        key: 1,
        text: 'About',
        color: 'green',
        path: '/about'
    },
    {
        key: 2,
        text: 'Blog',
        color: 'blue',
        path: '/blog'
    },
    {
        key: 3,
        text: 'Projects',
        color: 'purple',
        path: '/projects'
    },
]
export const COLOR_SCHEME = {
    gray: '#8D9F9B',
    green: '#62BB35',
    teal: '#208EA3',
    blue: '#5c91ff',
    darkblue: '#316ce6',
    kubernetes: '#9fbeff',
    istio: '#5c91ff',
    red: '#E8384F',
    redpink: '#FCA7E4',
    yellow: '#EECC16',
    orange: '#FD817D',
    darkorange: '#FDAE33',
    brown: '#bf7b26',
    purple: '#AA71FF',
    react: '#5b929c',
    midblue: '#316ce6',
    okta: '#0f7ec2',
    golang: '#6AD7E5',
    algorithms: '#8a7128',
    gcp: '#6da4ff',
    aws: '#FF9900',
    azure: '#035BDA',
    ibm: '#bf7b26',
    python: '#A4C61A',
    istio: '#4285F4',
    sm: '#FCA7E4',
    kaniko: '#f8a001',
    containers: '#80d2ff',
    knative: '#86afd3',
    grafana: '#f07a24',
    prometheus: '#df4e2b',
    jaeger: '#60d1e4',
    kiali: '#003043',
    skaffold: '#266185',
    kustomize: '#9fbeff'
    
}
export const labelColors = {
    general: COLOR_SCHEME.blue,
    personal: COLOR_SCHEME.green,
    technology: COLOR_SCHEME.red,
    react: COLOR_SCHEME.react,
    kubernetes: COLOR_SCHEME.kubernetes,
    golang: COLOR_SCHEME.golang,
    go: COLOR_SCHEME.golang,
    algorithms: COLOR_SCHEME.algorithms,
    AWS: COLOR_SCHEME.aws,
    GCP: COLOR_SCHEME.gcp,
    Azure: COLOR_SCHEME.azure,
    knative: COLOR_SCHEME.knative,
    'developer experience': COLOR_SCHEME.purple,
    python: COLOR_SCHEME.python,
    'service mesh': COLOR_SCHEME.sm,
    istio: COLOR_SCHEME.istio,
    IBM: COLOR_SCHEME.ibm,
    kaniko: COLOR_SCHEME.kaniko,
    containers: COLOR_SCHEME.containers,
    'CI/CD': COLOR_SCHEME.purple,
    jaeger: COLOR_SCHEME.jaeger,
    prometheus: COLOR_SCHEME.prometheus,
    grafana: COLOR_SCHEME.grafana,
    kiali: COLOR_SCHEME.kiali,
    skaffold: COLOR_SCHEME.skaffold,
    kustomize: COLOR_SCHEME.kustomize
}

export const labelImages = {
    react: ReactLogo,
    GCP: GCPLogo,
    kubernetes: KubernetesLogo,
    technology: TechnologyLogo,
    containers: ContainersLogo,
    'developer experience': DeveloperExperienceLogo,
    knative: KnativeLogo,
    skaffold: SkaffoldLogo,
    kustomize: KustomizeLogo,
}
export const skills = [
    [
        {
            text: 'Istio',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Kubernetes',
            color: COLOR_SCHEME.darkblue
        },
        {
            text: 'GKE',
            color: COLOR_SCHEME.teal
        },
        {
            text: 'GCP',
            color: COLOR_SCHEME.orange
        },
        {
            text: 'Fluentbit',
            color: COLOR_SCHEME.green
        },
        {
            text: 'Jenkins',
            color: COLOR_SCHEME.red
        },
        {
            text: 'Docker',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Prometheus',
            color: COLOR_SCHEME.darkorange
        },
        {
            text: 'Python',
            color: COLOR_SCHEME.green
        },
        {
            text: 'Spinnaker',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Oauth2',
            color: COLOR_SCHEME.red
        },
        {
            text: 'JWT',
            color: COLOR_SCHEME.okta
        },
        {
            text: 'Java',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Groovy',
            color: COLOR_SCHEME.midblue
        },
        {
            text: 'Golang',
            color: COLOR_SCHEME.teal
        },
        {
            text: 'SpringBoot',
            color: COLOR_SCHEME.green
        },
        {
            text: 'Postgres',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Distributed Tracing',
            color: COLOR_SCHEME.red
        },
    ],
    [
        {
            text: 'Istio',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Kubernetes',
            color: COLOR_SCHEME.darkblue
        },
        {
            text: 'Elasticsearch',
            color: COLOR_SCHEME.teal
        },
        {
            text: 'AWS',
            color: COLOR_SCHEME.orange
        },
        {
            text: 'Fluentbit',
            color: COLOR_SCHEME.green
        },
        {
            text: 'Jenkins',
            color: COLOR_SCHEME.red
        },
        {
            text: 'Docker',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Prometheus',
            color: COLOR_SCHEME.darkorange
        },
        {
            text: 'Python',
            color: COLOR_SCHEME.green
        },
        {
            text: 'Dex',
            color: COLOR_SCHEME.purple
        },
        {
            text: 'Oauth2',
            color: COLOR_SCHEME.red
        },
        {
            text: 'Okta',
            color: COLOR_SCHEME.okta
        },
        {
            text: 'Java',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Groovy',
            color: COLOR_SCHEME.midblue
        },
        {
            text: 'SpringBoot',
            color: COLOR_SCHEME.green
        },
    ],
    [
        {
            text: 'Openstack',
            color: COLOR_SCHEME.red
        },
        {
            text: 'Kafka',
            color: COLOR_SCHEME.purple
        },
        {
            text: 'Jenkins',
            color: COLOR_SCHEME.red
        },
        {
            text: 'Elasticsearch',
            color: COLOR_SCHEME.teal
        },
        {
            text: 'Ceph',
            color: COLOR_SCHEME.redpink
        },
        {
            text: 'Ansible',
            color: COLOR_SCHEME.gray
        },
        {
            text: 'Kafka Streams',
            color: COLOR_SCHEME.purple
        },
        {
            text: 'Prometheus',
            color: COLOR_SCHEME.darkorange
        },
        {
            text: 'Python',
            color: COLOR_SCHEME.green
        },
        {
            text: 'Spark',
            color: COLOR_SCHEME.orange
        },
        {
            text: 'Java',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'S3',
            color: COLOR_SCHEME.red
        },
    ],
    [
        {
            text: 'Python',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Ansible',
            color: COLOR_SCHEME.gray
        },
        {
            text: 'Paramiko',
            color: COLOR_SCHEME.green
        },
        {
            text: 'Cisco',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Juniper',
            color: COLOR_SCHEME.purple
        },
        {
            text: 'TCP/IP',
            color: COLOR_SCHEME.gray
        }, 
    ],
    [
        {
            text: 'Analogue Electronics & Circuit Design',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'C++',
            color: COLOR_SCHEME.darkblue
        },
        {
            text: 'RTOS and Imbedded Systems',
            color: COLOR_SCHEME.red
        },
        {
            text: 'FPGA design',
            color: COLOR_SCHEME.green
        },
        {
            text: 'Engineering Optimisation & design',
            color: COLOR_SCHEME.gray
        },
        {
            text: 'MATLAB',
            color: COLOR_SCHEME.red
        },
        {
            text: 'Telecommunications',
            color: COLOR_SCHEME.yellow
        }, 
    ],
    [
        {
            text: 'Partial DE',
            color: COLOR_SCHEME.gray
        },
        {
            text: 'Ordinary DE',
            color: COLOR_SCHEME.red
        },
        {
            text: 'Statistics',
            color: COLOR_SCHEME.green
        },
        {
            text: 'Linear algebra',
            color: COLOR_SCHEME.yellow
        },
        {
            text: 'Condensed Matter',
            color: COLOR_SCHEME.blue
        },
        {
            text: 'Quantum Mechanics',
            color: COLOR_SCHEME.purple
        },
        {
            text: 'Particle Physics',
            color: COLOR_SCHEME.gray
        },  
    ]
]
