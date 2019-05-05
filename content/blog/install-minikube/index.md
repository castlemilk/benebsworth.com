---
title: Install Minikube 
date: "2019-05-05T22:12:03.284Z"
author: Ben Ebsworth
description: 'Instructions for the installation, upgrade and other customization of a Minikube install on MacOS. As well as a basic example of deploying a service and exposing it for local access'
labels: technology,kubernetes,developer experience
release: true
---
![Minikube](/minikube.png)
Minikube is a "blessed" or kubernetes community endorsed mechanism to run a [Kubernetes](https://kubernetes.io) cluster locally. Minikube provides a streamlined way of managing the bootstrap process of the Kubernetes cluster as well as the interaction of the chosen virtualization tooling, on MacOS this could be either [Virtualbox](https://www.virtualbox.org/wiki/Downloads), [HyperKit](https://github.com/moby/hyperkit), [VMware](https://my.vmware.com/en/web/vmware/info/slug/desktop_end_user_computing/vmware_fusion/11_0).

In this post we'll try and capture all of the common steps required to standup a local environment to enable test and development of applications locally. Some of the challenges we'll address are as follows:

* is a clear-cut way to bring up an environment end-to-end
* exposing services locally to view/interact with deployed application
* managing _kubectl_ context to switch between local development environment and potentially a remote cluster and available CLI tools to support this.

## Pre-requisites

In order to get started you'll require the follow dependencies

* [Homebrew](https://brew.sh/)
* familiarly with running/opening your terminal, more information can be found [here](https://blog.teamtreehouse.com/introduction-to-the-mac-os-x-command-line)
* kubectl installed, following instructions [here](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
  
## Install

For MacOS the process is fairly straightforward via [Homebrew](https://brew.sh/). We simply run the following from your terminal:

```bash
brew cask install virtualbox # this will provider our hypervisor to host the kubernetes components
brew cask install minikube
```

Confirm you've installed the above services by running the following:

```bash
foo@bar:~$ minikube version
minikube version: v1.0.1
```

```bash
foo@bar:~$ VBoxManage --version
6.0.6r130049
```

With the required tools installed we can now start a local kubernetes cluster by running the following:

```bash
foo@bar:~$ minikube start
```

![install-minikube](/minikube-install.gif)

Once installed we can check the status of our cluster by running the following:

```bash
foo@bar:~$ minikube status
host: Running
kubelet: Running
apiserver: Running
kubectl: Correctly Configured: pointing to minikube-vm at 192.168.99.101
```

## manage context

For _kubectl_ to be able to communicate with the expected _Kubernetes_ cluster, we need to manage whats known as **context**. This is being set in your `~/.kube/config` file and can be checked and updated as described below.

We can then check our kubectl context by running the following:

```bash
foo@bar:~$ kubectl config get-context contexts
CURRENT   NAME                           CLUSTER                        AUTHINFO                       NAMESPACE
          docker-for-desktop             docker-for-desktop-cluster     docker-for-desktop             
*         minikube                       minikube                       minikube 
```

Note that this output will show you what context is currently active. An alternative, and probably more effective way to manage context is via the [kubectx](https://github.com/ahmetb/kubectx) cli tool. This can be installed by simply running `brew install kubectx`. With this available we can run:

```bash
foo@bar:~$ kubectx
docker-for-desktop
minikube
```

We can then set our kubectl context by running the `kubectx` command, selecting from the live above as follows:

```bash
kubectx minikube
```

This will set our kubectl context to target the minikube cluster we've just deployed locally.

To check that you're `kubectl` context is set correctly run the following:

```bash
foo@bar:~$ kubectx cluster-info
Kubernetes master is running at https://192.168.99.101:8443
KubeDNS is running at https://192.168.99.101:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

You'll note that the IP address `192.168.99.101` is the address allocated during the `minikube start` command.

## exposing services

Ok so let's deploy a basic example application known as [httpbin](https://github.com/postmanlabs/httpbin), and demonstrate how we can access this from our local machine in `localhost`.

Deploy the application by pasting the following:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1 
kind: Deployment
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
        version: v1
    spec:
      containers:
      - image: docker.io/kennethreitz/httpbin
        imagePullPolicy: IfNotPresent
        name: httpbin
        ports:
        - containerPort: 80
EOF
```

This will deploy the `httpbin` application into our locally running Kubernetes cluster. To interact with the state of your deployment you have a few approaches, these are described below.

### get pod status

In the above resource we applied to the cluster, we created a `Deployment` this will translate to the creation of `Pods` with the specified replica factor, in this case we set a replica factor of 1.

In order to view the pods that will be scheduled and deployed run the following (the namespace will default to `default` if not specified in your context or with the `[-n|--namespace]` flags in the `kubectl` command).

```bash
foo@bar:~$ kubectl get pods --namespace default
NAME                       READY   STATUS              RESTARTS   AGE
httpbin-5446f4d9b4-j7957   0/1     ContainerCreating   0          9s
httpbin-5446f4d9b4-j7957   1/1     Running             0          2m39s
```

### get deployment status

This status of the deployment can also be viewed, this output will represent the state that the kubernetes scheduler sees when attempting to converge on the desired replica factor.

```bash
foo@bar:~$ kubectl get deployment  -n default httpbin
NAME      READY   UP-TO-DATE   AVAILABLE   AGE
httpbin   1/1     1            1           4m54s
```

### get etcd events

From my experience, one of the best mechanisms to debug and understand the state of a given workload is the view the etcd events associated with the workflow. This will provide insights into issues that the scheduler is having or unexpected errors occurring due to mis-configured resources. The output can be retrieved as follows:

```bash
foo@bar:~$ kubectl get events --namespace default -w
7m8s        Normal   Scheduled           pod/httpbin-5446f4d9b4-j7957    Successfully assigned default/httpbin-5446f4d9b4-j7957 to minikube
7m7s        Normal   Pulling             pod/httpbin-5446f4d9b4-j7957    Pulling image "docker.io/kennethreitz/httpbin"
4m30s       Normal   Pulled              pod/httpbin-5446f4d9b4-j7957    Successfully pulled image "docker.io/kennethreitz/httpbin"
4m30s       Normal   Created             pod/httpbin-5446f4d9b4-j7957    Created container httpbin
4m30s       Normal   Started             pod/httpbin-5446f4d9b4-j7957    Started container httpbin
7m8s        Normal   SuccessfulCreate    replicaset/httpbin-5446f4d9b4   Created pod: httpbin-5446f4d9b4-j7957
7m8s        Normal   ScalingReplicaSet   deployment/httpbin              Scaled up replica set httpbin-5446f4d9b4 to 1
```

Once our workload has successfully been deployed we can expose it via a `Service` resource. In this case we'll create a `Service` of type `LoadBalancer`. This will then let us access the service via the `minikube tunnel` command.

First create the following resource, copy and pasting the text directly into your terminal:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 8000
    targetPort: 80
  selector:
    app: httpbin
EOF
```

Then we need to create a "tunnel" or forwarding mechanism to the `minikube` ip. This will then allow us to direct access services based off their assigned `ClusterIP` (only when it is of `type: LoadBalancer`). Run the following in a secondary window and keep it running in the background:

```bash
foo@bar:~$ minikube tunnel
Status:
	machine: minikube
	pid: 24032
	route: 10.96.0.0/12 -> 192.168.99.101
	minikube: Running
	services: [httpbin]
    errors:
		minikube: no errors
		router: no errors
		loadbalancer emulator: no errors
```

Now with the `Service` resource applied, we can view the address that is was assigned by running the following:

```bash
foo@bar:~$ kubectl get service --namespace default
NAME         TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)          AGE
httpbin      LoadBalancer   10.99.106.28   10.99.106.28   8000:31890/TCP   13m
kubernetes   ClusterIP      10.96.0.1      <none>         443/TCP          88m
```

Note the address I was allocated (you'll likely get something different) is `10.99.106.28`. We can hit this address on the port that we expose (`8080`), as follows:

```bash
foo@bar:~$ curl "http://10.99.106.28:8000/anything" -H "accept: application/json" -v
*   Trying 10.99.106.28...
* TCP_NODELAY set
* Connected to 10.99.106.28 (10.99.106.28) port 8000 (#0)
> GET /anything HTTP/1.1
> Host: 10.99.106.28:8000
> User-Agent: curl/7.54.0
> accept: application/json
>
< HTTP/1.1 200 OK
< Server: gunicorn/19.9.0
< Date: Sun, 05 May 2019 04:24:18 GMT
< Connection: keep-alive
< Content-Type: application/json
< Content-Length: 298
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Credentials: true
<
{
  "args": {},
  "data": "",
  "files": {},
  "form": {},
  "headers": {
    "Accept": "application/json",
    "Host": "10.99.106.28:8000",
    "User-Agent": "curl/7.54.0"
  },
  "json": null,
  "method": "GET",
  "origin": "192.168.99.1",
  "url": "http://10.99.106.28:8000/anything"
}
* Connection #0 to host 10.99.106.28 left intact
```

So now we've successfully accessed the deployed service from outside the locally running kubernetes cluster.

The IP of a exposed service can by dynamically discovered via the kubectl [JSONpath](https://kubernetes.io/docs/reference/kubectl/jsonpath/), an example for the service we deployed above would be:

```bash
httpbin_ip=$(kubectl get svc httpbin --namespace default -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl $httpbin_ip:8000/anything
```

## Future work

One of the issues with exposing services this way is it is harder to effectively manage the IP address that would be allocated. One nice thing about the `docker-for-mac` approach is it exposes the first defined `Service` of `type: Loadbalancer` via [VPNKit](https://github.com/moby/vpnkit) on `localahost`. This means you could create a `ingress-controller` or istio `Gateway` as a singular entrypoint to your local cluster, and then dynamically steer traffic based of domain, URLs, headers etc. into your target services. This simplifies how you then think about getting access to deployed services.

One solution to this could be to establish the minikube tunnel, deploy your chosen `ingress controller`or `istio gateway`, discover the allocated `ClusterIP` (which is also the `ExternalIP`) and then edit your `/etc/hosts` file to map hostnames to the allocated IP. This would look like so:

**/etc/hosts**:

```bash
10.99.106.28 httpbin.local
```

Then you'd be able to curl your expose service as:

```bash
curl httpbin.local:8080/anything
```

This could then be scripted to support dynamically updated your `/etc/hosts` according to the allocated `ClusterIP` on the fly. 

Watch this space on further content for enabling ingress to your cluster via a typical _ingress-controller_ like [nginx-ingress](https://github.com/kubernetes/ingress-nginx). Or via more sophisticated means, such as a _Service Mesh_ construct, where a gateway can be defined to enable access to services within the "Mesh". Such examples include [Istio](https://istio.io/), [Linkerd](https://linkerd.io/)  and [Consul Connect](https://learn.hashicorp.com/consul/getting-started/connect).