# DevOps Engineer Home Assignment

## Overview

You have inherited an existing repository for a small application that is intended to be operated across development and production environments.

The repository contains an application, Kubernetes and Helm configuration, CI/CD configuration, and GitOps configuration.

The implementation is not necessarily complete or correct.

Your task is to review the repository, improve it where you believe necessary, and explain the engineering decisions behind your solution.

The assignment focuses primarily on:

* Kubernetes
* Helm
* GitHub Actions
* GitOps / Argo CD
* Cloud architecture
* Troubleshooting and operational reasoning

No live Kubernetes cluster, Argo CD server, cloud subscription, or container registry is required.

---

## General Expectations

Treat the repository as if it had been handed over to you by another engineer and your team was planning to operate it in real development and production environments.

Do not assume that the existing implementation is correct.

You are expected to:

* identify important reliability, security and maintainability issues;
* make appropriate improvements;
* prioritize issues based on their operational impact;
* document assumptions where information is missing;
* explain important trade-offs in your solution.

There is not necessarily one correct implementation.

We are more interested in your engineering reasoning than in the amount of YAML or tooling you add.

---

# Part 1 - Kubernetes and Helm

Review the supplied Helm chart and Kubernetes configuration.

The resulting deployment should be suitable for running the supplied application in both development and production environments.

The solution should demonstrate appropriate consideration for:

* application availability;
* configuration management;
* health and lifecycle management;
* resource management;
* service connectivity;
* deployment behavior;
* sensitive configuration;
* maintainability across environments.

Avoid duplicating the Helm chart for individual environments.

After your changes, the following commands should complete successfully:

```bash
helm lint helm/application

helm template application helm/application \
  -f environments/dev/values.yaml

helm template application helm/application \
  -f environments/prod/values.yaml
```

You may introduce additional Kubernetes configuration where you believe it provides clear operational value.

Avoid adding resources simply because they are commonly used.

---

# Part 2 - Production Readiness

Assume this service will eventually receive production traffic.

Review the existing deployment from an operational perspective and make the changes you believe are necessary to operate it reliably.

In your solution, explain:

1. The most important problems you identified.
2. Why they could affect the application.
3. How your changes address them.
4. Any remaining risks or improvements you deliberately chose not to implement.

---

# Part 3 - GitHub Actions

Review the supplied GitHub Actions workflow.

The repository should support a reasonable software delivery lifecycle for development and production.

At minimum, changes should be validated before they are considered deployable.

The CI process should cover:

* application tests;
* Helm validation;
* container build validation.

Application delivery should follow the GitOps model represented by this repository.

GitHub Actions should not directly deploy application workloads to Kubernetes.

You may restructure the supplied workflow if you believe another design is more appropriate.

Document the important CI/CD decisions you made.

---

# Part 4 - Argo CD and GitOps

Review the supplied Argo CD configuration.

Assume that:

* development may be deployed frequently;
* production changes require an appropriate level of protection;
* Git represents the desired state of the application;
* the same repository is currently used for both environments.

No real Argo CD installation is required.

Modify the supplied configuration where appropriate and explain your approach to:

* environment separation;
* synchronization;
* production promotion;
* rollback;
* configuration drift;
* production safety.

You may retain the current Argo CD structure or redesign it if you believe another approach is more appropriate.

Explain your choice.

---

# Part 5 - Incident Investigation

After a new version is released, the following incident is reported:

> Argo CD reports the application as synchronized and healthy.
>
> Users intermittently receive HTTP 503 responses shortly after deployments.

Assume you now have access to the Kubernetes cluster.

Describe how you would investigate the incident.

Your answer should include:

* your investigation order;
* commands you would execute;
* what you expect to learn from them;
* at least three plausible hypotheses;
* how you would confirm or eliminate each hypothesis.

We are interested in your troubleshooting methodology, not only in a list of Kubernetes commands.

---

# Part 6 - Cloud Architecture

The application will eventually run on a managed Kubernetes platform in a public cloud.

Design a minimal production architecture for the service.

Azure is preferred, but another major cloud provider is acceptable.

Your design should consider:

* managed Kubernetes;
* container image storage;
* secrets;
* workload identity;
* external traffic;
* DNS and TLS;
* observability;
* networking and access control.

No cloud resources need to be provisioned.

Include a simple architecture diagram and briefly explain the major decisions and trade-offs.

---

# Part 7 - Engineering Decision

A developer proposes the following change:

> "Argo CD adds unnecessary complexity. We should let GitHub Actions run `helm upgrade` directly against the production Kubernetes cluster instead."

Would you approve this proposal?

Explain your position.

Your answer should consider both the benefits and drawbacks of the proposal rather than treating either approach as universally correct.

---

# Deliverables

Submit your completed repository.

Your submission should include all implementation changes as well as a `SOLUTION.md`.

The `SOLUTION.md` should contain:

1. **Problems identified**
   The most important issues you found in the supplied implementation.

2. **Changes made**
   A concise explanation of your implementation changes.

3. **Engineering decisions**
   Important design choices, assumptions and trade-offs.

4. **Incident investigation**
   Your response to the troubleshooting scenario.

5. **Cloud architecture**
   Your proposed architecture and diagram.

6. **Remaining work**
   Anything you intentionally left incomplete and what you would do next.

7. **AI usage**
   If AI tools were used:

   * which tools you used;
   * what you used them for;
   * at least one suggestion you rejected, modified, or independently validated, and why.

---

# Constraints

* Do not commit real credentials or secrets.
* Do not require access to a real Kubernetes cluster.
* Do not require access to a real Argo CD instance.
* Do not require access to a real cloud subscription.
* Do not replace the supplied application with a different application.
* Do not duplicate the entire Helm chart for each environment.

---

# Scope

Please treat this as a time-boxed engineering exercise rather than an attempt to build a complete production platform.

Focus on the changes you believe provide the greatest engineering value.

Clear reasoning, prioritization and operational understanding are more important than implementation volume.
