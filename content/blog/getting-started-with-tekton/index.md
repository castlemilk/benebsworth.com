---
title: Getting started with Tekton
date: "2019-05-12T22:12:03.284Z"
author: Ben Ebsworth
description: 'Developing basic CI and CD pipelines in Tekton and deploying this both to local and cloud based environments'
labels: technology,CI/CD,GCP,kubernetes,containers,kaniko,developer experience
keywords: technology,CI/CD,GCP,kubernetes,containers,kaniko,developer experience,tekton,knative,cicd foundation,CI,CD,continuous delivery,istio,docker,cicd foundation,google cloud,pipelines
release: true
---
![Tekton](./tekton.png)

In this post we'll discuss what [Tekton](https://github.com/tektoncd) is and how we can stand up a local test/development environment to see it in action. We'll then utilise the Custom Resource Definitions (CRDs) to build composable and highly reusable CI and CD pipelines on top of Kubernetes.

## Install

In order to run Tekton, we need to have a running Kubernetes environment. We'll assume you've got a locally running Kubernetes cluster, this can be achieved by using [Docker-for-Desktop](https://www.docker.com/products/docker-desktop) or [Minikube](https://kubernetes.io/docs/setup/minikube/). One of the things we need be careful of when running Tekton locally is how it will be interacting with a locally running docker registry. This registry is used by [Kaniko](https://github.com/GoogleContainerTools/kaniko) for layer caching and finally to push built images to.

### local registry

We'll cover to two ways you can go about ensuring you've got the right docker registry available for Kaniko to interact with.

#### docker-for-desktop

Run the following command to start a docker registry:

```bash
docker run -d -p 5000:5000 --name registry-srv -e REGISTRY_STORAGE_DELETE_ENABLED=true registry:2
```

This will create a docker registry available on `0.0.0.0:5000` of your local machine. Note the `0.0.0.0` which implies it will bind to all interfaces on your machine. We'll now be able to access the registry if we select an IP which corresponds to an interface on our machine, and of course the correct port `5000`.

On MacOS you can run the following to see your interfaces:

```bash
$ ifconfig
en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
        ether 8c:85:90:c9:84:c8
        inet6 fe80::1ca0:3da9:2b89:181d%en0 prefixlen 64 secured scopeid 0x8
        inet 192.168.30.8 netmask 0xffffff00 broadcast 192.168.30.255
        nd6 options=201<PERFORMNUD,DAD>
        media: autoselect
        status: active

```

So in this case we can select`192.168.30.8`, which corresponds to my laptops network card. The main thing to avoid is using `127.0.0.1 (localhost)` which will not be available from with our Kubernetes environment.

Now in order to access this IP, we should use a locally resolvable hostname. This can be done by setting our `/etc/hosts` file to enable local DNS resolution. Let's add an entry which corresponds to our local interface as follows:

```bash
##
# Host Database
#
# localhost is used to configure the loopback interface
# when the system is booting.  Do not change this entry.
##
. . .
192.168.30.8    host.docker.local
. . .
```

What we've done here is mapped the host `host.docker.local` to our IP address `192.168.30.8`, you should adjust this to what your local IP is accordingly.

Next we need to allow `insecure-registries` within our `docker-for-desktop` daemon. This can be done by navigating to your docker preferences and then selecting the daemon tab, and setting it as follows:

![Docker Daemon Settings](./docker-daemon-settings.png)

With these settings in place we now can refer to `host.docker.local:5000` as our "insecure registry" and assume that this will be accessible within our Kubernetes cluster running locally.

#### minikube

If you're using minikube we can enable local registry capabilities by running the minikube registry addon. Run the following:

```bash
minikube start --insecure-registry=registry.kube-system.svc.cluster.local:80
minikube addons enable registry
```

> We start the minikube Kubernetes cluster to allow insecure registry for the internally running registry we are enabling

If this successfully works you'll see a registry deployed into the `kube-system` namespace and a `Service` defined as follows:

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    kubernetes.io/minikube-addons: registry
    addonmanager.kubernetes.io/mode: Reconcile
  name: registry
  namespace: kube-system
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 5000
  selector:
    kubernetes.io/minikube-addons: registry
```

This will make an insecure registry available within the cluster at `registry.kube-system.svc.cluster.local` on port 80. We can then reference this domain from Tekton pipelines.

### Tekton Control Plane

Tekton follows the controller pattern similar to the default controllers present within Kubernetes, these controllers have the ability to consume resource admission events and take actions to reconcile differences with the current state and the desired state of the cluster. Let's deploy the Tekton "control-plane" and see what we get, run the following command:

```bash
kubectl apply --filename https://storage.googleapis.com/tekton-releases/latest/release.yaml
```

This will result in the latest release of Tekton Pipelines being deployed to your cluster. You should see the following on a successful deployment:

```bash
$ kubectl get po -n tekton-pipelines
NAME                                           READY   STATUS    RESTARTS   AGE
tekton-pipelines-controller-6b6dcb4548-52tx4   1/1     Running   0          34s
tekton-pipelines-webhook-6b65bfccc-4vbh6       1/1     Running   0          34s
```

### Tekton's API - Custom Resource Definitions

Now that the Tekton control plane is running we can start deploying our pipelines! But first let's go through the `Custom Resource Definitions (CRDs)` that we have available to build our pipelines, these will be the fundamental components we'll use to compose more sophisticated CI/CD pipelines. For further and more in-depth information you can read the documentation provided by the Tekton team [here](https://github.com/tektoncd/pipeline/tree/master/docs).

**[PipelineResource](https://github.com/tektoncd/pipeline/tree/master/docs/resources.md)** - Represents an input into a pipeline, will be used to represent pipeline resources like git repositories, storage, Docker images and Kubernetes cluster information and credentials.

**[Task](https://github.com/tektoncd/pipeline/blob/master/docs/tasks.md)** - As the name suggests a _Task_ is responsible for running a series of steps as part of a given CI/CD workflow. It will define [Inputs](https://github.com/tektoncd/pipeline/blob/master/docs/tasks.md#inputs), [Outputs](https://github.com/tektoncd/pipeline/blob/master/docs/tasks.md#outputs), and [Steps](https://github.com/tektoncd/pipeline/blob/master/docs/tasks.md#steps), ensuring a clean declarative definition exists for what should happen during a given "Task". These are then consumed or utilised in _TaskRun_ or _Pipeline_ resources, where we can connect _Task_ resources together into more feature rich workflows. _Task_ resources can be made to have shared volumes, which are mounted into the running `Pod` during a _TaskRun_. Enabling content that is produced between steps to be easily accessible.

**[TaskRun](https://github.com/tektoncd/pipeline/blob/master/docs/taskruns.md)** - Will result in a defined _Task_ resources being run in their in their defined containers within a singular `Pod` resource. The Tekton control-plane will be responsible for triggering the creation of this `Pod` with the required containers, this `Pod` will run to completion or until a failure. Multiple _Task's_ and their steps can be made to share _PipelineResources_ such as storage. Enabling a form of more persistent storage to be interacting with between steps.

**[Pipeline](https://github.com/tektoncd/pipeline/blob/master/docs/pipelines.md)** - Enables the representation of more sophisticated dependency structures of _Task_ resources. A graph, specially a _Directed Acyclic Graph_ or _DAG_, of tasks will be formed, according to the inputs and outputs that are defined as required for different _Task's_, through the given _Task_ Parameters. The specific of how the ordering is inferred can be found [here](https://github.com/tektoncd/pipeline/blob/master/docs/pipelines.md#ordering).

**[PipelineRun](https://github.com/tektoncd/pipeline/blob/master/docs/pipelineruns.md)** - Facilitates the actual running of a defined _Pipeline_ and its corresponding graph of _Task_ resources, in the required ordering. The _PipelineRun_ can specify which _Pipeline_ resource to run and what to trigger off. At the moment the trigger can only be done manually. Where manually is on the instantiation of the _PipelineRun_ `CRD` resource to the given Kubernetes environment, where the Tekton control-plane will see this event and start the associated _Pipeline_.

### CI Pipeline

#### Local

With these primitive components, represented as CRDS, we can construct fairly sophisticated pipeline which will be managed by our Tekton control-plane. One example we can demonstrate is a _Continuous Integration (CI)_ pipeline, which will be responsible for the build and pushing of build artifacts to our locally running registry. The end-to-end pipeline can be found in this [gist](https://gist.github.com/castlemilk/2e6263da6e8bcac5fbb8b2c6f62860a9)

```yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: dev-xp-git
spec:
  type: git
  params:
    - name: revision
      value: master
    - name: url
      value: https://github.com/castlemilk/next-dev-xp
```

> Here we are creating a _Pipeline_ resource will maps to the repository we want to build and the branch we want to target.

```yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: dev-xp-image
spec:
  type: image
  params:
    - name: url
      value: host.docker.local:5000/dev-xp/webapp
```

> This defines the image artifact we intent to produce, note the reference to our local registry `host.docker.local`. If we were running inside a Minikube environment, we would need to ensure this is specified as our insecure registry.

```yaml
piVersion: tekton.dev/v1alpha1
kind: Task
metadata:
  name: build-docker-image-from-git-source
spec:
  inputs:
    resources:
      - name: docker-source
        type: git
    params:
      - name: pathToDockerFile
        description: The path to the dockerfile to build
        default: /workspace/docker-source/Dockerfile
      - name: pathToContext
        description:
          The build context used by Kaniko
          (https://github.com/GoogleContainerTools/kaniko#kaniko-build-contexts)
        default: /workspace/docker-source
  outputs:
    resources:
      - name: builtImage
        type: image
  steps:
    - name: build-and-push
      image: gcr.io/kaniko-project/executor
      command:
        - /kaniko/executor
      args:
        - --dockerfile=${inputs.params.pathToDockerFile}
        - --destination=${outputs.resources.builtImage.url}
        - --context=${inputs.params.pathToContext}
        - --insecure
        - --cache=true
```

> Here we setup a generic and re-usable Task for building and pushing a Docker image via Kaniko. Note that only generalised parameters are referenced. Where we'd then specify the inputs during the subsequent _TaskRun_. An important thing to note about the input reference here is that **the name of the git resource will translate to the folder that the git repo is clone into. So if named "docker-source" it will be checked out into a folder called "docker-source"**

```yaml
apiVersion: tekton.dev/v1alpha1
kind: TaskRun
metadata:
  name: build-docker-image-from-git-source-task-run
spec:
  taskRef:
    name: build-docker-image-from-git-source
  trigger:
    type: manual
  inputs:
    resources:
      - name: docker-source
        resourceRef:
          name: dev-xp-git
    params:
      - name: pathToDockerFile
        value: /workspace/docker-source/webapp/Dockerfile
      - name: pathToContext
        value: /workspace/docker-source/webapp
  outputs:
    resources:
      - name: builtImage
        resourceRef:
          name: dev-xp-image
```

> Finally we connect all of our previously defined resources via the _TaskRun_, we feed in our specific _PipelineResources_ and the desired _Task_ we want to map these to.

To apply this pipeline you can apply the resources individually to your cluster. Alternatively you can checkout the repository this is all from and run the following:

```bash
git checkout https://github.com/castlemilk/next-dev-xp
kubectl apply -f next-dev-xp/pipelines/ci/build.local.yaml
```

#### Remote

Now for a more "production" ready environment, once having experimented with what you want your pipeline to do locally, we can deploy this CI pipeline to something like a [GKE](https://cloud.google.com/kubernetes-engine/) cluster and utilise GCP's docker registry storage [GCR](https://cloud.google.com/container-registry/). The end-to-end policy for this can be found in this [gist](https://gist.github.com/castlemilk/8496be1e585e2edcda71a32961c579ec)

The beauty of Tekton is its composibility and reusability, so in this case all we need to change is the _PipelineResource_ for the image registry to point to the remote GCR registry. Then we can apply exactly the same pipeline at our cluster running in GKE and we'd get exactly the same effect, in terms of an artifact produced, but this time output into the GCR registry.

```yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: dev-xp-image
spec:
  type: image
  params:
    - name: url
      value: gcr.io/${PROJECT_ID}/webapp
```

> Where we would replace `${PROJECT_ID}` with the GCP project created for this project. Note that the GKE cluster will have permission to talk to GCR provided through the `cloud-platform` or `storage-full` scopes. With the GCR,Storage API's enabled in GCP.


To apply this pipeline you can apply the resources individually to your cluster. Alternatively you can checkout the [github repository](https://github.com/castlemilk/next-dev-xp), **make sure to change the config to reflect your `${PROJECT_ID}`**, then run the following:

```bash
git checkout https://github.com/castlemilk/next-dev-xp
kubectl apply -f next-dev-xp/pipelines/ci/build.non-prod.yaml # edit this with your target PROJECT_ID
```

### Deployment Pipeline

Now that we've produced our artifacts via the Tekton CI pipeline, we can now deploy our images using Tekton as well. We'll see how we can construct a set of steps which deploy the artifacts we've built to our given Kubernetes cluster.

#### Local

For the Deployment pipeline we utilise the `Pipeline` and `PipelineRun` resources as we want to run `Task`'s in a specific order. These resources are available as a gist [here](https://gist.github.com/castlemilk/d74745fb4becbf45063d341faf1ae0fa), and are as follows:

```yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: dev-xp-image
spec:
  type: image
  params:
    - name: url
      value: registry.kube-system.svc.cluster.local/webapp
```

> Same as the CI Pipeline, but we define the registry we would be "pulling" from in the deployment pipeline

```yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: dev-xp-git
spec:
  type: git
  params:
  - name: revision
    value: master
  - name: url
    value: https://github.com/castlemilk/next-dev-xp
```

> Same as the CI Pipeline, but we are defining this in the context of the repo we checkout to apply the required kubernetes resources

```yaml
apiVersion: tekton.dev/v1alpha1
kind: Task
metadata:
  name: kubectl-apply
spec:
  inputs:
    resources:
    - name: workspace
      type: git
    - name: image
      type: image
    params:
    - name: path
      description: Path to the manifest to apply
    - name: yqArg
      description:
        Okay this is a hack, but I didn't feel right hard-coding `-d1` down
        below
    - name: yamlPathToImage
      description: The path to the image to replace in the yaml manifest (arg to yq)
    clusters:
    - name: targetCluster
      description: Not yet used, kubectl command below should use this cluster
  steps:
  - name: replace-image
    image: mikefarah/yq
    command: ['yq']
    args:
    - "w"
    - "-i"
    - "${inputs.params.yqArg}"
    - "${inputs.params.path}"
    - "${inputs.params.yamlPathToImage}"
    - "${inputs.resources.image.url}"
  - name: run-kubectl
    image: lachlanevenson/k8s-kubectl
    command: ['kubectl']
    args:
    - 'apply'
    - '-f'
    - '${inputs.params.path}'
```

> This Task will do some YAML find and replace, replacing the image name based of what we define in the pipeline resource, as well as then running the `kubectl apply` step with the updated resources

```yaml
apiVersion: tekton.dev/v1alpha1
kind: Pipeline
metadata:
  name: webapp-pipeline
spec:
  resources:
  - name: source-repo
    type: git
  - name: webapp-image
    type: image
  tasks:
  - name: deploy-webapp
    taskRef:
      name: kubectl-apply
    resources:
      inputs:
      - name: workspace
        resource: source-repo
      - name: image
        resource: webapp-image
    params:
    - name: path
      value: /workspace/workspace/webapp/kubernetes-manifests/webapp.yaml
    - name: yamlPathToImage
      value: "spec.template.spec.containers[0].image"
    - name: yqArg
      value: "-d1"
```

> The _Pipeline_ resource creates a mapping between parameters --> resources and referencing the required _Task_ resources.

```yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineRun
metadata:
  name: webapp-deployment-pipeline
spec:
  pipelineRef:
    name: webapp-pipeline
  trigger:
    type: manual
  serviceAccount: 'default'
  resources:
  - name: source-repo
    resourceRef:
      name: dev-xp-git
  - name: webapp-image
    resourceRef:
      name: dev-xp-image
```

> Finally we define the _PipelineRun_ will be actually action our pipline and run it within our target Kubernetes cluster.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: default-cluster-admin
subjects:
  - kind: ServiceAccount
    name: default
    namespace: default
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

> For the pipeline `Pod` to be able to deploy to our given Kubernetes cluster, it must have the required permissions to create resources. In this example we are giving it `cluster-admin` - **WARNING: this is not advisable in production environments, scope a more restricted policy based of least-privileged access**

We can apply this deployment pipeline by running the following:

```bash
git checkout https://github.com/castlemilk/next-dev-xp
kubectl apply -f next-dev-xp/pipelines/cd/deploy.local.yaml
```

Once the pipeline has completed you should the following:

```bash
$ kubectl get pods
NAME                                                        READY   STATUS      RESTARTS   AGE
webapp-7d545c999b-mkgn6                                     1/1     Running     0          23m
webapp-deployment-pipeline-deploy-webapp-zf6lm-pod-feb664   0/4     Completed   0          24m
```

> Where `webapp-7d545c999b-mkgn6` is our deployed service and `webapp-deployment-pipeline-deploy-webapp-zf6lm-pod-feb664` is the deployment pipeline that has completed.

#### Remote

The gist for what a GKE based deployment pipeline is available [here](https://gist.github.com/castlemilk/680ef36a65e83b9a6817ddada990bb49). The only different from our local pipeline is we're again, similarly to our CI pipeline, only changing the image _PipelineResource_ to reflect the GCR registry running remotely.

```yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: dev-xp-image
spec:
  type: image
  params:
    - name: url
      value: gcr.io/${PROJECT_ID}/webapp
```

> Where we would replace `${PROJECT_ID}` with the GCP project created for this project. Note that the GKE cluster will have permission to talk to GCR provided through the `cloud-platform` or `storage-full` scopes. With the GCR,Storage API's enabled in GCP.

To apply this "remote" deployment pipeline, we are assuming you've set up your context to point to your remotely running cluster.  Run the following:

```bash
git checkout https://github.com/castlemilk/next-dev-xp
kubectl apply -f next-dev-xp/pipelines/cd/deploy.non-prod.yaml
```

## Final Thoughts

From briefly playing with Tekton is seems to have a bright future, providing a clean and declarative interface for defining sophisticated pipelines. One can envisage a rich ecosystem of tools and frameworks which could be built around the Tekton API, which go about making a truly next-generation CI/CD workflow possible. Some things to lookout for in the future:

* **Triggers** - As Tekton continues to be developed, there'll hopefully be more trigger options available. One example might be git triggers, trigger of commits etc.
* **Dashboards** - There is a dashboard repo which aims to provide a UI view into the pipelines deployed and the associated logs. Available [Here](https://github.com/tektoncd/dashboard)
* **Frameworks** - I think Jenkins-X is looking to utilise the Tekton primitives to enable their CI/CD model. There may be other options arising in the future as well.

## Future Work

Watch this space for future work relating to Tekton:

* Running Tekton via GCP Cloud Build
* Managing the lifecycle of pipelines
* Running the Tekton Dashboard

## Extras

You'll find another sample application and the corresponding pipelines within the repostory we've been working out of. This deploys a multi-tier application using Tekton, the link is below

```https://github.com/castlemilk/next-dev-xp```