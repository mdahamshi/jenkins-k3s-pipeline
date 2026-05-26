# jenkins-k3s-pipeline

A full CI/CD pipeline that automatically builds, tests, pushes, and deploys a Node.js application to a Kubernetes cluster on every git push.

## Pipeline Overview

```
git push → Gitea (webhook) → Jenkins → Docker Build → GHCR → k3s (Kubernetes)
```

## Stack

| Tool | Role |
|---|---|
| Gitea | Self-hosted Git server + webhook trigger |
| Jenkins | CI/CD automation server |
| Docker | Build and package the application |
| GHCR | Container registry (GitHub Container Registry) |
| k3s | Lightweight Kubernetes cluster |
| KVM/libvirt | Virtualization for the k3s node |

## Infrastructure

- **Jenkins** runs as a Docker container (custom image with kubectl included)
- **k3s** runs on a Ubuntu 26.04 VM provisioned with KVM/libvirt on a local machine
- **Gitea** runs as a Docker container via Coolify (self-hosted PaaS)
- All services run on a home lab connected via a local network (`192.168.1.0/24`)

## Pipeline Stages

### 1. Build
Builds a Docker image from the `Dockerfile` and tags it with the Jenkins build number:
```
docker build -t ghcr.io/mdahamshi/jenkins-k3s-pipeline:<BUILD_NUMBER> .
```

### 2. Test
Runs the application test suite inside a `node:20-alpine` container:
```
npm test
```

### 3. Push
Authenticates to GHCR using a GitHub token stored as a Jenkins credential and pushes both the versioned and `latest` tags:
```
docker push ghcr.io/mdahamshi/jenkins-k3s-pipeline:<BUILD_NUMBER>
docker push ghcr.io/mdahamshi/jenkins-k3s-pipeline:latest
```

### 4. Deploy
Decodes the kubeconfig from a base64-encoded Jenkins credential and uses `kubectl` to update the running deployment in k3s:
```
kubectl set image deployment/jenkins-k3s-app app=ghcr.io/mdahamshi/jenkins-k3s-pipeline:<BUILD_NUMBER>
```

## Repository Structure

```
.
├── app.js                  # Node.js HTTP server
├── package.json            # App dependencies and scripts
├── Dockerfile              # App container image
├── Dockerfile.jenkins      # Custom Jenkins image with kubectl
├── Jenkinsfile             # Pipeline definition
└── k8s/
    ├── deployment.yaml     # Kubernetes Deployment
    └── service.yaml        # Kubernetes NodePort Service
```

## Kubernetes Manifests

### Deployment (`k8s/deployment.yaml`)
Deploys 1 replica of the app container, always pulling the latest image from GHCR.

### Service (`k8s/service.yaml`)
Exposes the app via a `NodePort` service on port 80 (internally on port 3000).

## Jenkins Credentials

| ID | Type | Description |
|---|---|---|
| `github-token` | Secret text | GitHub PAT with `write:packages` scope |
| `k3s-kubeconfig` | Secret text | Base64-encoded kubeconfig for the k3s cluster |
| `gitea-token` | Username/password | Gitea access token for repo checkout |

## Custom Jenkins Image

Jenkins does not ship with `kubectl`. A custom image is used:

```dockerfile
FROM jenkins/jenkins:lts
USER root
RUN apt-get update && apt-get install -y curl && \
    curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/kubectl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
USER jenkins
```

Image is hosted at `ghcr.io/mdahamshi/jenkins-kubectl:latest`.

## Webhook Trigger

Gitea is configured to send a webhook to Jenkins on every push:

- **Webhook URL:** `http://j.tools.l/github-webhook/`
- **Event:** Push
- Jenkins job uses **GitHub hook trigger for GITScm polling**

## Setup Notes

### k3s VM
- OS: Ubuntu 26.04 LTS (Resolute Raccoon)
- Provisioned with KVM/libvirt using a cloud image
- Static IP: `192.168.1.13`
- k3s installed via: `curl -sfL https://get.k3s.io | sh -`

### kubeconfig
The kubeconfig is stored base64-encoded in Jenkins to preserve newlines:
```bash
cat ~/.kube/k3s-config | base64 -w 0
```
Decoded at pipeline runtime — never written to disk permanently.

### Gitea Webhook Allowlist
Gitea requires local IPs to be explicitly allowed for webhooks. Set via environment variable in Docker Compose:
```yaml
GITEA__webhook__ALLOWED_HOST_LIST=private
```

## Result

After every `git push`, the application is automatically built, tested, pushed to GHCR, and deployed to Kubernetes — with zero manual steps.

```bash
curl http://192.168.1.13:<NODEPORT>
# Hello from Jenkins + k3s pipeline!
```