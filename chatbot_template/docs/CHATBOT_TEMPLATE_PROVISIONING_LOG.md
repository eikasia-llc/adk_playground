---
type: log
status: active
id: chatbot-template.provisioning-log
description: 'Append-only provisioning history for the Chatbot Template GCP project: org placement decisions, Firebase CLI findings, and infrastructure verification snapshots.'
label: [infrastructure]
injection: informational
volatility: evolving
last_checked: '2026-04-16'
---
# Chatbot Template — Provisioning Log

Append-only provisioning history for `chatbot-template-eikasia`. Newest entries first.

---

## 2026-04-13 — Phase 2 complete; full infrastructure verified
- status: done
- type: task
- id: chatbot-template.provisioning-log.2026_04_13_phase2_complete
- last_checked: 2026-04-13
<!-- content -->

**What:** Verified full infrastructure state at end of Phase 2. Cloud Run backend deployed at revision `chatbot-template-app-backend-00001-lvs`, image `backend:b709517`. Firebase App Hosting backend latest successful rollout from branch `chatbot-template`, commit `b31e6c5`. `GOOGLE_API_KEY` secret has 1 enabled version (added by user out-of-band).

**Outstanding tasks at handoff to Phase 2.9:** (1) User to add Gemini API key value to Secret Manager. (2) User to run `firebase init apphosting` on workstation to write `.firebaserc`. (3) Capture App Hosting runtime SA email for Phase 3.4 `roles/run.invoker` grant via `firebase apphosting:backends:list`.

---

## 2026-04-07 — Phase 2 provisioning: org placement move and Firebase init
- status: done
- type: task
- id: chatbot-template.provisioning-log.2026_04_07_phase2_provisioning
- last_checked: 2026-04-07
<!-- content -->

**What:** Completed Phase 2 GCP and Firebase provisioning. Enabled 14 APIs (46 total with transitive deps), created runtime SA and IAM bindings, deployed Artifact Registry repo, created Secret Manager secret, configured log sink exclusion for `severity < WARNING`, provisioned Firebase and App Hosting backend.

**Org placement move — folder → org root:** Project was initially placed in folder `chatbot-template` (`folders/878080533360`). The `firebase init apphosting` picker does not surface folder-nested projects. Project moved to org root:

```bash
gcloud beta projects move chatbot-template-eikasia --organization=908544520770 --quiet
```

IAM roles required on the org: `roles/resourcemanager.projectMover`, `roles/resourcemanager.folderCreator`, `roles/resourcemanager.folderAdmin`. Empty folder deleted via v3 REST API (`gcloud resource-manager folders delete` returned `INVALID_ARGUMENT`):

```bash
curl -X DELETE \
  "https://cloudresourcemanager.googleapis.com/v3/folders/878080533360" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "X-Goog-User-Project: chatbot-template-eikasia"
```

Folder entered `DELETE_REQUESTED` state; hard-deletes after 30 days.

**Firebase CLI findings (observed 2026-04-07):** Six operational gotchas when running `firebase init apphosting` on a fresh workstation. Will recur on every new workstation — see `CHATBOT_TEMPLATE_CONSOLE_SKILL.md` for the canonical bootstrap procedure.

1. **Node version:** Firebase CLI v15 requires Node ≥20. Fix: `nvm use 20` before any Firebase command.
2. **`firebase use` order:** `firebase use --add` errors on a virgin directory. Run `firebase init apphosting` first (writes `.firebaserc`), then `firebase use`.
3. **Stale auth:** `firebase login` may claim success but 401 on API calls. Always use `firebase login --reauth` on a fresh setup.
4. **Folder picker gap:** Only org-root projects appear in the `firebase init apphosting` picker — confirmed root cause of the org placement move.
5. **Wrong wizard branch:** After running `:addFirebase` via REST, use "Use an existing project" (not "Add Firebase to a GCP project") in the first wizard prompt.
6. **Terminology trap:** Firebase App Hosting "backend" = the managed Cloud Run + CDN hosting the Next.js frontend, NOT the FastAPI Cloud Run service. Choose "Create a new backend" on a fresh setup.
