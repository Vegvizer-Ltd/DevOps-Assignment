# SOLUTION.md

---

## Part 1 -- Kubernetes and Helm

### Problems

1. **Replica count hardcoded to 1.** The deployment template ignored `.Values.replicaCount`. Both environments define specific counts (dev: 2, prod: 3) but the application would always run as a single instance with no redundancy.

2. **Image tag hardcoded to `latest`.** The template used `:latest` instead of `.Values.image.tag`. Environment-specific tags (`dev`, `1.0.0`) were never applied. This breaks version pinning and makes rollbacks unreliable.

3. **Readiness probe hitting a non-existent endpoint.** The readiness probe was set to `/health`, which does not exist in the application (returns 404). All pods would remain NotReady indefinitely, so the Service would have zero healthy endpoints.

4. **Liveness and readiness probe paths swapped.** Liveness pointed to `/readyz` and readiness to `/health`. The app exposes `/healthz` for liveness and `/readyz` for readiness. Swapped probes cause incorrect lifecycle behavior.

5. **Service selector mismatch.** The Service used `app.kubernetes.io/component: web` but the Deployment labels pods with `component: api`. Traffic would never reach the pods.

6. **Service targetPort referencing non-existent port name.** The Service used `targetPort: web` but the Deployment names the container port `http`. The Service could not resolve the target port.

7. **Deployment strategy causes full downtime.** `maxUnavailable: 100%` with `maxSurge: 0` terminates all existing pods before creating new ones. Every deployment would cause a complete outage.

8. **No resource requests defined.** Only limits were set. Without requests, pods get BestEffort QoS and the scheduler has no placement information.

9. **No disruption protection.** Without a PodDisruptionBudget, voluntary disruptions (node drains, cluster upgrades) could evict all pods simultaneously.

10. **Service template missing standard labels.** The Service metadata lacked the `platform-status-api.labels` helper that other templates use, making resource management inconsistent.

11. **Unused `service.targetPort` value.** The values file defined `service.targetPort: 3000` but no template referenced it. Dead configuration that could mislead future changes.

12. **No security context.** The deployment had no `securityContext`, so the container runs as root by default.

### Fixes

**Replica count** -- Changed `replicas: 1` to `{{ .Values.replicaCount }}` in `deployment.yaml`.
*Why:* Each environment now gets its configured replica count. Dev runs 2 replicas, prod runs 3.

**Image tag** -- Changed `image: ...repository:latest` to `...repository:{{ .Values.image.tag }}` in `deployment.yaml`.
*Why:* Environment-specific image tags are now applied. Dev deploys `dev` tag, prod deploys `1.0.0`. This enables proper version control and rollback.

**Probe paths** -- Corrected liveness from `/readyz` to `/healthz`, readiness from `/health` to `/readyz` in `values.yaml`.
*Why:* `/healthz` indicates the process is alive (liveness). `/readyz` indicates it can serve traffic (readiness). Correct assignment ensures Kubernetes only routes traffic to ready pods and only restarts truly unresponsive ones.

**Service selector** -- Changed `component: web` to `component: api` in `service.yaml`.
*Why:* Matches the label the Deployment applies to pods. Without this, the Service has zero endpoints.

**Service targetPort** -- Changed `targetPort: web` to `targetPort: http` in `service.yaml`.
*Why:* References the named port defined in the Deployment. Using a named port creates a single source of truth -- if the container port changes, it only needs updating in one place.

**Rolling update strategy** -- Changed to `maxUnavailable: 0%` / `maxSurge: 25%` in `values.yaml`.
*Why:* Kubernetes now creates new pods before terminating old ones, ensuring zero-downtime deployments. Trade-off: rollouts temporarily require more cluster resources.

**Resource requests** -- Added `cpu: 100m`, `memory: 128Mi` requests alongside existing limits in `values.yaml`.
*Why:* Gives the scheduler placement information and makes pods Burstable QoS (no longer first to be evicted). Requests are set lower than limits to allow bursting for a lightweight Node.js app that is mostly idle.

**PodDisruptionBudget** -- Added `pdb.yaml` template, created when `replicaCount > 1`. `minAvailable` is configurable via `pdb.minAvailable` (default: 1, prod: 2).
*Why:* Guarantees minimum pod availability during voluntary disruptions. Dev allows 1 disruption, prod allows only 1 (out of 3). Used `minAvailable` rather than `maxUnavailable` because it expresses the intent more clearly.

**Service labels** -- Added `platform-status-api.labels` helper to `service.yaml`.
*Why:* Consistency with other templates. Makes it easier to query and manage all chart resources uniformly.

**Removed unused `service.targetPort`** -- Deleted from `values.yaml`.
*Why:* The Service uses the named port `http` instead. Keeping an unused value creates confusion.

**Security context** -- Added pod-level (`runAsNonRoot: true`, `runAsUser: 1000`, `fsGroup: 1000`) and container-level (`allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities: drop: [ALL]`) to `deployment.yaml`.
*Why:* UID 1000 is the built-in `node` user in `node:22-alpine`. The app listens on port 3000 (above 1024, no root needed) and doesn't write to disk. This minimizes attack surface if the container is compromised.

### Not fixed (and why)

- **Ingress**: No requirement for external access was stated. Adding it without a clear need would be speculative.
- **NetworkPolicy**: Useful in multi-tenant clusters but adds complexity without a stated network isolation requirement.
- **PodAntiAffinity**: Would spread pods across nodes, but is only meaningful with information about the cluster topology.
- **ServiceAccount**: The default service account is sufficient. A dedicated one with `automountServiceAccountToken: false` would be a minor security improvement but is not critical for this application.

---

## Part 2 -- Production Readiness

### Problems

1. **Secrets committed as plaintext in Git.** Both `environments/dev/values.yaml` and `environments/prod/values.yaml` contain API keys in plaintext. The Helm chart's `secret.yaml` template rendered these directly into a Kubernetes Secret. Anyone with repository access can read production credentials, and secret history is preserved in Git even if removed later.

2. **ArgoCD prod application references dev values.** `argocd/prod-application.yaml` specified `environments/dev/values.yaml` instead of `environments/prod/values.yaml`. Production would deploy with dev configuration (debug logging, dev image tag, wrong replica count, no HPA).

3. **ArgoCD prune enabled on production.** The production ArgoCD application had `prune: true`, which automatically deletes Kubernetes resources removed from Git. If a template is accidentally removed, ArgoCD would immediately delete the live resource including the running deployment.

### Fixes

**Secret template removed** -- Deleted `secret.yaml` from the Helm chart templates.
*Why:* Secrets should not be created by Helm from values files because that encourages storing real credentials in Git. The deployment still references the secret via `secretRef`, so the secret must be pre-created in the target namespace before deploying. In a real environment, this would be handled by an external secrets manager (e.g., Azure Key Vault with External Secrets Operator, or HashiCorp Vault) that syncs secrets into Kubernetes without them appearing in Git. The `secret.apiKey` placeholder values remain in the values files for documentation purposes but are no longer consumed by any Helm template.

**ArgoCD prod values file** -- Fixed reference from `environments/dev/values.yaml` to `environments/prod/values.yaml` in `argocd/prod-application.yaml`.
*Why:* Production must deploy with production configuration. The original reference would have deployed dev settings (debug logging, wrong image tag, no HPA) to the production namespace.

**ArgoCD prune disabled for production** -- Removed `prune: true` from `argocd/prod-application.yaml`. Kept `selfHeal: true`.
*Why:* With prune disabled, resources removed from Git become "orphaned" in ArgoCD's UI, giving operators a chance to notice and act intentionally rather than having live resources deleted automatically. `selfHeal` is kept so ArgoCD corrects manual drift in the cluster. Dev retains `prune: true` since fast iteration matters more there and the blast radius is lower.

**`.dockerignore` added** -- Created `.dockerignore` to exclude `.git`, `.github`, `argocd`, `environments`, `helm`, `node_modules`, markdown files, and logs from the Docker build context.
*Why:* Reduces build context size and prevents unnecessary files from being sent to the Docker daemon. The image only needs `package.json` and `src/`.

### Not fixed (and why)

- **Dockerfile `USER` directive**: The Dockerfile does not set `USER node`, so the image builds as root. However, the Kubernetes `securityContext` (`runAsUser: 1000`) enforces non-root at runtime, which is the stronger enforcement point. Adding `USER node` to the Dockerfile would provide defense in depth but is not strictly necessary given the K8s-level enforcement.

---

## Part 3 -- GitHub Actions

### Problems

1. **Workflow directly deploys to Kubernetes.** The `helm upgrade --install` step violates the GitOps model. The assignment explicitly states GitHub Actions should not deploy application workloads -- ArgoCD handles that.

2. **`permissions: write-all`.** Grants every GitHub permission to the workflow. Violates least privilege and increases the blast radius if the workflow is compromised.

3. **Image always tagged `latest` only.** No version-specific tag. Impossible to trace which commit produced an image, pin a specific version, or roll back to a known build.

4. **Image push runs on PRs.** No condition separating PR validation from main branch delivery. Registry login and push would execute on every PR, either failing or pushing unwanted images.

5. **Helm template only validates dev.** Only `environments/dev/values.yaml` is tested. A broken prod values file would pass CI undetected.

6. **Single monolithic job.** CI (validation) and CD (build/push) are mixed in one job. PRs don't need to build and push images -- they only need validation.

7. **`ubuntu-latest` runner.** Not pinned to a specific version. Runner upgrades could silently break builds.

8. **Uses custom `REGISTRY_PASSWORD` secret.** For GHCR, the built-in `GITHUB_TOKEN` is sufficient and avoids managing a separate secret.

### Fixes

**Removed `helm upgrade --install` step.**
*Why:* ArgoCD is the deployment mechanism. GitHub Actions should validate and build, not deploy. This follows the GitOps model where Git is the source of truth and ArgoCD reconciles the desired state.

**Split into two jobs: `test` and `build-and-push`.**
*Why:* The `test` job runs on all PRs and pushes (npm test, helm lint, helm template for both envs). The `build-and-push` job only runs on push to main after tests pass. This means PRs get fast validation without unnecessary image builds, and only merged code produces images.

**Removed `permissions: write-all`, scoped to `packages: write` on `build-and-push` only.**
*Why:* Least privilege. The `test` job needs no special permissions. Only `build-and-push` needs `packages: write` to push to GHCR.

**Image tagged with both `${{ github.sha }}` and `latest`.**
*Why:* The SHA tag provides traceability (which commit produced this image) and enables pinning specific versions. The `latest` tag provides a convenient moving pointer for dev environments.

**Added Helm template validation for both environments.**
*Why:* Both dev and prod values files are now validated in CI. A misconfiguration in either environment will be caught before merge.

**Pinned runner to `ubuntu-24.04`.**
*Why:* `ubuntu-latest` is a moving target. Pinning to a specific version prevents silent breakage from runner upgrades.

**Switched from `REGISTRY_PASSWORD` to `GITHUB_TOKEN`.**
*Why:* `GITHUB_TOKEN` is automatically available in GitHub Actions for GHCR access. No need to manage a separate secret.

### Not fixed (and why)

- **Docker build caching**: Could speed up builds using `docker/build-push-action` with layer caching, but adds complexity for a small single-stage image. Not worth it at this scale.
- **Branch protection rules**: Should require the `test` job to pass before merging PRs. This is configured in GitHub repository settings, not in the workflow file itself.

---

## Part 4 -- ArgoCD and GitOps

*TODO*

---

## Part 5 -- Incident Investigation

> Argo CD reports the application as synchronized and healthy. Users intermittently receive HTTP 503 responses shortly after deployments.

*TODO*

---

## Part 6 -- Cloud Architecture

*TODO*

---

## Part 7 -- Engineering Decision

*TODO*

---

## Remaining Work

*TODO -- will be updated as implementation progresses.*

---

## AI Usage

**Tool used:** Claude Code (Claude Opus 4.6) -- used throughout the assignment for code review, implementation, and documentation.

### Suggestions rejected / modified

**CI/CD workflow: 3-job pipeline with duplicate builds.** Claude initially implemented a 3-job pipeline (test, build, push) that built the Docker image in both the `build` and `push` jobs separately. I pointed out this was wasteful -- it doubles build time and doesn't guarantee identical images. Claude then proposed passing the image as an artifact between jobs, but this added unnecessary complexity (upload/download of a tarball) for a simple workflow. I decided to simplify to 2 jobs (test, build-and-push) which keeps the separation between validation and delivery without the overhead of artifact passing or duplicate builds.
