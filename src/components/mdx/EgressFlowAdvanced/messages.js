export const egressAdvancedMeta = [
  {
    index: 0,
    header: 'ServiceMesh - Egress Gateways',
    description: `
A more complex _service mesh_ topology can be deployed which facilitates enabling more robust security boundaries. 
By having a _egressgateway_ service act as a "gateway" out of the mesh, it is possible to enforce traffic flows via \`NetworkPolicy\` 
to only allow egress from the _egressgateway_ service. This prevents a malicious actor bypassing the default routing behavior that 
services within the mesh will use.
`
  },
  {
    index: 1,
    header: 'Sidecar - ServiceEntry [global]',
    description: `
Creates an outbound listener on the sidecar to handle outbound requests on a given \`Port\` (if it doesn't already exist). This then allows for a \`VirtualService\` policy to handle the request and
route it to the given destination. This \`ServiceEntry\` will effectuate both _**Sidecars**_ and _**Gateways**_, it is a **global** policy (spans across namespaces and mesh components).
&nbsp;

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
`
  },
  {
    index: 2,
    header: 'Sidecar - VirtualService',
    description: `
The \`VirtualService\` will be targeted to apply only to the _Sidecars_ via the \`gateways: \` selector. This \`VirtualService\` policy aims to route all traffic on 
a specific port (80) and route it to the egressgateway. Note that we specify a _**subset**_, which allows us to use more targeting or specific policy for the target destination.
&nbsp;

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
`
  },
  {
    index: 3,
    header: 'Sidecar - DestinationRule [global]',
    description: `
The \`DestinationRule\` which is intended to be used by the _Sidecar_ defines the required information to enable a **mTLS** connection to be established between. The key being
that is sets the \`sni: stock.training.local\` and \`mode: ISTIO_MUTUAL\`, for all traffic routed by the \`VirtualService\` shown previously
&nbsp;

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
`
  },
  {
    index: 4,
    header: 'Egress Gateway - Gateway',
    description: `
Similar to what we've seen so far for an _**ingressgateway**_, we have the _egressgateway_. This is working in a similar fashion but in reverse in terms of the direction of traffic.
The \`Gateway\` resource will enable the _egressgateway_ to handle requests for the given hostname, as well as specifies what certificates to terminate on the given port. In this case
it terminates the internal istio certificates which are distributed by _Citadel_.
&nbsp;

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
`
  },
  {
    index: 5,
    header: 'Egress Gateway - VirtualService',
    description: `
Once traffic has been routed from _Envoy Sidecars_ within the mesh, the next stage of routing takes place on the _egressgateway_. 
The \`VirtualService\` shown below, routes manages all traffic for the _stock.training.local_ domain, and will utilise the **external** \`DestinationRule\` _subset_.
&nbsp;

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
`
  },
  {
    index: 6,
    header: 'Egress Gateway - DestinationRule [global]',
    description: `
For the final stage of the request handling that occurs within the _Service Mesh_, we have the below \`DestinationRule\`. This policy effectively instructs the _eggressgateway_ 
to originate a _**mTLS**_ connection to the target destination, with the specified certificates for the mutual authentication handshake and validation.
&nbsp;

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
`
  },
  {
    index: 7,
    header: 'Egress Gateway - ServiceEntry [global]',
    description: `
The \`ServiceEntry\` policy will be deployed to effectively all mesh components, enabling outbound resolution by the mesh components.

&nbsp;

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
`
  },
]