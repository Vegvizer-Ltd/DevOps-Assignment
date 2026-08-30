# DevOps Engineer Home Assignment

## Goal

Review and improve this repository as if you had inherited it from another engineer and were preparing it for use by a team operating development and production environments.

The assignment focuses on Kubernetes, Helm, GitHub Actions, GitOps/Argo CD, cloud architecture, and troubleshooting.

No live Kubernetes cluster, Argo CD server, cloud subscription, or registry is required.

## Requirements

### Kubernetes and Helm

The application should:

- support multiple replicas;
- expose a stable internal Kubernetes Service;
- use appropriate health and readiness checks;
- support safe rolling updates;
- define appropriate resource allocation;
- support environment-specific configuration without duplicating the chart;
- avoid storing sensitive values as plain text in Git.

The following commands should succeed after your changes:

```bash
helm lint helm/application
helm template application helm/application -f environments/dev/values.yaml
helm template application helm/application -f environments/prod/values.yaml
```

### Production readiness

Review the existing Kubernetes implementation and make the changes you believe are necessary for a reliable service.

Do not add resources simply because they exist in Kubernetes. Be prepared to explain why each addition is useful.

### GitHub Actions

Review the existing workflow and improve it.

CI should validate at least:

- application tests;
- Helm linting;
- Helm rendering for relevant environments;
- container build.

Deployment must remain GitOps-driven. GitHub Actions must not deploy directly to Kubernetes.

Consider permissions, credentials, concurrency, repeat runs, failure behavior, and artifact traceability.

### Argo CD / GitOps

Review the supplied Argo CD manifests.

Assume that:

- development changes may be synchronized automatically;
- production changes require a safer promotion model;
- the same Git repository represents the desired state.

No real Argo CD instance is required. We will evaluate the manifests and your design explanation.

Explain your approach to environment separation, synchronization, rollback, drift, and production safety.

### Incident scenario

After a deployment, Argo CD reports the application as `Healthy`, but users intermittently receive HTTP `503` responses immediately after deployments.

Describe how you would investigate this issue in a real cluster.

Include:

- investigation order;
- commands you would run;
- what each command tells you;
- at least three plausible hypotheses;
- how you would confirm or eliminate each hypothesis.

### Cloud architecture

Describe a minimal production architecture for this service on a managed Kubernetes platform.

Azure is preferred but not mandatory.

Address at least:

- managed Kubernetes;
- container registry;
- secrets;
- identity;
- ingress;
- DNS and TLS;
- observability;
- networking.

Include a simple architecture diagram. No cloud resources need to be created.

### Engineering decision

A developer suggests removing Argo CD and allowing GitHub Actions to execute `helm upgrade` directly against the production cluster because it is simpler.

Would you approve the proposal?

Explain the advantages, disadvantages, risks, and circumstances that influence your decision.

## Deliverables

Submit the repository containing your changes plus `SOLUTION.md` with:

1. Important problems you identified.
2. Changes you made.
3. Key decisions and trade-offs.
4. Incident investigation.
5. Proposed cloud architecture.
6. Assumptions and intentionally incomplete work.
7. AI tools used, what they were used for, and at least one AI recommendation you rejected or changed and why.

Please focus on engineering quality rather than implementation volume.
