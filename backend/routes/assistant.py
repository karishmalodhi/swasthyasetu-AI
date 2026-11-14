"""
SwasthyaSetu AI – LLM-ready Setu Assistant

Structure designed so a real LLM (Gemini, Groq, OpenAI, Ollama, etc.)
can be plugged in later by implementing `_call_llm()`.

Current behaviour:
- Smart rule-based + context-aware responses (works offline)
- Bilingual (English / Hindi)
- Ready for LLM by setting environment variable SWASTHYASETU_LLM_ENDPOINT
  or implementing the _call_llm helper.

Never gives medical advice. Always stays inside the demo scope.
"""

from __future__ import annotations

import os
import re
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/assistant", tags=["Setu Assistant"])

# ---------------------------------------------------------------------------
# Configuration – easy to switch to real LLM later
# ---------------------------------------------------------------------------
LLM_ENDPOINT = os.getenv("SWASTHYASETU_LLM_ENDPOINT")  # e.g. http://localhost:11434/api/generate
LLM_API_KEY = os.getenv("SWASTHYASETU_LLM_API_KEY", "")
LLM_MODEL = os.getenv("SWASTHYASETU_LLM_MODEL", "llama3.2")  # or gemini-flash etc.


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=800)
    language: str = Field(default="en-IN", pattern="^(en-IN|hi-IN)$")
    history: list[ChatMessage] = Field(default_factory=list, max_length=12)
    context: Optional[str] = Field(default=None, max_length=400)  # page context


class ChatResponse(BaseModel):
    reply: str
    language: str
    source: str  # "rules" | "llm"
    suggested_actions: list[str] = []
    disclaimer: str = "This assistant helps navigate the SwasthyaSetu demo. It does not provide medical advice."


# ---------------------------------------------------------------------------
# System prompt (used when real LLM is connected)
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are Setu, the helpful assistant inside the SwasthyaSetu AI healthcare coordination prototype.

STRICT RULES:
- You only help users navigate the demo app and explain its features.
- You NEVER give medical advice, diagnoses, treatment suggestions, or interpret real symptoms.
- All patient data in this system is synthetic / fictional.
- Keep answers concise (2-4 sentences).
- Support both English and Hindi.
- If asked about real health problems, politely redirect: "I can only help with the demo application. Please consult a qualified health professional."

Available pages you can guide users to:
- Dashboard, MaternalCare, HealthGuard, MediReach
- ML Insights / Care Coordination AI
- Smart Referral, Unified Patient Journey
- My Workspace (role dashboard), Admin Panel, Auth

Be friendly, clear, and safety-conscious.
"""


# ---------------------------------------------------------------------------
# Rule-based brain (always available)
# ---------------------------------------------------------------------------
DESTINATIONS = {
    "dashboard": {"en": "Dashboard", "hi": "डैशबोर्ड", "file": "dashboard"},
    "maternal": {"en": "MaternalCare", "hi": "मातृ देखभाल", "file": "maternalcare"},
    "healthguard": {"en": "HealthGuard", "hi": "हेल्थगार्ड", "file": "healthguard"},
    "medireach": {"en": "MediReach", "hi": "MediReach", "file": "medireach"},
    "insights": {"en": "Care Coordination AI Insights", "hi": "केयर कोऑर्डिनेशन AI इनसाइट्स", "file": "ml-insights"},
    "referral": {"en": "Smart Referral", "hi": "स्मार्ट रेफरल", "file": "referrals"},
    "journey": {"en": "Unified Patient Journey", "hi": "यूनिफाइड पेशेंट जर्नी", "file": "patient-journey"},
    "workspace": {"en": "My Workspace", "hi": "मेरा कार्यस्थान", "file": "role-dashboard"},
    "admin": {"en": "Admin Panel", "hi": "एडमिन पैनल", "file": "admin-panel"},
}


def _detect_intent(text: str, lang: str) -> tuple[str, dict]:
    t = text.lower().strip()

    # Navigation
    nav_patterns = [
        (r"(open|go to|show|take me|navigate|खोलो|दिखाओ|जाओ).{0,20}(dashboard|home|डैशबोर्ड)", "nav", "dashboard"),
        (r"(open|go|show|खोलो|दिखाओ).{0,20}(maternal|pregnancy|मातृ|गर्भ)", "nav", "maternal"),
        (r"(open|go|show|खोलो).{0,20}(healthguard|health guard|हेल्थगार्ड|symptom)", "nav", "healthguard"),
        (r"(open|go|show|खोलो).{0,20}(medireach|hospital|facility|अस्पताल)", "nav", "medireach"),
        (r"(open|go|show|खोलो).{0,20}(insight|ml|machine learning|coordination|इनसाइट|मशीन)", "nav", "insights"),
        (r"(open|go|show|खोलो).{0,20}(referral|referrals|रेफरल)", "nav", "referral"),
        (r"(open|go|show|खोलो).{0,20}(journey|patient journey|यात्रा)", "nav", "journey"),
        (r"(open|go|show|खोलो).{0,20}(workspace|role dashboard|कार्यस्थान)", "nav", "workspace"),
        (r"(open|go|show|खोलो).{0,20}(admin|administrator|प्रशासक)", "nav", "admin"),
    ]
    for pattern, intent, key in nav_patterns:
        if re.search(pattern, t):
            return intent, DESTINATIONS[key]

    # Help / capabilities
    if re.search(r"(what can you do|help|commands|क्या कर सकते|मदद|कमांड)", t):
        return "help", {}

    # About the project
    if re.search(r"(what is|about|explain).{0,25}(swasthyasetu|this app|this demo|project)|डेमो|प्रोजेक्ट|ऐप.*(क्या|बताओ)", t):
        return "about", {}

    # Privacy
    if re.search(r"(privacy|microphone|data|security|गोपनीयता|माइक|डेटा)", t):
        return "privacy", {}

    # Medical advice guard
    if re.search(r"(diagnose|treatment|medicine|symptom|pain|fever|pregnant|disease|इलाज|दवा|लक्षण|बुखार|गर्भवती)", t):
        return "no_medical", {}

    # ML / AI explanation
    if re.search(r"(how does|explain).{0,20}(model|ml|ai|prediction|insight)|मॉडल|एआई|प्रेडिक्शन", t):
        return "ml_explain", {}

    return "fallback", {}


def _rule_reply(message: str, language: str, context: Optional[str] = None) -> ChatResponse:
    intent, data = _detect_intent(message, language)
    hi = language == "hi-IN"

    if intent == "nav":
        name = data["hi"] if hi else data["en"]
        reply = f"{name} पेज खोलने के लिए तैयार हूँ। नेविगेशन लिंक का उपयोग करें।" if hi else f"You can open the {name} page from the navigation menu."
        return ChatResponse(
            reply=reply,
            language=language,
            source="rules",
            suggested_actions=[f"Go to {data['en']}"],
        )

    if intent == "help":
        reply = (
            "मैं डैशबोर्ड, मातृ देखभाल, हेल्थगार्ड, MediReach, AI इनसाइट्स, स्मार्ट रेफरल, पेशेंट जर्नी, वर्कस्पेस और एडमिन पैनल खोलने में मदद कर सकता हूँ। "
            "मैं डेमो की विशेषताओं के बारे में भी बता सकता हूँ। चिकित्सा सलाह नहीं देता।"
            if hi else
            "I can help you open Dashboard, MaternalCare, HealthGuard, MediReach, AI Insights, Smart Referral, Patient Journey, Workspace and Admin Panel. "
            "I can also explain the demo features. I never give medical advice."
        )
        return ChatResponse(reply=reply, language=language, source="rules")

    if intent == "about":
        reply = (
            "SwasthyaSetu AI एक स्वास्थ्य समन्वय प्रोटोटाइप है जो ग्रामीण और अंतिम-मील देखभाल को जोड़ने में मदद करता है। "
            "सभी मरीज़ डेटा काल्पनिक है। यह नैदानिक प्रणाली नहीं है।"
            if hi else
            "SwasthyaSetu AI is a healthcare coordination prototype focused on last-mile and rural care pathways. "
            "All patient records are synthetic. This is not a clinical system."
        )
        return ChatResponse(reply=reply, language=language, source="rules")

    if intent == "privacy":
        reply = (
            "माइक्रोफ़ोन वैकल्पिक है। आवाज़ पहचान ब्राउज़र प्रदाता द्वारा संसाधित हो सकती है। यह ऐप ऑडियो या ट्रांसक्रिप्ट सेव नहीं करता। "
            "कोई वास्तविक मरीज़ डेटा दर्ज न करें।"
            if hi else
            "The microphone is optional. Speech recognition may be processed by your browser provider. "
            "This app does not store audio or transcripts. Never enter real patient data."
        )
        return ChatResponse(reply=reply, language=language, source="rules")

    if intent == "no_medical":
        reply = (
            "मैं केवल डेमो ऐप में मदद कर सकता हूँ। कृपया वास्तविक स्वास्थ्य समस्याओं के लिए योग्य चिकित्सक से सलाह लें।"
            if hi else
            "I can only help with the demo application. For any real health concern, please consult a qualified healthcare professional."
        )
        return ChatResponse(reply=reply, language=language, source="rules")

    if intent == "ml_explain":
        reply = (
            "AI इनसाइट्स पेज एक सिंथेटिक कोऑर्डिनेशन-लोड मॉडल दिखाता है। यह दिनों से संपर्क, छूटी हुई अपॉइंटमेंट और खुले कार्यों जैसे संकेतों का उपयोग करता है। "
            "यह बीमारी का पूर्वानुमान नहीं लगाता — केवल परिचालन प्राथमिकता का डेमो है।"
            if hi else
            "The AI Insights page demonstrates a synthetic coordination-load model. It uses signals such as days since contact, missed appointments and open tasks. "
            "It does not predict disease — it only shows operational prioritisation for the demo."
        )
        return ChatResponse(reply=reply, language=language, source="rules")

    # Fallback
    reply = (
        "मैं डेमो नेविगेशन और ऐप की जानकारी में मदद कर सकता हूँ। आप पूछ सकते हैं: “डैशबोर्ड खोलो”, “यह डेमो क्या है?”, या “प्राइवेसी बताओ”।"
        if hi else
        "I can help with demo navigation and app information. Try: “Open dashboard”, “What is this demo?”, or “Tell me about privacy”."
    )
    return ChatResponse(reply=reply, language=language, source="rules")


# ---------------------------------------------------------------------------
# LLM hook (ready for real integration)
# ---------------------------------------------------------------------------
async def _call_llm(messages: list[dict], language: str) -> Optional[str]:
    """
    Placeholder for real LLM call.
    To activate:
      1. Set SWASTHYASETU_LLM_ENDPOINT
      2. Implement the HTTP call below (OpenAI-compatible, Ollama, Groq, Gemini, etc.)
    Returns None if LLM is not configured or fails → falls back to rules.
    """
    if not LLM_ENDPOINT:
        return None

    # Example skeleton (uncomment + adapt when you have a real endpoint):
    #
    # import httpx
    # headers = {"Authorization": f"Bearer {LLM_API_KEY}"} if LLM_API_KEY else {}
    # payload = {
    #     "model": LLM_MODEL,
    #     "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages,
    #     "temperature": 0.3,
    #     "max_tokens": 280,
    # }
    # async with httpx.AsyncClient(timeout=20) as client:
    #     r = await client.post(LLM_ENDPOINT, json=payload, headers=headers)
    #     r.raise_for_status()
    #     data = r.json()
    #     return data["choices"][0]["message"]["content"]
    #
    return None


# ---------------------------------------------------------------------------
# Public endpoint
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # Build message list for potential LLM
    messages = [{"role": m.role, "content": m.content} for m in req.history[-8:]]
    messages.append({"role": "user", "content": req.message})

    # Try LLM first
    llm_reply = await _call_llm(messages, req.language)
    if llm_reply:
        return ChatResponse(
            reply=llm_reply.strip(),
            language=req.language,
            source="llm",
            suggested_actions=[],
        )

    # Fallback to high-quality rules
    return _rule_reply(req.message, req.language, req.context)


@router.get("/status")
def assistant_status():
    return {
        "llm_configured": bool(LLM_ENDPOINT),
        "model": LLM_MODEL if LLM_ENDPOINT else None,
        "mode": "llm-ready (rules active)" if not LLM_ENDPOINT else "llm",
        "supported_languages": ["en-IN", "hi-IN"],
        "note": "Set SWASTHYASETU_LLM_ENDPOINT to enable a real LLM backend.",
    }
