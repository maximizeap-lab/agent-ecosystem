# Setup Instructions

## CoachSync Platform — Installation & Configuration Guide

**Version:** 2.1.0  
**Last Updated:** June 2025  
**Audience:** System Administrators, IT Teams, Self-Hosted Users

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Cloud-Hosted Quick Start](#2-cloud-hosted-quick-start)
3. [Self-Hosted Installation](#3-self-hosted-installation)
4. [Environment Configuration](#4-environment-configuration)
5. [Database Setup](#5-database-setup)
6. [Authentication & Security](#6-authentication--security)
7. [Integrations & Third-Party Services](#7-integrations--third-party-services)
8. [Running the Application](#8-running-the-application)
9. [Upgrading](#9-upgrading)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. System Requirements

### Minimum Hardware (Self-Hosted)

| Component     | Minimum              | Recommended           |
|---------------|----------------------|-----------------------|
| CPU           | 2 cores              | 4+ cores              |
| RAM           | 4 GB                 | 8 GB                  |
| Disk          | 20 GB SSD            | 100 GB SSD            |
| Network       | 10 Mbps              | 100 Mbps              |

### Supported Operating Systems

- **Linux:** Ubuntu 22.04 LTS, Debian 12, RHEL/CentOS 8+
- **macOS:** 13 (Ventura) or later *(development only)*
- **Windows:** Windows Server 2019+ via WSL2 *(development only)*

### Required Software Dependencies

| Dependency     | Minimum Version | Notes                        |
|----------------|-----------------|------------------------------|
| Node.js        | 18.x LTS        | Use `nvm` for version mgmt   |
| npm            | 9.x             | Bundled with Node.js 18      |
| PostgreSQL     | 14.x            | Primary database             |
| Redis          | 7.x             | Session store & job queue    |
| Docker         | 24.x *(optional)* | For containerised deploy   |
| Docker Compose | 2.x *(optional)* | Multi-container orchestration |
| Git            | 2.30+           | Source control               |

---

## 2. Cloud-Hosted Quick Start

If you are using the managed CoachSync cloud service, no server installation is required.

### Step 1 — Create an Account

1. Navigate to **[https://app.coachsync.io/signup](https://app.coachsync.io/signup)**.
2. Enter your **name**, **email address**, and a strong **password**.
3. Select your role: **Coach** or **Athlete**.
4. Click **Create Account**.
5. Verify your email address via the confirmation link sent to your inbox.

### Step 2 — Create or Join an Organisation

- **Coaches:** Click **New Organisation**, enter your team/club name, and choose a subscription plan.
- **Athletes:** Enter the **invite code** provided by your coach to join an existing organisation.

### Step 3 — Complete Onboarding

Follow the in-app onboarding wizard to:
- Set your timezone and preferred units (metric / imperial).
- Connect wearable devices or fitness trackers (optional).
- Configure notification preferences.

> **You're ready to use CoachSync!** Skip to the [User Guide](user-guide.md) for next steps.

---

## 3. Self-Hosted Installation

### Option A — Docker (Recommended)

Docker is the fastest and most reproducible way to run CoachSync on your own infrastructure.

#### Step 1 — Install Docker

```bash
# Ubuntu / Debian
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

#### Step 2 — Clone the Repository

```bash
git clone https://github.com/coachsync/coachsync-platform.git
cd coachsync-platform
```

#### Step 3 — Configure Environment

```bash
cp .env.example .env
# Edit the .env file with your values (see Section 4)
nano .env
```

#### Step 4 — Start All Services

```bash
docker compose up -d
```

This starts: `api`, `worker`, `postgres`, `redis`, and `nginx` containers.

#### Step 5 — Run Database Migrations

```bash
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed   # optional demo data
```

#### Step 6 — Verify the Installation

```bash
docker compose ps          # all services should show "running"
curl http://localhost/health   # should return {"status":"ok"}
```

---

### Option B — Manual Installation (Bare Metal / VM)

#### Step 1 — Install Node.js

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node -v   # should print v18.x.x
```

#### Step 2 — Install PostgreSQL

```bash
# Ubuntu / Debian
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

# Create a database and user
sudo -u postgres psql <<EOF
CREATE USER coachsync WITH PASSWORD 'your_secure_password';
CREATE DATABASE coachsync_db OWNER coachsync;
GRANT ALL PRIVILEGES ON DATABASE coachsync_db TO coachsync;
EOF
```

#### Step 3 — Install Redis

```bash
sudo apt-get install -y redis-server
sudo systemctl enable --now redis-server
```

#### Step 4 — Clone & Install Application

```bash
git clone https://github.com/coachsync/coachsync-platform.git
cd coachsync-platform
npm ci --production
```

#### Step 5 — Configure Environment & Migrate

```bash
cp .env.example .env
nano .env               # fill in all required values
npm run db:migrate
```

#### Step 6 — Configure a Process Manager (PM2)

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup             # follow the printed command to auto-start on reboot
```

---

## 4. Environment Configuration

All configuration is managed via the `.env` file in the project root.  
**Never commit `.env` to version control.**

### Core Variables

```dotenv
# ── Application ───────────────────────────────────────────────
NODE_ENV=production           # "development" | "production" | "test"
APP_PORT=3000                 # Port the API server listens on
APP_URL=https://yourdomain.com
APP_SECRET=replace_with_64_char_random_string

# ── Database ──────────────────────────────────────────────────
DATABASE_URL=postgresql://coachsync:your_secure_password@localhost:5432/coachsync_db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ── Redis ─────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=                # leave blank if no auth

# ── Authentication ────────────────────────────────────────────
JWT_SECRET=replace_with_64_char_random_string
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

# ── Email (SMTP) ──────────────────────────────────────────────
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false             # true for port 465
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_smtp_password
EMAIL_FROM="CoachSync <noreply@yourdomain.com>"

# ── File Storage ──────────────────────────────────────────────
STORAGE_DRIVER=s3             # "local" | "s3"
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=coachsync-uploads

# ── Optional Integrations ─────────────────────────────────────
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
GARMIN_CONSUMER_KEY=
GARMIN_CONSUMER_SECRET=
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=
```

### Generating Secure Secrets

```bash
# Generate a 64-character random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Database Setup

### Running Migrations

```bash
# Apply all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Roll back the last migration
npm run db:migrate:rollback
```

### Seeding Demo Data (Development Only)

```bash
npm run db:seed
```

This creates:
- 1 demo organisation (`Demo Athletics Club`)
- 1 coach account (`coach@demo.com` / `password123`)
- 5 athlete accounts (`athlete1@demo.com` … `athlete5@demo.com` / `password123`)

> ⚠️ **Never run `db:seed` in a production environment.**

### Backup & Restore

```bash
# Backup
pg_dump -U coachsync coachsync_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U coachsync coachsync_db < backup_20250601.sql
```

---

## 6. Authentication & Security

### TLS / SSL

All production deployments **must** use HTTPS. If using Docker, the bundled NGINX container handles TLS termination.

1. Place your certificate and key in `./nginx/certs/`:
   - `server.crt`
   - `server.key`
2. Or use Let's Encrypt via Certbot:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

### Firewall Rules (Minimum)

| Port | Protocol | Purpose                         |
|------|----------|---------------------------------|
| 22   | TCP      | SSH (restrict to admin IPs)     |
| 80   | TCP      | HTTP (redirect to HTTPS)        |
| 443  | TCP      | HTTPS                           |
| 5432 | TCP      | PostgreSQL (localhost only)     |
| 6379 | TCP      | Redis (localhost only)          |

### Security Hardening Checklist

- [ ] Change all default passwords and secrets before going live.
- [ ] Restrict database and Redis ports to localhost or internal network.
- [ ] Enable automatic security updates on the OS.
- [ ] Set `NODE_ENV=production` to disable debug output.
- [ ] Configure rate limiting (enabled by default; tune in `config/security.js`).
- [ ] Review and rotate `JWT_SECRET` and `APP_SECRET` periodically.

---

## 7. Integrations & Third-Party Services

### Strava

1. Create an app at [https://www.strava.com/settings/api](https://www.strava.com/settings/api).
2. Set the **Authorisation Callback Domain** to your domain.
3. Copy **Client ID** and **Client Secret** to `.env`.

### Garmin Connect

1. Register at [https://developer.garmin.com/gc-developer-program/](https://developer.garmin.com/gc-developer-program/).
2. Obtain **Consumer Key** and **Consumer Secret**.
3. Copy values to `.env`.

### WHOOP

1. Apply for API access at [https://developer.whoop.com](https://developer.whoop.com).
2. Set the **Redirect URI** to `https://yourdomain.com/integrations/whoop/callback`.
3. Copy **Client ID** and **Client Secret** to `.env`.

### Email Delivery (Transactional)

For reliable email delivery in production, use a dedicated service such as:
- **SendGrid:** set `SMTP_HOST=smtp.sendgrid.net`, `SMTP_PORT=587`, `SMTP_USER=apikey`, `SMTP_PASS=<sendgrid_api_key>`.
- **Mailgun**, **Postmark**, or **AWS SES** are also supported via SMTP.

---

## 8. Running the Application

### Docker

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f api

# Restart a single service
docker compose restart worker
```

### PM2 (Bare Metal)

```bash
# Start all processes
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs coachsync-api

# Reload without downtime
pm2 reload coachsync-api
```

---

## 9. Upgrading

```bash
# 1. Pull the latest code
git pull origin main

# 2. Install any new dependencies
npm ci --production

# 3. Apply new database migrations
npm run db:migrate

# 4. Restart the application
pm2 reload coachsync-api          # bare metal
docker compose up -d --build      # Docker
```

> 📌 Always read the **CHANGELOG.md** before upgrading between major versions as breaking changes may require manual steps.

---

## 10. Troubleshooting

### Application Won't Start

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `EADDRINUSE` error | Port already in use | Change `APP_PORT` or kill the process on that port |
| `Cannot connect to database` | Wrong `DATABASE_URL` | Verify PostgreSQL is running and credentials are correct |
| `JWT_SECRET not set` | Missing `.env` variable | Ensure `.env` exists and contains all required keys |
| Blank white screen | Build not compiled | Run `npm run build` and restart |

### Database Migration Failures

```bash
# Check the current migration state
npm run db:migrate:status

# Inspect migration logs
cat logs/migrations.log
```

### Container Issues

```bash
# Inspect a container's logs
docker compose logs --tail=100 api

# Shell into the API container
docker compose exec api sh

# Force rebuild images
docker compose build --no-cache
docker compose up -d
```

### Getting Help

- **Documentation:** [https://docs.coachsync.io](https://docs.coachsync.io)
- **Community Forum:** [https://community.coachsync.io](https://community.coachsync.io)
- **GitHub Issues:** [https://github.com/coachsync/coachsync-platform/issues](https://github.com/coachsync/coachsync-platform/issues)
- **Email Support:** support@coachsync.io *(Business & Enterprise plans)*

---

*© 2025 CoachSync Inc. — Setup Instructions v2.1.0*
