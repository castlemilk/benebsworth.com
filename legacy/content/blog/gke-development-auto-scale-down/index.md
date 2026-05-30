---
title: GKE Auto Scale Down for Fun and Profit
date: "2019-09-23T22:12:03.284Z"
author: Ben Ebsworth
description: 'How to sleep at night when actively developing on Google Kubernetes Engine (GKE) using Google Cloud Scheduler'
labels: technology,GCP,kubernetes
keywords: technology,gke,google kubernetes engine,cloud scheduler,gcp,kubernetes,cronjob,autoscale,scale to zero,cost saving,budget,cost protection,IAM,security,oauth,serviceaccount,roles,clusters,scaling
release: true
---

This is a article on how to NOT wake up with a massive GCP bill by forgetting you've left some expensive resources running (like a multi-node GKE cluster), we'll be using *Google Cloud Scheduler* to scale our GKE cluster to 0 on some interval. This could be a really useful pattern if you're spinning up a GKE cluster and doing some platform development and/or prototyping usage of tools and applications within the *Kubernetes* ecosystem.

## Enable API's

In order to start lets enable the required APIs we'll be using here.

Firstly enable Google Kubernetes Engine,

```text
gcloud services enable container.googleapis.com
```

and then we enable Google Cloud Scheduler

```text
cloud services enable cloudscheduler.googleapis.com
```

## Create GKE cluster

As an example, we'll quickly create a GKE cluster for demonstration purposes, you might instead do this using [Deployment Manager](https://cloud.google.com/deployment-manager/docs/) or the [Google Terraform provider](https://www.terraform.io/docs/providers/google/index.html),

```text
gcloud beta container clusters create example \
    --zone="australia-southeast1-a" \
    --machine-type="n1-standard-1" \
    --num-nodes="3" \
    --preemptible \
    --no-user-output-enabled \
```

## Create IAM

In order to authorize our Cloud Scheduler instance to successfully interact with the GKE API, we need to create a &*Service Account* with the correct IAM role permitting specifically the `container.clusters.update` permission. We can achieve by running the following commands

### create custom role

We need to create a [custom role](https://cloud.google.com/iam/docs/creating-custom-roles#iam-custom-roles-testable-permissions-gcloud) with the specific permissions we need, 

```text
gcloud iam roles create gke.scheduler \
  --project ${PROJECT_ID} \
  --title "Role GKE Scheduler" \
  --description "Managing the scaling of GKE nodes" \
  --permissions container.clusters.update \
  --stage GA
```

> Where `${PROJECT_ID}` is the project you're operating within

### create ServiceAccount

In order for us to provide the required authorization to our *Cloud Scheduler* task we need to attach a *Service Account*, this is created by running the following,

```text
cloud beta iam service-accounts create gke-scheduler \
    --description "managing scheduling of worker nodes on gke" \
    --display-name "gke-scheduler"
```

### create IAM role

Now we bind the *Custom Role* we created with the *Service Account*, run the following,

```text
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member serviceAccount:gke-scheduler@${PROJECT_ID}.iam.gserviceaccount.com \
    --role projects/${PROJECT_ID}/roles/gke.scheduler
```

## Create Cloud Scheduler Job

Finally the job can be created using our created *Service Account*. *Cloud Scheduler* uses the standard [CronJob](https://crontab.guru) syntax, I've used a 6 hour interval to be safe - ensuring the cluster gets scaled down regularly. The beauty of Kubernetes its so easy to stand everything back up its fairly trivial to just scale the cluster back up when required.

```text
cloud beta scheduler jobs create http gke-cluster-auto-scale-down \
  --schedule "0 */6 * * *" \
  --uri=https://container.googleapis.com/v1beta1/projects/${PROJECT_ID}/zones/australia-southeast1-a/clusters/${CLUSTER_NAME}/nodePools/default-pool/setSize \
  --message-body '{"nodeCount":0}' \
  --time-zone=Australia/Melbourne \
  --oauth-service-account-email gke-scheduler@${PROJECT_ID}.iam.gserviceaccount.com
```

> Where `${PROJECT_ID}` is the project you're operating within
> and `${CLUSTER_NAME}` is the name of your GKE cluster.

Now you should be cooking with gas 🔥, experimenting with the confidence of never accidentally having your resources running for too long.

## Recap

We've created a least-privileged mode of auto-scaling our GKE clusters down, ensuring we don't exceed our budgets unnecessarily. This is a basic prototype of the capability of *Cloud Scheduler*, I would advise checking out Terraform for a more robust and templated structure for your GCP resources.

Additionally we've also enabled [preemptible VMs](https://cloud.google.com/kubernetes-engine/docs/how-to/preemptible-vms) for our GKE cluster, which further reduces costing for a cluster used for prototyping and development.
