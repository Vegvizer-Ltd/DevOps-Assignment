# DevOps Engineer Home Assignment - Starter Repository

This repository is intentionally incomplete and may contain implementation, reliability, security, and maintainability problems.

Your task is to review the repository, improve the delivery implementation, and document the reasoning behind your changes.

## Local application

```bash
npm start
```

The application listens on port `3000` by default.

Endpoints:

- `/`
- `/healthz`
- `/readyz`

## Repository areas

- `helm/application` - Kubernetes Helm chart
- `environments` - environment-specific configuration
- `argocd` - example GitOps configuration
- `.github/workflows` - CI/CD configuration

Do not assume that the supplied configuration is correct.
