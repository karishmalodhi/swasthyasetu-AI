# SwasthyaSetu AI – Demo Guide & LLM Setup

## Quick start (judges / live demo)

```bash
# 1. Install
pip install -r backend/requirements.txt
# Optional stronger ML:
# pip install scikit-learn numpy

# 2. Run backend
uvicorn backend.main:app --reload

# 3. Serve frontend with VS Code Live Server (or any static server)
#    Open: frontend/pages/auth.html
```

### Demo accounts
| Role          | Email                        | Password        |
|---------------|------------------------------|-----------------|
| Administrator | admin@demo.swasthyasetu      | AdminDemo123!   |
| Health Worker | worker@demo.swasthyasetu     | WorkerDemo123!  |

### Recommended live flow (4–6 minutes)
1. **Login** as Administrator.
2. **Admin Panel** → click **Seed demo data** (creates 6 fictional journeys + referrals).
3. Show **AI Operational Briefing** and **Impact** cards.
4. Open **AI Insights** → run a live prediction → show feature contributions + suggested action.
5. Open **Setu Assistant** (voice or text) → “What can you do?” / “Open patient journey”.
6. Optional: switch to Health Worker account and show role-limited workspace.

---

## LLM-ready Setu Assistant

The assistant already works offline with a high-quality bilingual rule engine.

To plug in a **real LLM** (optional):

### Option A – Ollama (local, free)
```bash
# Install Ollama, then:
ollama pull llama3.2
export SWASTHYASETU_LLM_ENDPOINT=http://localhost:11434/v1/chat/completions
export SWASTHYASETU_LLM_MODEL=llama3.2
uvicorn backend.main:app --reload
```

### Option B – Groq (free tier, fast)
```bash
export SWASTHYASETU_LLM_ENDPOINT=https://api.groq.com/openai/v1/chat/completions
export SWASTHYASETU_LLM_API_KEY=gsk_your_key_here
export SWASTHYASETU_LLM_MODEL=llama-3.1-8b-instant
uvicorn backend.main:app --reload
```

### Option C – Google Gemini (via OpenAI-compatible proxy or direct)
Adapt the `_call_llm` function in `backend/routes/assistant.py` if the endpoint format differs.

After setting the variables, restart the backend.  
`GET /api/assistant/status` will report whether an LLM is configured.

---

## Safety reminders (say these in the pitch)
- All patient records and ML training data are **100% synthetic**.
- The coordination model does **not** predict disease or clinical risk.
- The assistant **never** gives medical advice.
- This is a hackathon prototype, not a production clinical system.

## Key differentiators to highlight
1. Explainable AI (feature importance + per-prediction contributions)
2. LLM-ready bilingual assistant with safe fallback
3. Role-based access (patient / health worker / admin)
4. One-click demo seed for reliable live presentations
5. Rural / last-mile care coordination narrative
