---
id: infrastructure_chatbot_template_skill
status: active
type: how-to
description: Operational recipes for the Chatbot Template app — end-user access, deploy procedures, log reading, console deep links, and cost management. Covers both the Cloud Run backend and Firebase App Hosting frontend.
injection: procedural
volatility: evolving
scope: general
label: [infrastructure, skill, agent]
last_checked: '2026-04-13'
---
# Infrastructure How-To: Chatbot Template

This document is the operational runbook for the **Chatbot Template** application (`chatbot-template-eikasia`). It covers day-to-day operations: accessing the production URL, deploying the backend via Cloud Build or `deploy.sh`, monitoring and reading Cloud Run and Firebase App Hosting logs, temporarily enabling verbose logging for debugging, running smoke tests, rolling back to previous revisions, and managing instance scaling for cost control. For architecture decisions, service accounts, and IAM bindings, see `INFRASTRUCTURE_CHATBOT_TEMPLATE_REF.md`. Reach for this document during deployments, incidents, or routine cost reviews.

## Constants

```text
PROJECT_ID    = chatbot-template-eikasia
PROJECT_NUM   = 207274917577
REGION        = us-central1
BACKEND_SVC   = chatbot-template-app-backend
FRONTEND_SVC  = chatbot-template-app
PROD_BRANCH   = chatbot-template
AR_REPO       = chatbot-template-app
RUNTIME_SA    = chatbot-template-app-sa@chatbot-template-eikasia.iam.gserviceaccount.com
FAH_SA        = firebase-app-hosting-compute@chatbot-template-eikasia.iam.gserviceaccount.com
```

---

## END_USER_SKILL

### Production URLs

| Surface | URL |
| :--- | :--- |
| **Chatbot (end user)** | <https://chatbot-template-app--chatbot-template-eikasia.us-central1.hosted.app> |

This is the public-facing URL served by Firebase App Hosting. The browser loads the Next.js SSR frontend; all AI interactions flow through server-side proxy routes (`/api/chat`, `/api/stream`) that call the IAM-only Cloud Run backend on behalf of the user.

---

## DEPLOY_SKILL

### Pre-flight

1. Ensure you are on the `chatbot-template` branch:

   ```bash
   cd /home/zeta/src/eikasia/adk_playground/chatbot_template
   git checkout chatbot-template
   git pull origin chatbot-template
   ```

2. Confirm gcloud auth is valid:

   ```bash
   gcloud auth list
   gcloud config set project chatbot-template-eikasia
   ```

### Deploy Backend (Cloud Run) — Manual

```bash
./deploy-backend.sh
```

This script:
1. Enforces a hard branch guard (`chatbot-template` only).
2. Warns if the working tree has uncommitted changes.
3. Builds the backend image via Cloud Build (source uploaded to GCS, built inside Google's network).
4. Tags the image as `backend:<short-sha>` and `backend:latest` in Artifact Registry.
5. Deploys to Cloud Run with IAM-only auth, secret-mounted `GOOGLE_API_KEY`, scale 0–2.
6. Runs a smoke test against `/health`.

**Alternative (Cloud Build pipeline)**:

```bash
gcloud builds submit --config cloudbuild.yaml . --project=chatbot-template-eikasia
```

### Deploy Frontend (Firebase App Hosting) — Automatic

```bash
git checkout chatbot-template
git push origin chatbot-template
```

Every push to `chatbot-template` that touches `chatbot_template/frontend/` triggers an automatic App Hosting buildpack rollout. No manual action required.

**Monitor the rollout**:

```bash
# Via REST API (gcloud auth required)
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://firebaseapphosting.googleapis.com/v1beta/projects/chatbot-template-eikasia/locations/us-central1/backends/chatbot-template-app/rollouts?pageSize=3" \
  | python3 -m json.tool
```

Or check the Firebase Console: [App Hosting dashboard](https://console.firebase.google.com/project/chatbot-template-eikasia/apphosting).

### Smoke Test

```bash
# Frontend (public)
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  "https://chatbot-template-app--chatbot-template-eikasia.us-central1.hosted.app"

# Backend /health (IAM-only, needs identity token)
TOKEN="$(gcloud auth print-identity-token)"
curl -fsS -H "Authorization: Bearer $TOKEN" \
  "https://chatbot-template-app-backend-207274917577.us-central1.run.app/health"

# Backend /chat (IAM-only)
curl -fsS -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"smoke test"}' \
  "https://chatbot-template-app-backend-207274917577.us-central1.run.app/chat"

# E2E through frontend proxy (public)
curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"message":"smoke test"}' \
  "https://chatbot-template-app--chatbot-template-eikasia.us-central1.hosted.app/api/chat"
```

### Rollback

**Backend** — redeploy a previous image:

```bash
# List available tags
gcloud artifacts docker tags list \
  us-central1-docker.pkg.dev/chatbot-template-eikasia/chatbot-template-app/backend \
  --project=chatbot-template-eikasia

# Deploy a previous tag
gcloud run deploy chatbot-template-app-backend \
  --image=us-central1-docker.pkg.dev/chatbot-template-eikasia/chatbot-template-app/backend:<previous-tag> \
  --project=chatbot-template-eikasia --region=us-central1
```

**Frontend** — revert the commit and push:

```bash
git checkout chatbot-template
git revert HEAD
git push origin chatbot-template
```

Or route traffic to a previous Cloud Run revision:

```bash
gcloud run services update-traffic chatbot-template-app \
  --to-revisions=<previous-revision>=100 \
  --project=chatbot-template-eikasia --region=us-central1
```

---

## LOGS_SKILL

### Cloud Run Backend Logs

```bash
# Recent WARNING+ logs (default due to sink exclusion)
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="chatbot-template-app-backend"' \
  --project=chatbot-template-eikasia \
  --limit=20 --format="table(timestamp,severity,textPayload)" \
  --freshness=1h

# Filter by severity
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="chatbot-template-app-backend" AND severity>=ERROR' \
  --project=chatbot-template-eikasia \
  --limit=10 --format="table(timestamp,severity,textPayload)"
```

**Console deep link**: [Backend logs](https://console.cloud.google.com/run/detail/us-central1/chatbot-template-app-backend/logs?project=chatbot-template-eikasia)

### Firebase App Hosting / Next.js Frontend Logs

```bash
# Frontend Cloud Run service logs
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="chatbot-template-app"' \
  --project=chatbot-template-eikasia \
  --limit=20 --format="table(timestamp,severity,textPayload)" \
  --freshness=1h
```

**Console deep link**: [Frontend logs](https://console.cloud.google.com/run/detail/us-central1/chatbot-template-app/logs?project=chatbot-template-eikasia)

### Temporarily Raise Log Severity to INFO/DEBUG

The `_Default` sink has an exclusion `drop-below-warning` that drops all `INFO`/`DEBUG`/`NOTICE` entries before ingestion. To temporarily enable verbose logging for debugging:

**Backend — remove the exclusion**:

```bash
# Remove the exclusion (allows INFO/DEBUG ingestion — increases cost)
gcloud logging sinks update _Default \
  --project=chatbot-template-eikasia \
  --remove-exclusions=drop-below-warning

# >>> Debug your issue <<<

# Re-add the exclusion when done
gcloud logging sinks update _Default \
  --project=chatbot-template-eikasia \
  --add-exclusion=name=drop-below-warning,filter="severity < WARNING",description="Cost policy: only ingest WARNING+ per INFRASTRUCTURE_DEFINITIONS_REF.md"
```

This affects **all services in the project** (both backend and frontend). The exclusion is project-wide.

**Next.js frontend** — additionally, Next.js itself may suppress lower-severity output. To force verbose logging in the Next.js runtime, set the `NODE_OPTIONS` env var in `apphosting.yaml`:

```yaml
env:
  - variable: NODE_OPTIONS
    value: "--verbose"
    availability:
      - RUNTIME
```

Then push to `chatbot-template` to trigger a new rollout. **Remove this env var and push again when done** to restore normal behavior.

**Backend (Python/uvicorn)** — to enable DEBUG-level Python logging, add a `LOG_LEVEL` env var to the Cloud Run service:

```bash
gcloud run services update chatbot-template-app-backend \
  --project=chatbot-template-eikasia --region=us-central1 \
  --set-env-vars="LOG_LEVEL=DEBUG"

# Revert when done
gcloud run services update chatbot-template-app-backend \
  --project=chatbot-template-eikasia --region=us-central1 \
  --set-env-vars="LOG_LEVEL=WARNING"
```

Note: the backend code must read `LOG_LEVEL` and configure Python logging accordingly.

### Common Log Patterns

| Pattern | Meaning |
| :--- | :--- |
| `The request was not authenticated` | IAM token missing or expired on backend call. Check App Hosting SA has `roles/run.invoker`. |
| `GOOGLE_API_KEY not found` | Secret not mounted. Check `--set-secrets` flag and secret version count. |
| `Connection refused` on `/api/chat` | Backend is scaled to zero and cold-starting, or `BACKEND_URL` is wrong in `apphosting.yaml`. |
| `stream timeout` | Gemini API call exceeded Cloud Run request timeout (300s default). |

---

## CONSOLE_SKILL

### Console Deep Links

| Resource | URL |
| :--- | :--- |
| **GCP Project overview** | <https://console.cloud.google.com/home/dashboard?project=chatbot-template-eikasia> |
| **Firebase Project overview** | <https://console.firebase.google.com/project/chatbot-template-eikasia/overview> |
| **Cloud Run backend** | <https://console.cloud.google.com/run/detail/us-central1/chatbot-template-app-backend/metrics?project=chatbot-template-eikasia> |
| **Cloud Run frontend (managed)** | <https://console.cloud.google.com/run/detail/us-central1/chatbot-template-app/metrics?project=chatbot-template-eikasia> |
| **Artifact Registry images** | <https://console.cloud.google.com/artifacts/docker/chatbot-template-eikasia/us-central1/chatbot-template-app?project=chatbot-template-eikasia> |
| **App Hosting (frontend deploy history)** | <https://console.firebase.google.com/project/chatbot-template-eikasia/apphosting> |
| **Cloud Build history (backend builds)** | <https://console.cloud.google.com/cloud-build/builds?project=chatbot-template-eikasia> |
| **Secret Manager** | <https://console.cloud.google.com/security/secret-manager?project=chatbot-template-eikasia> |
| **Cloud Logging** | <https://console.cloud.google.com/logs?project=chatbot-template-eikasia> |
| **IAM & Admin** | <https://console.cloud.google.com/iam-admin/iam?project=chatbot-template-eikasia> |
| **Billing** | <https://console.cloud.google.com/billing/01983A-488BFC-C8951C/reports?project=chatbot-template-eikasia> |

### Firebase CLI Setup (Workstation Bootstrap)

The Firebase CLI has several gotchas documented during provisioning. Follow this sequence on any new workstation:

```bash
# 1. Activate Node 20+ (Firebase CLI v15 requires it)
nvm use 20
firebase --version   # must report >= 15

# 2. Always use --reauth (stale tokens are common)
firebase login --reauth

# 3. Verify project is visible
firebase projects:list   # chatbot-template-eikasia must appear

# 4. Set active project (only works after firebase init has been run at least once)
cd /home/zeta/src/eikasia/adk_playground/chatbot_template
firebase use chatbot-template-eikasia
```

**Key gotchas**:
- `firebase login` may report success but API calls fail with 401 → always use `--reauth`.
- `firebase use --add` before `firebase init` on a virgin directory errors out. Order is `init` → `use`.
- `firebase init apphosting` picker omits projects nested in folders → projects must be at org root.
- Firebase App Hosting "backend" ≠ our application backend. In Firebase terminology, a "backend" is the managed Cloud Run + CDN that hosts the web frontend.

---

## COST_MANAGEMENT_SKILL

### Current Cost Profile

At ~2 users/week, costs are effectively **$0/month**:
- Cloud Run (both services): scale-to-zero, free tier covers minimal usage.
- Artifact Registry: pennies for image storage.
- Cloud Build: minimal build minutes.
- Secret Manager: negligible (1 secret, few accesses).
- App Hosting: same pricing as Cloud Run under the hood.

### Adjust Instance Keepalive (Cold-Start vs. Cost)

To reduce cold-start latency, increase `minInstances` from 0. This keeps instances warm but incurs cost even when idle.

**Backend (Cloud Run)**:

```bash
# Set minimum 1 instance (keeps warm, ~$5-10/mo at 512Mi/1cpu)
gcloud run services update chatbot-template-app-backend \
  --project=chatbot-template-eikasia --region=us-central1 \
  --min-instances=1

# Revert to scale-to-zero
gcloud run services update chatbot-template-app-backend \
  --project=chatbot-template-eikasia --region=us-central1 \
  --min-instances=0
```

**Frontend (App Hosting)** — edit `frontend/apphosting.yaml`:

```yaml
runConfig:
  minInstances: 1   # was 0
```

Then push to `chatbot-template` to apply.

### View Firebase Costs

Firebase costs roll up to the GCP billing account. There is no separate Firebase billing page.

```bash
# Open billing reports filtered to this project
open "https://console.cloud.google.com/billing/01983A-488BFC-C8951C/reports?project=chatbot-template-eikasia"
```

Or via the Firebase Console: [Usage and billing](https://console.firebase.google.com/project/chatbot-template-eikasia/usage).

### View Cloud Run Costs

```bash
# Cloud Run cost breakdown
open "https://console.cloud.google.com/billing/01983A-488BFC-C8951C/reports?project=chatbot-template-eikasia&service=run.googleapis.com"
```

Key cost drivers for Cloud Run:
- **CPU allocation**: billed per vCPU-second while instances are active.
- **Memory**: billed per GiB-second.
- **Requests**: free tier covers 2M requests/month.
- **minInstances > 0**: the primary cost lever. Each warm instance costs ~$5-10/mo at 512Mi/1cpu.

To keep costs at zero: keep `minInstances: 0` on both services and accept cold-start latency (~2s for first request after scale-to-zero).
