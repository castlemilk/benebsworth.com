'use client'

import { FlowDiagram, type FlowStep } from './flow-diagram'

const ING = '/blog/istio-patterns/diagrams/ingress'
const EB = '/blog/istio-patterns/diagrams/egress-basic'
const EA = '/blog/istio-patterns/diagrams/egress-advanced'

/* ------------------------------------------------------------------ *
 * Ingress — background 306 x 411
 * Layer top% / width% ported from legacy IngressFlowBasic/style.js
 * (effective top = flex natural top + translateY, over bg height 411).
 * Step/message text ported verbatim from messages.js (ingressBasicMeta).
 * ------------------------------------------------------------------ */
const ingressSteps: FlowStep[] = [
  {
    header: 'Istio Service Mesh',
    description: `
Given a _Kubernetes_ \`Namespace\` has been configured to allow for _Istio_ sidecar injection,
then services deployed into this namespace with be accompanied by an **Envoy Sidecar Proxy**.
In this way the service will be augmented into the _Service Mesh_.

\`\`\`
kubectl get pods
NAME                              READY   STATUS    RESTARTS   AGE
api-auth-5f74b8c466-4fcl6         2/2     Running   0          1h
api-information-bdc664c59-dtscd   2/2     Running   0          1h
\`\`\`

The \`2/2\` signifies that the given \`Pod\` has two containers, one being the **microservice application** and the other being the **sidecar proxy**.
`,
    layers: [],
  },
  {
    header: 'Gateway',
    description: `
The \`Gateway\` resource can be consider the mechanism to define a _front-end_ listener, in terms of port and hostname.
Additionally how to map terminated TLS certificates to a given host listener.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: api-gateway
spec:
  selector:
    istio: ingressgateway # use istio default gateyway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "api.training.local"
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "api.training.local"
    tls:
      mode: SIMPLE
      serverCertificate: /etc/certs/https-api/tls.crt
      privateKey: /etc/certs/https-api/tls.key
\`\`\`
`,
    layers: [{ src: `${ING}/gateway.svg`, top: 11.2, width: 100, alt: 'Gateway layer' }],
  },
  {
    header: 'VirtualService',
    description: `
A \`VirtualService\` _CRD_ defines the instructions for how requests will be **routed** for a given _hostname_. It allows a list of matches to be specified, with corresponding destinations.
The match rules will be evaluated from top to bottom in terms of precedence. This resource has fined grained control on where it will reside, depending on the ingress and egress topology
within the _service mesh_.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: product-gateway
spec:
  hosts:
  - "api.training.local"
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: "/api/product"
    route:
    - destination:
        host: api-product
\`\`\`
`,
    layers: [{ src: `${ING}/virtualservice-two.svg`, top: 21.2, width: 99.7, alt: 'VirtualService layer' }],
  },
  {
    header: 'DestinationRule',
    description: `
A \`DestinationRule\` is responsible for providing session information for when a connection is being established to a given _outbound_ endpoint, either
either within the mesh or externally.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: api-product
spec:
  host: api-product
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
      labels:
        version: v2
\`\`\`
`,
    layers: [{ src: `${ING}/destinationrule-two.svg`, top: 32.6, width: 100, alt: 'DestinationRule layer' }],
  },
  {
    header: 'VirtualService',
    description: `
A more granular, or service specific \`VirtualService\` resource can be applied to the mesh. This provides a mechanism to **decouple traffic steering from infrastructure scaling**. What this means is,
we can now making a routing/steering decision from the sidecar instead of having to route the traffic to a main frontend-proxy or internal load balancing node.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: api-product
spec:
  gateways:
  - mesh
  hosts:
  - api-product
  http:
  - route:
    - destination:
        host: api-product
        subset: v1
\`\`\`
`,
    layers: [{ src: `${ING}/virtualservice-one.svg`, top: 66.2, width: 100, alt: 'VirtualService (sidecar) layer' }],
  },
  {
    header: 'DestinationRule',
    description: `
The \`DestinationRule\` configuration will reside on both the _ingressgateway_ and the sidecar.
There will also be a \`DestinationRule\` used to establish a **mTLS** connection for the communication between the _ingressgateway_ and the sidecar, as shown below

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: default
  namespace: istio-system
spec:
  host: '*.local'
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
\`\`\`
`,
    layers: [{ src: `${ING}/destinationrule-one.svg`, top: 74.5, width: 100, alt: 'DestinationRule (sidecar) layer' }],
  },
]

/* ------------------------------------------------------------------ *
 * Egress (basic) — background 287 x 434
 * Ported from EgressFlowBasic/style.js + messages.js (egressBasicMeta).
 * ------------------------------------------------------------------ */
const egressBasicSteps: FlowStep[] = [
  {
    header: 'Service Mesh Egress - Sidecar Direct',
    description: `
An Istio _service mesh_ will operate as a whitelist filter for all traffic egressing from the mesh.
Consequently we need to add \`ServiceEntry\` resources to effectively **allow** traffic out of the service mesh. There is a mechanism to break
out of this default behavior, where we can enable certain subnets to bypass the _Envoy_ sidecar when making extern/upstream requests.
It is enabled by add the following *annotation* to your \`Deployment\` resource as follows:

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: microservice-without-istio-egress
spec:
  replicas: 1
  selector:
    matchLabels:
      app: microservice-without-istio-egress
  template:
    metadata:
      ...
      annotations:
        ...
        traffic.sidecar.istio.io/excludeOutboundIPRanges: 0.0.0.0/0
        ...
      ...
\`\`\`
`,
    layers: [],
  },
  {
    header: 'ServiceEntry',
    description: `
The \`ServiceEntry\` CRD resource is used to create an outbound object inside of the _service mesh_, so that services within the mesh are able to access
the defined upstream endpoint.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: external-svc-https
spec:
  hosts:
  - fernago.core.gcp.anz
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
\`\`\`
`,
    layers: [{ src: `${EB}/serviceentry-one.svg`, top: 74.7, width: 99.3, alt: 'ServiceEntry layer' }],
  },
  {
    header: 'DestinationRule',
    description: `
In order to define more granular session information for a given _endpoint_ or _destination_ we utilise the \`DestinationRule \` _CRD_.
This will inform an _Envoy_ proxy **how** it should establish a connection with a service either **internal** or **external** to the _service mesh_
In the example below, we are specifying that we should use a mTLS based connection and which certificates to use when establishing the connection.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: api-stock-mtls
spec:
  host: stock.training.local
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/fernago/tls.crt
      privateKey: /etc/certs/fernago/fernago.key
      caCertificates: /etc/certs/fernago/ca.pem
\`\`\`
`,
    layers: [{ src: `${EB}/destinationrule-one.svg`, top: 66.6, width: 99.3, alt: 'DestinationRule layer' }],
  },
  {
    header: 'External endpoint',
    description: `
Istio defines two _types_ of endpoints, either **MESH_EXTERNAL** or **MESH_INTERNAL**. Internal services are, for the most part, entirely
auto discovered via the built-in _Kubernetes_ service discovery mechanisms. However for service endpoints outside the _Istio_ _service mesh_, we need
to more explicitly define these as \`ServiceEntry\` resources so that the _service mesh_ can intelligently route when required. An **"external"** endpoint
can be a microservice which lives outside of the service mesh, but within the same _Kubernetes_ cluster. In this scenario we can define the following
\`DestinationRule\` to disable mTLS when communicating to the service.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: fernago
  namespace: ext-ns
spec:
  host: fernago.ext-ns.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
\`\`\`
`,
    layers: [{ src: `${EB}/external.svg`, top: 0, width: 99.7, alt: 'External endpoint layer' }],
  },
]

/* ------------------------------------------------------------------ *
 * Egress (advanced) — background 292 x 436
 * Ported from EgressFlowAdvanced/style.js + messages.js (egressAdvancedMeta).
 * Layers are revealed in their legacy stacking (JSX) order; message text is
 * kept verbatim in message order (note: legacy steps 6/7 label the global
 * DestinationRule / ServiceEntry — both are revealed cumulatively by step 7).
 * ------------------------------------------------------------------ */
const egressAdvancedSteps: FlowStep[] = [
  {
    header: 'ServiceMesh - Egress Gateways',
    description: `
A more complex _service mesh_ topology can be deployed which facilitates enabling more robust security boundaries.
By having a _egressgateway_ service act as a "gateway" out of the mesh, it is possible to enforce traffic flows via \`NetworkPolicy\`
to only allow egress from the _egressgateway_ service. This prevents a malicious actor bypassing the default routing behavior that
services within the mesh will use.
`,
    layers: [],
  },
  {
    header: 'Sidecar - ServiceEntry [global]',
    description: `
Creates an outbound listener on the sidecar to handle outbound requests on a given \`Port\` (if it doesn't already exist). This then allows for a \`VirtualService\` policy to handle the request and
route it to the given destination. This \`ServiceEntry\` will effectuate both _**Sidecars**_ and _**Gateways**_, it is a **global** policy (spans across namespaces and mesh components).

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: stock-to-gateway
spec:
  hosts:
  - stock.training.local
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
\`\`\`
`,
    layers: [{ src: `${EA}/serviceentry-one.svg`, top: 81.7, width: 100, alt: 'Sidecar ServiceEntry layer' }],
  },
  {
    header: 'Sidecar - VirtualService',
    description: `
The \`VirtualService\` will be targeted to apply only to the _Sidecars_ via the \`gateways: \` selector. This \`VirtualService\` policy aims to route all traffic on
a specific port (80) and route it to the egressgateway. Note that we specify a _**subset**_, which allows us to use more targeting or specific policy for the target destination.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: stock-to-egressgateway
spec:
  hosts:
  - stock.training.local
  gateways:
  - mesh
  http:
  - match:
    - gateways:
      - mesh
      port: 80
    route:
    - destination:
        host: egressgateway.istio-system.svc.cluster.local
        subset: stock-to-gateway
        port:
          number: 443
      weight: 100
\`\`\`
`,
    layers: [{ src: `${EA}/virtualservice-one.svg`, top: 73.2, width: 100, alt: 'Sidecar VirtualService layer' }],
  },
  {
    header: 'Sidecar - DestinationRule [global]',
    description: `
The \`DestinationRule\` which is intended to be used by the _Sidecar_ defines the required information to enable a **mTLS** connection to be established between. The key being
that is sets the \`sni: stock.training.local\` and \`mode: ISTIO_MUTUAL\`, for all traffic routed by the \`VirtualService\` shown previously

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: stock-to-gateway
spec:
  host: istio-egressgateway.istio-system.svc.cluster.local
  subsets:
  - name: stock-to-gateway
    trafficPolicy:
      loadBalancer:
        simple: ROUND_ROBIN
      portLevelSettings:
      - port:
          number: 443
        tls:
          mode: ISTIO_MUTUAL
          sni: stock.training.local
\`\`\`
`,
    layers: [{ src: `${EA}/destinationrule-one.svg`, top: 64.7, width: 99.7, alt: 'Sidecar DestinationRule layer' }],
  },
  {
    header: 'Egress Gateway - Gateway',
    description: `
Similar to what we've seen so far for an _**ingressgateway**_, we have the _egressgateway_. This is working in a similar fashion but in reverse in terms of the direction of traffic.
The \`Gateway\` resource will enable the _egressgateway_ to handle requests for the given hostname, as well as specifies what certificates to terminate on the given port. In this case
it terminates the internal istio certificates which are distributed by _Citadel_.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: stock
spec:
  selector:
    istio: egressgateway
  servers:
  - hosts:
    - stock.training.local
    port:
      name: https-stock
      number: 443
      protocol: HTTPS
    tls:
      caCertificates: /etc/certs/root-cert.pem
      mode: MUTUAL
      privateKey: /etc/certs/key.pem
      serverCertificate: /etc/certs/cert-chain.pem
\`\`\`
`,
    layers: [{ src: `${EA}/gateway.svg`, top: 45.2, width: 99.7, alt: 'Egress Gateway layer' }],
  },
  {
    header: 'Egress Gateway - VirtualService',
    description: `
Once traffic has been routed from _Envoy Sidecars_ within the mesh, the next stage of routing takes place on the _egressgateway_.
The \`VirtualService\` shown below, routes manages all traffic for the _stock.training.local_ domain, and will utilise the **external** \`DestinationRule\` _subset_.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: stock-to-egressgateway
spec:
  hosts:
  - stock.training.local
  gateways:
  - istio-egressgateway
  http:
  - match:
    - gateways:
      - istio-egressgateway
      port: 443
    route:
    - destination:
        host: stock.training.local
        subset: external
        port:
          number: 443
      weight: 100
\`\`\`
`,
    layers: [{ src: `${EA}/virtualservice-two.svg`, top: 37.8, width: 99.7, alt: 'Egress Gateway VirtualService layer' }],
  },
  {
    header: 'Egress Gateway - DestinationRule [global]',
    description: `
For the final stage of the request handling that occurs within the _Service Mesh_, we have the below \`DestinationRule\`. This policy effectively instructs the _eggressgateway_
to originate a _**mTLS**_ connection to the target destination, with the specified certificates for the mutual authentication handshake and validation.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: stock-to-external
spec:
  host: stock.training.local
  subsets:
  - name: external
    trafficPolicy:
      loadBalancer:
        simple: ROUND_ROBIN
      portLevelSettings:
      - loadBalancer:
          simple: ROUND_ROBIN
        port:
          number: 443
      tls:
        mode: MUTUAL
        clientCertificate: /etc/certs/stock/tls.crt
        privateKey: /etc/certs/stock/tls.key
        caCertificates: /etc/certs/stock/ca.pem
\`\`\`
`,
    layers: [{ src: `${EA}/destinationrule-two.svg`, top: 22.0, width: 113, alt: 'Egress Gateway DestinationRule layer' }],
  },
  {
    header: 'Egress Gateway - ServiceEntry [global]',
    description: `
The \`ServiceEntry\` policy will be deployed to effectively all mesh components, enabling outbound resolution by the mesh components.

\`\`\`yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: stockt-to-gateway
spec:
  hosts:
  - stock.training.local
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
\`\`\`
`,
    layers: [{ src: `${EA}/serviceentry-two.svg`, top: 30.0, width: 99.7, alt: 'Egress Gateway ServiceEntry layer' }],
  },
]

export function IngressFlowBasic() {
  return (
    <FlowDiagram
      label="Istio ingress flow"
      background={`${ING}/background.svg`}
      width={306}
      height={411}
      steps={ingressSteps}
    />
  )
}

export function EgressFlowBasic() {
  return (
    <FlowDiagram
      label="Istio egress flow (basic, sidecar direct)"
      background={`${EB}/background.svg`}
      width={287}
      height={434}
      steps={egressBasicSteps}
    />
  )
}

export function EgressFlowAdvanced() {
  return (
    <FlowDiagram
      label="Istio egress flow (advanced, egress gateway)"
      background={`${EA}/background.svg`}
      width={292}
      height={436}
      steps={egressAdvancedSteps}
    />
  )
}
