# CI/CD Setup Guide — Dashboard Application

## Prerequisites

- GitHub repository with Actions enabled
- Docker Hub account
- Kubernetes cluster (staging + production namespaces)
- Helm 3.14+
- SonarCloud account (free for public repos)
- Snyk account (free tier available)

---

## Step 1 — Configure GitHub Secrets

Navigate to **Settings → Secrets and variables → Actions** and add:

| Secret | Description | How to obtain |
|--------|-------------|---------------|
| `DOCKERHUB_USERNAME` | Docker Hub username | Docker Hub account |
| `DOCKERHUB_TOKEN` | Docker Hub access token | Docker Hub → Account Settings → Security |
| `KUBECONFIG_STAGING` | base64-encoded kubeconfig for staging | `cat ~/.kube/config \| base64` |
| `KUBECONFIG_PROD` | base64-encoded kubeconfig for production | Same as above, production cluster |
| `SLACK_WEBHOOK_URL` | Incoming webhook URL | Slack → Apps → Incoming Webhooks |
| `SONAR_TOKEN` | SonarCloud user token | SonarCloud → My Account → Security |
| `SNYK_TOKEN` | Snyk API token | Snyk → Account Settings |
| `VITE_API_BASE_URL_STAGING` | Staging API URL | e.g. `https://api.staging.example.com` |
| `VITE_API_BASE_URL_PROD` | Production API URL | e.g. `https://api.example.com` |
| `CHROMATIC_PROJECT_TOKEN` | Chromatic project token | chromatic.com → project settings |

---

## Step 2 — Configure GitHub Environments

Create three environments in **Settings → Environments**:

### `staging`
- No protection rules (auto-deploy on merge to `main`)
- URL: `https://dashboard.staging.example.com`

### `production-canary`
- No protection rules (auto-runs canary phase)
- URL: `https://dashboard.example.com`

### `production`
- ✅ **Required reviewers**: add 1–2 senior engineers
- ✅ **Wait timer**: 0 minutes (or set 5 min buffer)
- URL: `https://dashboard.example.com`

---

## Step 3 — Configure SonarCloud

1. Log in to [sonarcloud.io](https://sonarcloud.io)
2. Import your GitHub repository
3. Set the project key in `sonar-project.properties`:
   ```
   sonar.projectKey=your-org_dashboard-app
   sonar.organization=your-org
   ```
4. Set **Quality Gate** thresholds to match `scripts/check-coverage.js`

---

## Step 4 — Kubernetes Cluster Setup

### Staging namespace
```bash
kubectl create namespace dashboard-staging
kubectl label namespace dashboard-staging environment=staging
```

### Production namespace
```bash
kubectl create namespace dashboard-prod
kubectl label namespace dashboard-prod environment=production
```

### Install cert-manager (TLS)
```bash
helm repo add jetstack https://charts.jetstack.io
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true
```

### Install ingress-nginx
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

---

## Step 5 — Update Domain Names

Replace all occurrences of `example.com` in:

- `helm/dashboard/values.yaml`
- `helm/dashboard/values.staging.yaml`
- `helm/dashboard/values.production.yaml`
- `.github/workflows/cd-staging.yml`
- `.github/workflows/cd-production.yml`
- `nginx/default.conf` (CSP header)

---

## Step 6 — Update Organization References

Replace these placeholders globally:

| Placeholder | Replace with |
|-------------|--------------|
| `your-org` | Your GitHub organization name |
| `yourdockerhubuser` | Your Docker Hub username |
| `@your-org/frontend-team` | Your GitHub team slugs |
| `@your-org/platform-team` | Your GitHub team slugs |

---

## Step 7 — First Deployment

```bash
# 1. Create and push initial tag
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0

# 2. Watch the pipeline
# GitHub → Actions → CD — Deploy to Production
```

---

## Pipeline Trigger Reference

| Event | Workflows Triggered |
|-------|---------------------|
| Push to any branch | `ci.yml` (lint + test + build) |
| Push to `main` | `ci.yml` + `cd-staging.yml` |
| Push tag `v*` | `ci.yml` + `cd-production.yml` |
| Open/update PR to `main`/`develop` | `ci.yml` + `pr-checks.yml` |
| Every night 03:00 UTC | `scheduled.yml` (security scan) |
| Every Monday 02:00 UTC | `scheduled.yml` (dependency update) |
| 1st of month 04:00 UTC | `scheduled.yml` (full regression) |
| Manual dispatch | Any workflow via Actions UI |

---

## Rollback Procedures

### Automatic Rollback
Both CD workflows include automatic rollback on failure via `--atomic` flag
and a dedicated `rollback-*` job that runs `helm rollback dashboard 0`.

### Manual Rollback
```bash
# List releases
helm history dashboard --namespace dashboard-prod

# Rollback to specific revision
helm rollback dashboard <REVISION> \
  --namespace dashboard-prod \
  --wait

# Or redeploy a previous image tag via workflow_dispatch
# GitHub → Actions → CD — Deploy to Production → Run workflow
# Enter the previous image tag (e.g. v1.3.2)
```

---

## Monitoring & Observability

The Helm chart exposes:
- **`/health`** — liveness/readiness endpoint (returns JSON)
- **Prometheus scrape annotations** — auto-discovered by cluster Prometheus
- **Pod labels** — filterable in Grafana/Lens

Consider adding:
- Grafana dashboard for nginx metrics
- Alertmanager rules for error rate > 1%
- Uptime check (e.g. Blackbox Exporter or UptimeRobot)
