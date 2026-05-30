export const ingressBasicMeta = [
  {
    index: 0,
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
`
  },

  {
    index: 1,
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

`
  },
  {
    index: 2,
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
`
  },
  {
    index: 3,
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
`
  },
  
  {
    index: 4,
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
`
  },
  {
    index: 5,
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
`
  },
  
  
]