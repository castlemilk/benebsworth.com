---
title: Kubernetes-centric Continuous Delivery - Part 1 (Developer Experience)
date: "2019-05-12T22:12:03.284Z"
author: Ben Ebsworth
description: 'How we can get closer to unifying the local developer experience with the production-grade kubernetes run-time environment'
labels: technology,GCP,kubernetes,containers,developer experience,knative,skaffold,kustomize,
keywords: technology,CI/CD,GCP,kubernetes,containers,kaniko,developer experience,tekton,knative,cicd foundation,CI,CD,continuous delivery,istio,docker,google cloud,pipelines,tutorial,docker-for-mac,minikube,registry,task,taskrun,pipeline resource,production,dockerless,security,googlecloudplatform,googlecloud
release: true
---

Developer experience is a challenging topic when it comes to Kubernetes. This is mainly is associated with the complexities of
 involved in understanding the primitives in kubernetes such as networking into the cluster, the `Pod` construct and getting configuration into an app. The theory and understanding of Kubernetes itself will be out of scope for this discussion, instead we'll focus on how we can reduce the burden of these complexities, and
 demonstrate how we can get closer to unifying the local developer environment with a kubernetes production run-time environment.

A common developer environment may consist of docker-compose, which will utilise the apps `Dockerfile` to stand up the app and its associated dependencies, perhaps a database etc. This can be a easy to setup and understand environment for most people familiar with Docker, however this gives rise to a significant disconnect when it then comes to the approach taken to running the application in a Kubernetes environment. Where instead of a single `Dockerfile`, we will likely spawn a larger number of core resources. A common set of resources could be the following:

* `Deployment` - defining the applications `Pod` which will consist of the main applications container, and perhaps some sidecars for monitoring & logging, or potentially some initialisation steps.
* `Service` - Enabling the `Deployment` to be reachable by a singular DNS name, mapping to a `ClusterIP` - Reachable from the rest of the cluster.
* `ConfigMap` - Application configuration to be injecting into the `Deployment`
* `Secret` - More sensitive credentials and configuration to be injected into the `Deployment`

Additionally, these resources mentioned, instead of talking to a Docker Daemon like in a common docker-compose scenario, will be applied to the Kubernetes API server. Interacting with the Kubernetes based environment then requires gaining some familiar with `kubectl` which is a CLI wrapper for interacting with the Kubernetes API server. It's this interface discrepancy or different for local vs the remote runtime environment that gives rise to a disconnect what developers will understand about their applications runtime environment. So the next question is how can we make a case for entirely removing the need for Docker locally, instead shifting everything into a purely kubernetes based environment?

## Local Clusters

There are a number of tools available for us to run a Kubernetes cluster in our local development environment, some of these are as follows:

* **Minikube**  - I've written previously [here](https://benebsworth.com/install-minikube/) about setting up minikube on MacOS. Minikube operates by running the kubernetes control-plane components as containers on docker and exposing the Kubernetes API server to us for consumption by tools like `kubectl`. Typically Minikube will run the containers inside a VirtualMachine, where inside a docker-daemon will be running to host all of the required containers for Kubernetes. However, newer versions of Minikube support `driver=None`, which will run containers directly on your locally running docker daemon, removing that virtualization layer.

* **Docker for Mac with Kubernetes** - Since the `18.06.0-ce` release of Docker, it has had the ability to run a Kubernetes cluster within the locally running docker agent. Similarly to how Minikube is operating, it will manage the creation of all of the required Kubernetes control-plane components, giving us a locally working Kubernetes cluster.

* **KinD** - An acronym for *Kubernetes in Docker*, Kind is a new comer to the local cluster tooling scene, but providing a very clean experience when it comes to provisioning a locally running cluster. It is used by the kubernetes project for carrying out conformance tests, and is likely to continually be developed to support more development use-cases. In it's current state it's probably best suited for running tests based of using `kubectl port-forward ...`, as the external ingress is fairly limited.

* **microk8s** - Work investigating if you primarly use linux for your development environment. Doesn't natively support macOS, but you can virtualize a Ubuntu environment for example and then run *microk8s*

These tools give us a local cluster that we can then deploy our application, and potentially its associated dependencies, such as databases, caches, and other microservices.

With our application running with its required dependencies, we can then run tests suites for validating conformance/integration and performance, where because we are running in a Kubernetes cluster, we are more accurately representing the reality of the applications runtime environment.

![local-clusters](local-clusters.png)

<center>
A Comparison of the different local cluster tools available
</center>

&nbsp;

Now that we have a locally running Kubernetes cluster, the next challenge is how can we effectively manage the configuration/resources which represent our application and its dependencies, inside the Kubernetes cluster. Another way this could be viewed, is how can we get a similar experience to a `docker-compose.yaml` file, but for all of our kubernetes resources?

## Configuration Management

Let's go through the available templating/configuration management options we have for our Kubernetes resources.

* **Helm** - Perhaps one of the most popular mechanisms for templating kubernetes resources. Providing a rich templating language for dynamically generating resources based of a top level `values.yaml` file. Helm utilises [sprig](http://masterminds.github.io/sprig/) as the templating language. The dynamic templating capabilities often give rise to fairly complex helm templates which may be more cognitively to understand and extend. Helm has a vibrant ecosystem of existing `charts` which is the packaged form of a helm template, which capture deployment patterns for a wide variety of tools. Additionally Helm has a plugin ecosystem for extending the capabilities of the helm CLI. More information on helm can be found [here](https://helm.sh/)
* **Kustomize** - A "template free" way of representing Kubernetes resources. This is achieved by explicitly defining all of the resources required for your application, and then providing a straightforward way of mutating and/or extended resources based off `overlays` - a way to contextualize a group of resources, such as local vs non-prod vs prod. Kustomize has been built into the `kubectl` CLI, this makes it more readily available for basic use-cases, however not all of Kustomize's features are available. Overall Kustomize could be described as cognitively less complex, achieving a similar function to Helm and other tools. This makes it a great candidate for simple deployment scenarios where you don't need dynamic templating capability. *Most of the examples/demo apps we'll go through in this series will utilise Kustomize*. More information on kustomize can be found [here](https://github.com/kubernetes-sigs/kustomize)
* **Kapitan** - Coming out of Google's [DeepMind](https://deepmind.com/), Kapitan provides a more generic templating engine which utilises [jsonnet](https://jsonnet.org/) or their own templating engine [Kadet](https://github.com/deepmind/kapitan/pull/190) for templating out resources, for example those found in Kubernetes and Terraform. Kapitan provides some additional contextualized mapping and reusability through the construct of `inventory` and `components`, where we can provide parameters depending on the environment we're deploying to, and have components representing different applications we plan to deploy.
* **jsonnet** - A lower-level data templating language, providing effectively an extension on the JSON specification. [jsonnet](https://jsonnet.org/) is a very rich templating language, and can act as a base language to build higher level abstractions on-top of. However as a bespoke templating language, it does have the implications of learning another language, deriving from JSON, when most other resources will be YAML based etc. So there'd have to be a justification for utilising jsonnet as your primary templating mechanism, when you factor in the Kubernetes ecosystem of tooling.

![configuration-management](configuration-management.png)

<center>
A Comparison of the different configuration management tooling in the Kubernetes ecosystem
</center>

&nbsp;

Ok so now we've had a look at the options we have available to manage our applications deployment configuration, which may leave you still feeling unsure of how we can actually go about making this accessible in a developer context. This is where we'll take a look at some of the available tools specifically targeting the developer experience use-case.

## Developer Experience

The tools we're going to go through here are specially aiming at making the developer experience on a local and remote Kubernetes cluster better. This is achieved by providing things like hot-loading the application on config and source code changes, management of application logs, and profiling of configuration to represent different development environments. These tools get us really close to the experience of a docker-compose file that we mentioned earlier.

* **Skaffold** - One of the most fully featured and customizable options available. Skaffold provides a clean model for representing the different aspects of an applications life cycle, giving us a *build* --> *test* --> *deploy* pipeline locally. We can then plugin in what happens in each of these stages. Skaffold has the ability to hot-reload our application when changes occur in the file system, both for configuration and application source-code. If the application is using a interpreted language like *JavaScript* or *Python*, skaffold is able to hot-copy source-code files directly into the running container in Kubernetes, dramatically shortening the feedback loop for changes occurring during development. *Throughout this blog series and demonstration applications we'll focus on using Skaffold*. More information of skaffold can be found [here](https://skaffold.dev/docs/).
* **Garden** - Taking a more opinionated way of stitching together application configuration and it's associated dependencies, Garden provides a very advanced orchestration framework for the deployment, test and management of an application for local and remote Kubernetes clusters. With a UI component, users can visualise the dependency of applications and the stage of build/test/deployment that Garden is managing for you. One of the interesting capabilities that Garden enables is the ability to set up a dependency tree that an application may have, allowing then integration tests-suites to be developed which can run against the application with the required dependencies also being made available through Garden. This level of advanced orchestration could be useful when needing to set up complex testing workflows in a CI pipeline. More information on Garden is available [here](https://docs.garden.io/)
* **Tilt** - Utilising [Starlark](https://github.com/bazelbuild/starlark#tour) (a subset of the Python language) for the configuration language, known as a `Tiltfile`, Tilt provides an abstracted way of representing an application and its associated dependencies. It has a similar capability as *Skaffold* and *Garden* for hot-loading, with a focus of cleaning managing all of the components of an application through the beautiful Tilt UI. This UI looks to allow a developer to quickly navigate the status of the locally running application, its logs, exposing endpoints, and any associated alerts/issue with your local development environment during real-time code/configuration changes. It probably provides one of the nicer end-to-end user experiences, however this takes a decent investment to get properly configured.
* **Draft** - Perhaps one of the first generation tools in making the local developer experience more manageable on Kubernetes, it was the continual evolution of Helm, where it tried to look at how applications could be package, and also then deployed in the cleanest way possible. The development of *Draft* seems to slow to a halt, where the last change was over *5 months* ago.

![developer-experience](developer-experience.png)

<center>
A Comparison of the different developer experience tools
</center>

&nbsp;

Now that we've got some awareness of the tooling available in the Kubernetes ecosystem. Let's take a look at a demo application and apply a selection of the above mentioned tools to bring and end-to-end workflow for the build, test, and deployment to a locally running Kubernetes cluster.

## Example Application

We have an end-to-end example which captures the local developer workflow using a selection of tools, this is found within the `kubernetes-cicd` repository available here:

<github-link link="https://github.com/castlemilk/kubernetes-cicd"></github-link>

&nbsp;

*Clone this repository to run through the up-coming steps as we go*.Contained within this repository is a fullstack application which has the following topology

![example-fullstack-application](example-fullstack-application.png)

<center>
Fullstack architecture for example application
</center>

&nbsp;

In order to produce an example developer workflow, we've chosen the following selection of tooling, of which we've run through in detail at the beginning of this post. The reasons for this specific selecting is as follows:

* **Minikube** - Works reliably on Mac and has as vibrant community and information available online. Has some nice tooling for exposing services locally (via `minikube tunnel`)
* **Kustomize** - The light weight mechanism to represent all of our deployment configuration for our application and its dependencies (i.e postgres)
* **Skaffold** - Only developer experience tooling that works with *Kustomize*

Now if we look at translating the above top level topology, into a more specific set of Kubernetes resources, and the tools we'll use locally we have the following

![local-fullstack-deployment](./local-fullstack-deployment.png)

<center>
Local development deployment representation and associated tools
</center>

&nbsp;

In order to manage all of these resources, we're using *Kustomize*, lets take a look at what this configuration and file-system layout looks like. Within the `kubernetes-cicd` repository, inside the `app/deploy` folder we have the following file structure:

```text
├── backend
│   ├── base
│   │   ├── deployment.yaml
│   │   ├── kustomization.yaml
│   │   └── service.yaml
│   ├── istio
│   │   ├── gateway.yaml
│   │   ├── kustomization.yaml
│   │   └── virtualservice.yaml
│   └── overlays
│       ├── local
│       │   └── kustomization.yaml
│       ├── ...
│       └── ...
├── frontend
│   ├── base
│   │   ├── deployment.yaml
│   │   ├── kustomization.yaml
│   │   └── service.yaml
│   ├── istio
│   │   ├── gateway.yaml
│   │   ├── kustomization.yaml
│   │   └── virtualservice.yaml
│   └── overlays
│       ├── local
│       │   └── kustomization.yaml
│       ├── ...
│       └── ...
├── overlays
│   ├── local
│   │   ├── kustomization.yaml
│   │   ├── namespace.yaml
│   │   └── service_patch.yaml
│   ├── ...
│   └── ...
└── postgres
    ├── base
    │   ├── configmap.yaml
    │   ├── deployment.yaml
    │   ├── init-scripts
    │   │   ├── ...
    │   │   └── 4-ratings-data.sql
    │   ├── kustomization.yaml
    │   ├── pv.yaml
    │   ├── pvc.yaml
    │   └── service.yaml
    ├── istio
    │   ├── destinationrule.yaml
    │   └── kustomization.yaml
    └── overlays
        ├── local
        │   ├── kustomization.yaml
        │   └── service_patch.yaml
        ├── ...
        └── ...
```

<center>
Kustomize configuration representing our fullstack application to run in our local development environment
</center>

&nbsp;

So now at this point you may be thinking "wow that escalated quickly", the intent here it just to give you a feel for how a *Kustomize* project may look. I'll leave as an exercise for the reading to look at some of the files contain within [this repository](https://github.com/castlemilk/kubernetes-cicd/tree/master/app/deploy) and get a feel for how Kustomize works. Some things to note here:

* The is an `overlays` folder for each tier of our application which has a `local` folder, it's within this folder that we'll "customize" (get it) our resources for the target context or environment.
* There is a `kustomization.yaml` file in each folder. This allows us to define which resources to import, and how to mutate/extended our requires where required.
* There is a `base` folder, this represents the bare minimum or base resources we will need for the given deployment of that tier, and within this folder you see that there's the expected common Kubernetes resources used to deploy a given application.
* We have an `istio` folder, which is another base, but we will only be importing/using this base when we deploy to the remote environment running in the cloud. We'll go through this in more detail later in the post.

At this point we have a full representation of our depoyment resources and we can now deploy to our local environment. Let's see how we can do that now.

### deploy demo application

