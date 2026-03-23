# CI/CD Pipeline Overview — Dashboard Application

## Architecture Summary

```
Developer Push / PR
        │
        ▼
┌───────────────────┐
│   GitHub Actions  │
│   Trigger Engine  │
└────────┬──────────┘
         │
    ┌────┴────┐
    ▼         ▼
 PR Flow   Main/Tag Flow
    │         │
    ▼         ▼
 CI Jobs   CI Jobs
 (Test,    (Test,
 Lint,     Lint,
 Build)    Build,
           Publish,
           Deploy)
```

## Pipeline Stages

| Stage         | Trigger             | Jobs                                         |
|---------------|---------------------|----------------------------------------------|
| Validate      | Every push / PR     | Lint, Type-check, Audit                      |
| Test          | Every push / PR     | Unit, Integration, E2E, Coverage             |
| Build         | Every push / PR     | Docker image build + cache                   |
| Publish       | Merge to main/tag   | Push image to registry, update manifests     |
| Deploy Staging| Merge to main       | Helm upgrade → staging namespace             |
| Deploy Prod   | Git tag `v*`        | Helm upgrade → production (manual approval)  |
| Notify        | End of every run    | Slack / email summary                        |

## Branch Strategy

- `feature/*`  → CI only (lint + test + build)
- `develop`    → CI + deploy to **dev** environment
- `main`       → CI + deploy to **staging**, promote to **prod** on approval
- `v*` tag     → CI + deploy directly to **production**

## Secrets Required

| Secret Name                  | Where Used               |
|------------------------------|--------------------------|
| `DOCKERHUB_USERNAME`         | Docker login             |
| `DOCKERHUB_TOKEN`            | Docker login             |
| `KUBECONFIG_STAGING`         | kubectl / Helm staging   |
| `KUBECONFIG_PROD`            | kubectl / Helm prod      |
| `SLACK_WEBHOOK_URL`          | Notifications            |
| `SONAR_TOKEN`                | SonarCloud analysis      |
| `SNYK_TOKEN`                 | Dependency security scan |
| `VITE_API_BASE_URL_STAGING`  | Build env injection      |
| `VITE_API_BASE_URL_PROD`     | Build env injection      |
