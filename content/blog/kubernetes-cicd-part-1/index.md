---
title: Kubernetes-centric Continuous Deliver - Part 1 (Developer Experience)
date: "2019-05-12T22:12:03.284Z"
author: Ben Ebsworth
description: 'How we can get closer to unifying the local developer experience with the production-grade kubernetes run-time environment'
labels: technology,CI/CD,GCP,kubernetes,containers,kaniko,developer experience,istio,knative,skaffold
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
* `Secret` - More sensitive credentails and configuration to be injected into the `Deployment`

Additionally, these resources mentioned, instead of talking to a Docker Daemon like in a common docker-compose scenario, will be applied to the Kubernetes API server. Interacting with the Kubernetes based environment then requires gaining some familiar with `kubectl` which is a CLI wrapper for interacting with the Kubernetes API server. At this point hopefully we see that theres a significant difference in these "modes" or "types" of running the application. So the next question is how can we make a case for entirely removing the need for Docker locally, instead shifting everything into a purely kubernetes based environment?

# Local Clusters

There are a number of tools available for us to run a Kubernetes cluster in our local development environment, some of these are as follows:

* **Minikube**  - I've written previously [here](https://benebsworth.com/install-minikube/) about setting up minikube on MacOS. Minikube operates by running the kubernetes control-plane components as containers on docker and exposing the Kubernetes API server to us for consumption by tools like `kubectl`. Typically Minikube will run the containers inside a VirtualMachine, where inside a docker-daemon will be running to host all of the required containers for Kubernetes. However, newer versions of Minikube support `driver=None`, which will run containers directly on your locally running docker daemon, removing that virtualisation layer.

* **Kubernetes on Docker** - Since the `18.06.0-ce` release of Docker, it has had the ability to run a Kubernetes cluster within the locally running docker agent. Similarly to how Minikube is operating, it will manage the creation of all of the required Kubernetes control-plane components, giving us a locally working Kubernetes cluster.
