# SwasthyaSetu AI – Unified Patient Journey upgrade

## What was added
- `backend/routes/patient_journey.py`: REST API for demo journeys, event history, and referral status.
- Three additive SQLite tables: `demo_patients`, `journey_events`, and `journey_referrals`.
- `frontend/pages/patient-journey.html`: unified journey workspace.
- `frontend/assets/css/patient-journey.css`: responsive styling.
- `frontend/assets/js/patient-journey.js`: API-connected frontend.
- Dashboard now includes a browser-local care-coordination overview and links to both referral experiences.
- `frontend/pages/referrals.html` is a separate synthetic referral tracker; the server-backed workflow remains at `patient-journey.html`.

Existing HealthGuard, MaternalCare, MediReach, ML demo, admin panel, authentication, role workspace, patient journey, and bilingual assistant files were retained. The bilingual assistant is also available on Admin Panel and My Workspace.

## Run on Windows
1. Extract the ZIP.
2. Open the extracted `swasthyasetu-AI` folder in VS Code.
3. Open a terminal at the project root (the folder containing `backend` and `frontend`).
4. Install dependencies:
   `py -m pip install -r backend/requirements.txt`
5. Start the backend:
   `py -m uvicorn backend.main:app --reload`
6. Confirm the API is running at `http://127.0.0.1:8000/health`.
7. Open the `frontend` folder with VS Code Live Server. Do not open the HTML using `file://`.
8. Open `pages/dashboard.html`; choose **Smart Referral** for browser-local sample follow-ups or **Unified Patient Journey** for the authenticated, server-backed demo workflow.
9. API docs are available at `http://127.0.0.1:8000/docs`.

## API routes
- `POST /api/journeys` – create a demo patient journey.
- `GET /api/journeys` – list demo journeys.
- `GET /api/journeys/{journey_id}` – journey detail, activity, and referrals.
- `POST /api/journeys/{journey_id}/events` – add a journey activity.
- `POST /api/journeys/{journey_id}/referrals` – create a demo referral.
- `PATCH /api/journeys/{journey_id}/referrals/{referral_id}` – update referral status.

## Demo safety
This is a software demonstration, not a clinical system. Use fictional names and fictional phone numbers only. Do not enter real patient details, symptoms, diagnoses, or other sensitive health information. There is no authentication or role-based authorization on these new demo endpoints; do not expose them publicly. The app does not make clinical decisions or confirm real appointments.

## Advanced upgrade: demo role-based access control (RBAC)

This update adds a **prototype-only** role system for the Unified Patient Journey:

- `patient`: can register/login, create their own fictional journey, and read only journeys owned by their account.
- `health_worker`: can view all demo journeys and add journey activity / create and update demo referrals.
- `admin`: has health-worker coordination permissions plus access to aggregate demo account and referral counts.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Health Worker | `worker@demo.swasthyasetu` | `WorkerDemo123!` |
| Admin | `admin@demo.swasthyasetu` | `AdminDemo123!` |

New registrations are always assigned the `patient` role. The public registration request cannot select a staff role.

### New / updated files

- `backend/security.py` — password hashing, signed bearer tokens and role dependencies.
- `backend/routes/auth.py` — registration, login, current-user and admin summary APIs.
- `backend/database.py` — additive `app_users` table and `owner_user_id` migration on `demo_patients`.
- `backend/routes/patient_journey.py` — authenticated routes, patient ownership filtering and staff-only coordination writes.
- `backend/main.py` — registers the authentication router.
- `frontend/assets/js/auth.js` — uses backend registration/login instead of fake frontend-only login.
- `frontend/pages/role-dashboard.html` and `frontend/assets/js/role-dashboard.js` — role-specific workspace and permissions.
- `frontend/assets/css/role-dashboard.css` — workspace styling.
- `frontend/pages/auth.html`, `frontend/pages/patient-journey.html`, `frontend/assets/js/patient-journey.js`, `frontend/assets/css/patient-journey.css` — role-aware forms, navigation and bearer token use.

### Run locally

From the project root:

```bash
py -m pip install -r backend/requirements.txt
py -m uvicorn backend.main:app --reload
```

Serve the `frontend` folder with VS Code Live Server and open `pages/auth.html`. The browser frontend defaults to `http://127.0.0.1:8000` for the API. Change `window.SWASTHYASETU_API` before the page scripts if your backend uses another address.

After login, the app opens `pages/role-dashboard.html`. Patient journeys are at `pages/patient-journey.html`.

### API access rules

- `POST /api/auth/register`: public; always creates a patient.
- `POST /api/auth/login`: public; returns a bearer token.
- `GET /api/auth/me`: any signed-in role.
- `GET /api/auth/admin/summary`: admin only.
- `GET /api/journeys` and `GET /api/journeys/{journey_id}`: signed-in; patients are restricted to their own journeys.
- `POST /api/journeys`: signed-in; patient-created journeys are assigned to that patient.
- Journey event and referral create/update endpoints: health worker or admin only.

### Backward compatibility and limitations

The migration only adds `app_users` and `demo_patients.owner_user_id`; existing maternal, health-metric, ML-demo and referral tables are not dropped or rewritten. Existing pre-RBAC demo journeys have no owner and remain visible to staff/admin, not to patient accounts. This RBAC layer currently protects the Unified Patient Journey APIs and admin summary; it does **not** yet secure every legacy module/API or replace the existing app-wide authorization model.

This is not production authentication. The fallback signing secret is deliberately labelled demo-only; set `SWASTHYASETU_DEMO_SECRET` to a long random secret for local testing. Tokens are stored in browser localStorage and are not revocable before expiry. Before any real deployment, use HTTPS, secure HttpOnly cookies or a reviewed identity provider, secret management, token revocation, rate limiting, CSRF/XSS protections, audit logging, strict CORS, database access controls, and a privacy/security review. Do not enter real patient data.

## Admin Panel 2.0 (demo)

The administrator workspace is available at `frontend/pages/admin-panel.html` after signing in with the seeded administrator account. It adds:

- Account directory with role changes and account activation/deactivation.
- Health-worker assignment for fictional patient journeys.
- Referral counts grouped by workflow status.
- Recent activity log for account changes, worker assignments, journey events and referral actions.
- Server-side administrator-only APIs under `/api/admin`.

Database startup performs additive migrations for `app_users.is_active`, `demo_patients.assigned_worker_id`, and the `activity_logs` table. Existing tables and other modules are retained. At least one active administrator must remain; an administrator cannot deactivate their own account. A role change or deactivation invalidates the affected account's existing bearer token on its next API request.

The admin panel is a local demonstration feature, not a production identity-management or clinical administration system. The existing legacy module APIs have not all been brought under RBAC; do not expose this prototype to real users or enter real patient data.

## Merged coordination features

- The dashboard summary shows counts and recent rows from the **browser-local Smart Referral tracker**. Its synthetic entries are stored in localStorage and are not sent to the backend or included in Admin Panel referral analytics.
- The Smart Referral page accepts only synthetic case IDs (for example, `DEMO-500`), a facility, a non-clinical coordination task, and a due date. It supports search, status filtering, workflow updates, and restoring sample entries.
- **Unified Patient Journey** remains the distinct authenticated API-backed workflow with its existing role permissions. Both workflows are demonstration features; use fictional information only.
- The bilingual Setu Assistant remains rule-based for app navigation and FAQs. Browser speech recognition is optional and may be processed by the browser provider; the app does not save audio or transcripts.

The distributed merged ZIP omits the uploaded SQLite file. On first backend start, `create_tables()` creates a fresh local database and seeds the fictional health-worker and administrator demo accounts described above. Existing database contents from the uploaded archive are not included in the output ZIP.

---

## Full AI Upgrade (v2.0)

### Explainable Care-Coordination ML
- New multi-feature model (5 operational signals)
- Global feature importance + per-prediction contributions
- Suggested next-action text for every prediction
- Uses scikit-learn RandomForest when available; otherwise a pure-Python explainable ensemble
- Endpoints:
  - `GET /api/insights/demo-patients`
  - `POST /api/insights/predict`
  - `GET /api/insights/model-info`

### LLM-ready Setu Assistant
- New backend: `POST /api/assistant/chat`
- Structure ready for real LLMs (Gemini, Groq, Ollama, OpenAI-compatible)
- Activate by setting environment variables:
  - `SWASTHYASETU_LLM_ENDPOINT`
  - `SWASTHYASETU_LLM_API_KEY` (optional)
  - `SWASTHYASETU_LLM_MODEL`
- High-quality bilingual rule engine is the default fallback
- Frontend voice assistant now calls the backend and keeps offline navigation

### How to enable a real LLM later
1. Run any OpenAI-compatible server (Ollama, Groq, vLLM, etc.)
2. Export:
   ```bash
   export SWASTHYASETU_LLM_ENDPOINT=http://localhost:11434/v1/chat/completions
   export SWASTHYASETU_LLM_MODEL=llama3.2
   ```
3. Restart the FastAPI backend. The assistant will automatically prefer the LLM.

### Demo safety (unchanged)
All ML targets and patient records remain 100% synthetic. The system never claims clinical validity.

### Admin Panel AI Briefing & Impact (latest)
- `GET /api/admin/overview` now returns:
  - `ai_summary` – rule-based operational briefing (headline + bullets + fairness note)
  - `impact` – journeys created, referrals tracked, worker coverage %, active staff
  - `role_distribution` – count of accounts by role
- Admin Panel UI shows:
  - AI Operational Briefing card
  - Demo Impact snapshot
  - Role distribution pills
