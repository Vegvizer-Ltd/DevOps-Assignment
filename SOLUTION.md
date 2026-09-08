# SOLUTION.md

---

## Part 1 -- Kubernetes and Helm

### Problems

1. **Hardcoded values in deployment template** -- Replica count and image tag were hardcoded, ignoring values files. No environment-specific configuration was applied.
2. **Wrong probe endpoints** -- Readiness hit a non-existent path (`/health`), liveness and readiness paths were swapped.
3. **Service connectivity broken** -- Selector label and targetPort didn't match the Deployment, so zero traffic reached the pods.
4. **Unsafe deployment strategy** -- `maxUnavailable: 100%` with `maxSurge: 0` caused full downtime on every rollout.
5. **Missing resource requests** -- Only limits defined, pods got BestEffort QoS with no scheduling guarantees.
6. **No security hardening** -- No `securityContext`, container runs as root by default.
7. **No disruption protection** -- No PDB, voluntary disruptions could evict all pods at once.

### Fixes

1. **Template values from values files** -- Replaced hardcoded replica count and image tag with `.Values` references so each environment gets its own configuration.
2. **Corrected probe paths** -- Liveness → `/healthz`, readiness → `/readyz`, matching the actual application endpoints.
3. **Fixed Service routing** -- Aligned selector label to `component: api` and targetPort to `http` to match the Deployment.
4. **Zero-downtime strategy** -- Changed to `maxUnavailable: 0%` / `maxSurge: 25%` so new pods are created before old ones terminate.
5. **Added resource requests** -- `cpu: 100m`, `memory: 128Mi` for proper scheduling and Burstable QoS.
6. **Security context added** -- Pod runs as non-root (`runAsUser: 1000`, the built-in `node` user), read-only filesystem, all capabilities dropped.
7. **PDB added** -- `minAvailable` configurable per environment (dev=1, prod=2), only created when replicas > 1.
8. **Cleanup** -- Added missing labels to Service, removed unused `service.targetPort` value.

---

## Part 2 -- Production Readiness

### Problems

1. **Secrets in plaintext in Git** -- API keys committed in values files and rendered by `secret.yaml` template.
2. **ArgoCD prod misconfigured** -- Prod application referenced dev values file.
3. **Unsafe prune on production** -- Accidental template removal would auto-delete live resources.

### Fixes

1. **Externalized secrets** -- Removed `secret.yaml` template. Secrets must be pre-created via external secrets manager (e.g., Azure Key Vault + External Secrets Operator). Deployment keeps `secretRef` reference.
2. **Fixed ArgoCD prod values** -- Corrected to `environments/prod/values.yaml`.
3. **Disabled prune for production** -- Removed `prune: true` from prod. Dev keeps prune for fast iteration.
4. **Added `.dockerignore`** -- Excludes non-essential files from Docker build context.

---

## Part 3 -- GitHub Actions

### Problems

1. **Direct deployment from CI** -- `helm upgrade --install` violates GitOps model.
2. **Overly broad permissions** -- `permissions: write-all` on the entire workflow.
3. **No image versioning** -- Only tagged as `latest`, no traceability.
4. **No job separation** -- Validation and delivery mixed in one job, runs on PRs too.
5. **Incomplete validation** -- Helm template only tested against dev values.
6. **Unpinned runner** -- `ubuntu-latest` is a moving target.

### Fixes

1. **Removed direct deployment** -- ArgoCD handles deployment, not CI.
2. **Split into two jobs** -- `test` (all PRs/pushes: npm test, helm lint, helm template for both envs) and `build-and-push` (merge to main only).
3. **Least privilege permissions** -- Scoped `packages: write` to `build-and-push` only.
4. **Dual image tagging** -- Both `${{ github.sha }}` (traceability) and `latest`.
5. **Full validation** -- Helm template runs against both dev and prod values.
6. **Pinned runner** -- `ubuntu-24.04`. Switched to built-in `GITHUB_TOKEN` for GHCR.

---

## Part 4 -- ArgoCD and GitOps

### Problems

1. **No environment isolation** -- Both environments tracked `main`, every merge deployed everywhere.
2. **No production gate** -- Prod auto-synced with no approval step.
3. **No project restrictions** -- Both apps used `project: default` with no guardrails.

### Fixes

1. **Branch-based isolation** -- Dev tracks `dev` branch, prod tracks `main`. Full isolation of infrastructure changes.
2. **Promotion via PR** -- Changes reach production only through `dev` → `main` merge with review.
3. **Drift correction kept** -- `selfHeal: true` on both environments ensures Git is always the source of truth.

### Key decisions

- **Rollback**: Git revert on `main` (preferred) or `argocd app rollback` for immediate recovery.
- **AppProject**: Noted as future improvement -- would restrict what prod can deploy. Outside this repo's scope.

---

## Part 5 -- Incident Investigation

> Argo CD reports the application as synchronized and healthy. Users intermittently receive HTTP 503 responses shortly after deployments.

Since ArgoCD shows healthy and synced, and 503s are intermittent and only occur shortly after deployments, this is a transient rollout issue. I would start by running `kubectl get pods -o wide`, `kubectl get endpoints`, and `kubectl get events --sort-by='.lastTimestamp'` to verify pod status, endpoint alignment, and rollout events. My primary hypothesis is that the readiness probe (`initialDelaySeconds: 1`) passes before the app is truly ready, routing traffic to uninitialized pods. A second hypothesis is that terminating pods drop in-flight requests due to missing graceful shutdown handling and kube-proxy iptables propagation delay. A third hypothesis is that the rolling update strategy reduces capacity below what's needed during rollout. I would confirm each by checking probe timing against startup logs, testing SIGTERM behavior, and inspecting the deployment strategy. Mitigations: increase `initialDelaySeconds` or add a startup probe, implement graceful shutdown, and add a `preStop` hook for kube-proxy rule propagation.

---

## Part 6 -- Cloud Architecture

*TODO*

---

## Part 7 -- Engineering Decision

> "Argo CD adds unnecessary complexity. We should let GitHub Actions run `helm upgrade` directly against the production Kubernetes cluster instead."

I would not approve this proposal. ArgoCD continuously reconciles cluster state against Git, so if someone runs `kubectl edit` or a pod drifts, it detects and corrects it automatically. With `helm upgrade` from CI, Git is only the source of truth at deploy time -- any manual change goes undetected. ArgoCD also provides visibility into what is currently running (not just what was last pushed) and simple rollbacks via Git revert.

The proposal has valid points: `helm upgrade` is simpler, has fewer moving parts, and doesn't require maintaining an ArgoCD instance. But as services, environments, and team members grow, the GitOps guarantees (drift detection, continuous reconciliation, audit trail) become increasingly valuable. The complexity ArgoCD adds is a worthwhile trade-off for production safety.

---

## Remaining Work

*TODO -- will be updated as implementation progresses.*

---

## AI Usage

**Tool used:** Claude Code (Claude Opus 4.6) -- used for code review, implementation, and documentation.

### Suggestions rejected / modified

**CI/CD: 3-job pipeline with duplicate builds.** Claude implemented a 3-job pipeline that built the Docker image twice (in `build` and `push` jobs). I rejected this as wasteful. Claude then proposed artifact passing between jobs, which added unnecessary complexity. I simplified to 2 jobs (test, build-and-push).

**ArgoCD: same branch for both environments.** Claude suggested keeping both environments on `main` with promotion via values file updates. I rejected this because Helm chart changes would affect dev and prod simultaneously. I chose separate branches (dev tracks `dev`, prod tracks `main`) for full isolation -- infrastructure changes only reach production through an explicit merge.
