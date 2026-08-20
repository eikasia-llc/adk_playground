---
id: chatbot_template_provisioning_plan_log
status: done
type: log
description: 'Archived plan log for the Chatbot Template app provisioning (FastAPI/ADK backend on Cloud Run, Next.js SSR frontend on Firebase App Hosting; isolated GCP project chatbot-template-eikasia). Plan reached status done and was archived to content/logs/ on 2026-05-17. The corresponding execution history lives in content/logs/CHATBOT_TEMPLATE_PROVISIONING_LOG.md.'
label: [planning, infrastructure, log]
injection: informational
volatility: stable
scope: general
last_checked: '2026-05-17'
owner: infrastructure-agent
---
# Chatbot Template Provisioning — Archived Plan Log

This document is the archived planning log for the Chatbot Template app provisioning. It originally lived at `content/plans/CHATBOT_TEMPLATE_PROVISIONING_PLAN.md` and was moved to `content/logs/CHATBOT_TEMPLATE_PROVISIONING_PLAN_LOG.md` on 2026-05-17 (KB Sanity Run 3, Phase 3) because the plan reached `status: done`. The corresponding execution history is in [CHATBOT_TEMPLATE_PROVISIONING_LOG.md](CHATBOT_TEMPLATE_PROVISIONING_LOG.md) (which records what actually happened during provisioning); this archived plan preserves the design decisions (GCP project layout, region, backend/frontend choices, IAM model, branch strategy) that drove that execution. The body below is preserved verbatim from the active plan; only the title, frontmatter, and this preamble have been rewritten for the archived role.

The original purpose: onboard the **Chatbot Template** app (`/home/zeta/src/eikasia/adk_playground/chatbot_template`) into Eikasia's cloud infrastructure.

## Key Decisions (locked 2026-04-06)
- **GCP project**: new, isolated `chatbot-template-eikasia` (project number `207274917577`; the bare `chatbot-template` ID was globally taken — fallback used per pre-approved plan). Placed at the **root of org `eikasia.com`** (no folder). *(Initially placed inside a folder `chatbot-template` on 2026-04-07; moved to org root the same day because the `firebase init apphosting` interactive picker does not list projects nested in folders. The folder was deleted.)* Billing account: same as `eikasia-ops` (`01983A-488BFC-C8951C`).
- **Region**: `us-central1`.
- **Backend**: Python FastAPI + Google ADK (`gemini-2.5-flash`) on Cloud Run, service `chatbot-template-app-backend`. **IAM-only** (`--no-allow-unauthenticated`).
- **Frontend**: Next.js 14 SSR on **Firebase App Hosting** (NOT static Firebase Hosting). GitHub auto-deploy from `https://github.com/eikasia-llc/adk_playground`, **production branch `chatbot-template`** (NOT `main`), root `chatbot_template/frontend/`.
- **Branch strategy**: production rollouts (App Hosting + backend deploys) listen to and are synced from the `chatbot-template` branch of `eikasia-llc/adk_playground`. `main` is unaffected by this app's lifecycle. All Phase 1 work happens on the `chatbot-template` branch from creation; the first push to `chatbot-template` after the App Hosting backend exists is the Phase 4 first production deploy.
- **Frontend → Backend auth**: Next.js server-side proxy routes mint OIDC ID tokens via metadata server. Browser never calls backend directly. App Hosting runtime SA gets `roles/run.invoker`.
- **Gemini access**: AI Studio API key in Secret Manager. Both AI Studio and Vertex AI are permitted per `INFRASTRUCTURE_DEFINITIONS_REF.md`.
- **Networking**: isolated project. No Shared VPC, no VPC peering, no Serverless VPC connector. Private Google Access enabled on default subnet.
- **Logs**: minimum severity WARN per cost policy.
- **Cost expectation**: ~$0/month at current scale (~2 users/week), all within free tier; only Artifact Registry storage and minimal Cloud Build minutes incur cents.

## Phase 0: KB Scaffolding

```yaml
id: chatbot_template_provisioning_plan.phase_0
status: done
type: task
```

### 0.1 Create plan doc
- id: chatbot_template_provisioning_plan.phase_0.task_01
- status: done
<!-- content -->
This file.

### 0.2 Create reference stub
- id: chatbot_template_provisioning_plan.phase_0.task_02
- status: done
<!-- content -->
`content/reference/INFRASTRUCTURE_CHATBOT_TEMPLATE_REF.md` — initial_draft, filled progressively.

### 0.3 Register in dependency_registry.json
- id: chatbot_template_provisioning_plan.phase_0.task_03
- status: done
<!-- content -->

### 0.4 Append intervention to INFRA_AGENTS_LOG.md
- id: chatbot_template_provisioning_plan.phase_0.task_04
- status: done
<!-- content -->

## Phase 1: Repo Prep

```yaml
id: chatbot_template_provisioning_plan.phase_1
status: done
type: task
```

All Phase 1 work happens on the `chatbot-template` branch of `eikasia-llc/adk_playground`, created from `main` in task 1.0.

### 1.0 Create production branch chatbot-template from main
- id: chatbot_template_provisioning_plan.phase_1.task_00
- status: done
<!-- content -->
`git checkout -b chatbot-template main && git push -u origin chatbot-template`. This branch is the production deploy source for both the backend (manual `deploy.sh` runs from this branch) and the frontend (Firebase App Hosting auto-deploy trigger).

### 1.1 .dockerignore for backend
- id: chatbot_template_provisioning_plan.phase_1.task_01
- status: done
<!-- content -->

### 1.2 Backend ALLOWED_ORIGINS env (locked empty in prod, IAM-only)
- id: chatbot_template_provisioning_plan.phase_1.task_02
- status: done
<!-- content -->

### 1.3 Confirm backend reads GOOGLE_API_KEY from container env without .env file
- id: chatbot_template_provisioning_plan.phase_1.task_03
- status: done
<!-- content -->

### 1.4 frontend/apphosting.yaml (runConfig + env)
- id: chatbot_template_provisioning_plan.phase_1.task_04
- status: done
<!-- content -->
`runConfig`: minInstances=0, maxInstances=2, memoryMiB=512. Env: server-side `BACKEND_URL` (Cloud Run backend URL). Drop `frontend/Dockerfile` (App Hosting uses buildpacks).

### 1.5 Next.js proxy routes for IAM-only backend
- id: chatbot_template_provisioning_plan.phase_1.task_05
- status: done
<!-- content -->
`frontend/src/app/api/chat/route.ts` and `…/api/stream/route.ts`. Use `google-auth-library` `getIdTokenClient(BACKEND_URL)`. Verify SSE pass-through via `ReadableStream`.

### 1.6 Update useChat.ts to call same-origin /api/chat and /api/stream
- id: chatbot_template_provisioning_plan.phase_1.task_06
- status: done
<!-- content -->
Drop `NEXT_PUBLIC_BACKEND_URL`.

### 1.7 Backend cloudbuild.yaml + deploy.sh
- id: chatbot_template_provisioning_plan.phase_1.task_07
- status: done
<!-- content -->
Backend only. Frontend deploys via App Hosting GitHub trigger.

### 1.8 Update repo README
- id: chatbot_template_provisioning_plan.phase_1.task_08
- status: done
<!-- content -->

## Phase 2: GCP + Firebase Provisioning

```yaml
id: chatbot_template_provisioning_plan.phase_2
status: done
type: task
```

### 2.1 Create GCP project chatbot-template, link billing
- id: chatbot_template_provisioning_plan.phase_2.task_01
- status: done
<!-- content -->

### 2.2 Enable APIs
- id: chatbot_template_provisioning_plan.phase_2.task_02
- status: done
<!-- content -->
`run`, `artifactregistry`, `cloudbuild`, `secretmanager`, `iam`, `logging`, `aiplatform`, `firebase`, `firebasehosting`, `firebaseapphosting`.

### 2.3 Artifact Registry repo chatbot-template-app (us-central1, Docker)
- id: chatbot_template_provisioning_plan.phase_2.task_03
- status: done
<!-- content -->

### 2.4 Runtime SA chatbot-template-app-sa
- id: chatbot_template_provisioning_plan.phase_2.task_04
- status: done
<!-- content -->
Roles: `roles/secretmanager.secretAccessor`, `roles/logging.logWriter`, `roles/artifactregistry.reader`.

### 2.5 Cloud Build SA roles
- id: chatbot_template_provisioning_plan.phase_2.task_05
- status: done
<!-- content -->
`roles/run.admin`, `roles/iam.serviceAccountUser`, `roles/artifactregistry.writer`.

### 2.6 Secret Manager: GOOGLE_API_KEY
- id: chatbot_template_provisioning_plan.phase_2.task_06
- status: done
<!-- content -->
Value provided by user out-of-band; never stored in repo.

### 2.7 Log sink: project-wide minimum severity WARNING
- id: chatbot_template_provisioning_plan.phase_2.task_07
- status: done
<!-- content -->

### 2.8 Enable Private Google Access on default subnet (us-central1)
- id: chatbot_template_provisioning_plan.phase_2.task_08
- status: done
<!-- content -->

### 2.9 Initialize Firebase on chatbot-template, create App Hosting backend
- id: chatbot_template_provisioning_plan.phase_2.task_09
- status: done
<!-- content -->
Connect to GitHub repo `eikasia-llc/adk_playground` branch `chatbot-template`, root `frontend` (the wizard is run from `adk_playground/chatbot_template/`, so the path is relative to that subfolder). Region `us-central1`. The `chatbot-template` branch must exist before this step (created in Phase 1.0).

## Phase 3: Backend First Production Deploy

```yaml
id: chatbot_template_provisioning_plan.phase_3
status: done
type: task
```

### 3.1 Build & push backend image via Cloud Build
- id: chatbot_template_provisioning_plan.phase_3.task_01
- status: done
<!-- content -->

### 3.2 Deploy chatbot-template-app-backend to Cloud Run
- id: chatbot_template_provisioning_plan.phase_3.task_02
- status: done
<!-- content -->
Flags: `--no-allow-unauthenticated`, `--region=us-central1`, `--service-account=chatbot-template-app-sa@chatbot-template-eikasia.iam.gserviceaccount.com`, `--set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest`, `--min-instances=0`, `--max-instances=2`, `--memory=512Mi`, `--cpu=1`, `--update-labels=app=chatbot-template-app`.

### 3.3 Smoke test /health and /chat from authenticated context
- id: chatbot_template_provisioning_plan.phase_3.task_03
- status: done
<!-- content -->
`gcloud run services proxy` or `curl -H "Authorization: Bearer $(gcloud auth print-identity-token)"`.

### 3.4 Grant App Hosting runtime SA roles/run.invoker on backend
- id: chatbot_template_provisioning_plan.phase_3.task_04
- status: done
<!-- content -->
Done after App Hosting backend exists in Phase 2.9.

## Phase 4: Frontend First Production Deploy

```yaml
id: chatbot_template_provisioning_plan.phase_4
status: done
type: task
```

### 4.1 Push to chatbot-template branch, trigger first App Hosting rollout
- id: chatbot_template_provisioning_plan.phase_4.task_01
- status: done
<!-- content -->
First push to `chatbot-template` after the App Hosting backend exists. App Hosting watches this branch and auto-builds via buildpacks from `chatbot_template/frontend/`.

### 4.2 Capture App Hosting URL
- id: chatbot_template_provisioning_plan.phase_4.task_02
- status: done
<!-- content -->

### 4.3 (No backend CORS update — IAM-only, no browser CORS)
- id: chatbot_template_provisioning_plan.phase_4.task_03
- status: done
<!-- content -->

## Phase 4.5: Production Verification Gate

```yaml
id: chatbot_template_provisioning_plan.phase_4_5
status: done
type: task
```

### 4.5.1 E2E browser smoke test
- id: chatbot_template_provisioning_plan.phase_4_5.task_01
- status: done
<!-- content -->

### 4.5.2 SSE-through-proxy verification
- id: chatbot_template_provisioning_plan.phase_4_5.task_02
- status: done
<!-- content -->
Verify Firebase App Hosting CDN does not buffer `text/event-stream`.

### 4.5.3 ID-token auth path verification
- id: chatbot_template_provisioning_plan.phase_4_5.task_03
- status: done
<!-- content -->
Confirm App Hosting runtime SA successfully invokes IAM-locked backend.

### 4.5.4 Cold-start latency measurement
- id: chatbot_template_provisioning_plan.phase_4_5.task_04
- status: done
<!-- content -->

### 4.5.5 Cloud Logging visibility at WARN+
- id: chatbot_template_provisioning_plan.phase_4_5.task_05
- status: done
<!-- content -->

### 4.5.6 Secret Manager binding confirmation (no plain env)
- id: chatbot_template_provisioning_plan.phase_4_5.task_06
- status: done
<!-- content -->

### 4.5.7 Capture screenshots for KB ref doc
- id: chatbot_template_provisioning_plan.phase_4_5.task_07
- status: done
<!-- content -->
Deferred to Phase 5 — requires interactive browser capture.

### 4.5.8 Verify branch strategy: chatbot-template is the production source
- id: chatbot_template_provisioning_plan.phase_4_5.task_08
- status: done
<!-- content -->
Confirm: (1) Firebase App Hosting backend is connected to branch `chatbot-template` (not `main`) — check via `firebase apphosting:backends:get` and the Firebase Console. (2) The latest live App Hosting rollout was built from a commit on `chatbot-template`. (3) `deploy.sh` for the backend refuses to run unless `git rev-parse --abbrev-ref HEAD == chatbot-template` (or warns loudly). (4) `main` has not been pushed since branch creation OR a divergence note is recorded in the ref doc. Document the verified state in `INFRASTRUCTURE_CHATBOT_TEMPLATE_REF.md` under "Branch Strategy".

## Phase 5: Documentation & Handover

```yaml
id: chatbot_template_provisioning_plan.phase_5
status: done
type: task
```

### 5.1 Fill INFRASTRUCTURE_CHATBOT_TEMPLATE_REF.md
- id: chatbot_template_provisioning_plan.phase_5.task_01
- status: done
<!-- content -->
Architecture diagram, project IDs, service URLs, SAs, secrets, runbook, rollback. Mark `volatility: stable` when complete.

### 5.2 Create INFRASTRUCTURE_CHATBOT_TEMPLATE_SKILL.md
- id: chatbot_template_provisioning_plan.phase_5.task_02
- status: done
<!-- content -->
Many Sections. Has to include at least:

#### END_USER_SKILL Section
- id: chatbot_template_provisioning_plan.phase_5.task_02.1
- status: done
<!-- content -->
Has to include at least:
- Production Site End User URLs
    - Frontend URL for end user

#### DEPLOY_SKILL Section
- id: chatbot_template_provisioning_plan.phase_5.task_02.2
- status: done
<!-- content -->
How to deploy a new version: pre-flight, backend gcloud path, frontend git push path, smoke test, rollback.

#### LOGS_SKILL Section
- id: chatbot_template_provisioning_plan.phase_5.task_02.3
- status: done
<!-- content -->
How to read production logs: gcloud CLI recipes, Cloud Console deep links, common log entry interpretation.
Also includes:
- How to read Firebase production logs
- How to read Next.JS production logs
- How to raise the logs of Next.JS from WARN severity to INFO o DEBUG severity, and back
- How to read Cloud Run production logs
- How to raise the logs of Backend from WARN severity to INFO o DEBUG severity, and back

### CONSOLE_SKILL Section
- id: chatbot_template_provisioning_plan.phase_5.task_02.4
- status: done
<!-- content -->
How to access management panels: GCP Console + Firebase Console deep links, IAM roles required, auth notes. **Must absorb the Firebase CLI findings from `CHATBOT_TEMPLATE_PHASE2_PROVISIONING_REF.md` "Operational Findings" section** (Node ≥20 requirement, `firebase use --add` vs `firebase init`, `firebase login --reauth` for stale tokens, canonical workstation bootstrap sequence).

Also includes:
- URL to manage GCP Project
- URL to manage Firebase Project
- URL to manage Cloud Run backend
- URL to see Artifact Registry images
- URL to see Frontend Deployment History
- URL to see Backend Deployment History

### COST_MANAGEMENT_SKILL Section
- id: chatbot_template_provisioning_plan.phase_5.task_02.5
- status: done
<!-- content -->
Has to include at least:
- How to increase frontend and backend keepalive time after last request
- How to see firebase cost of the project
- How to see cloud run cost of the project

### 5.3 Cross-link how-tos from ref doc, register in dependency_registry.json
- id: chatbot_template_provisioning_plan.phase_5.task_03
- status: done
<!-- content -->

### 5.4 Mark plan tasks done, append final log entry
- id: chatbot_template_provisioning_plan.phase_5.task_04
- status: done
<!-- content -->

## Phase 6: KB Policy Update

```yaml
id: chatbot_template_provisioning_plan.phase_6
status: done
type: task
```

### 6.1 Research Firebase App Hosting best practices
- id: chatbot_template_provisioning_plan.phase_6.task_01
- status: done
<!-- content -->
Cost knobs, security defaults, region constraints, Next.js SSR caveats, CDN behavior, GitHub vs CLI deploys, rollback model, observability, Secret Manager integration, App Check, IAP/Identity Platform.

### 6.2 Improve FIREBASE_DEFINITIONS_REF.md
- id: chatbot_template_provisioning_plan.phase_6.task_02
- status: done
<!-- content -->
In KB, ./content/reference/FIREBASE_DEFINITIONS_REF.md:

Add Firebase App Hosting as an officially-supported SSR option alongside static Firebase Hosting. Add Firebase best-practices subsection. Adjust AI/Compute line to explicitly permit AI Studio API or Vertex AI with selection guidance.

Improve this document vastly.

### 6.3 Present diff to user, confirm, commit
- id: chatbot_template_provisioning_plan.phase_6.task_03
- status: in-progress
<!-- content -->
Update `last_updated`/`volatility`. Log in `INFRA_AGENTS_LOG.md`.
