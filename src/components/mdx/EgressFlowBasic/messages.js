export const egressBasicMeta = [
  {
    index: 0,
    header: 'Service Mesh Egress - Sidecar Direct',
    description: `
An Istio _service mesh_ will operate as a whitelist filter for all traffic egressing from the mesh.
Consequently we need to add \`ServiceEntry\` resources to effectively **allow** traffic out of the service mesh. There is a mechanism to break
out of this default behavior, where we can enable certain subnets to bypass the _Envoy_ sidecar when making extern/upstream requests.
It is enabled by add the following *annotation* to your \`Deployment\` resource as follows:

&nbsp;

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
`
  },
  {
    index: 1,
    header: 'ServiceEntry',
    description: `
The \`ServiceEntry\` CRD resource is used to create an outbound object inside of the _service mesh_, so that services within the mesh are able to access
the defined upstream endpoint.

&nbsp;

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
`
  },
  {
    index: 2,
    header: 'DestinationRule',
    description: `
In order to define more granular session information for a given _endpoint_ or _destination_ we utilise the \`DestinationRule \` _CRD_.
This will inform an _Envoy_ proxy **how** it should establish a connection with a service either **internal** or **external** to the _service mesh_
In the example below, we are specifying that we should use a mTLS based connection and which certificates to use when establishing the connection.

&nbsp;

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
`
  },
  {
    index: 3,
    header: 'External endpoint',
    description: `
Istio defines two _types_ of endpoints, either **MESH_EXTERNAL** or **MESH_INTERNAL**. Internal services are, for the most part, entirely
auto discovered via the built-in _Kubernetes_ service discovery mechanisms. However for service endpoints outside the _Istio_ _service mesh_, we need
to more explicitly define these as \`ServiceEntry\` resources so that the _service mesh_ can intelligently route when required. An **"external"** endpoint
can be a microservice which lives outside of the service mesh, but within the same _Kubernetes_ cluster. In this scenario we can define the following 
\`DestinationRule\` to disable mTLS when communicating to the service. 

&nbsp;

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
`
  },
]