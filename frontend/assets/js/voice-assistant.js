(() => {
  if (document.getElementById("ss-voice-assistant")) return;

  const nested = location.pathname.includes("/pages/");
  const pageHref = name => nested ? `${name}.html` : `pages/${name}.html`;
  const apiOrigin = window.SWASTHYASETU_API || (
    ["localhost", "127.0.0.1"].includes(location.hostname)
      ? `${location.protocol}//${location.hostname}:8000`
      : ""
  );

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = nested ? "../assets/css/voice-assistant.css" : "assets/css/voice-assistant.css";
  document.head.appendChild(css);

  const host = document.createElement("section");
  host.id = "ss-voice-assistant";
  host.className = "ssva";
  host.innerHTML = `
    <button class="ssva-launch" type="button" aria-expanded="false" aria-controls="ssva-panel" aria-label="Open voice assistant">Voice help</button>
    <div class="ssva-panel" id="ssva-panel" hidden>
      <header class="ssva-header">
        <div>
          <strong>Setu Assistant</strong>
          <small class="ssva-subtitle">App navigation · LLM-ready</small>
        </div>
        <button type="button" class="ssva-close" aria-label="Close voice assistant">×</button>
      </header>
      <div class="ssva-language-row">
        <label for="ssva-language">Language</label>
        <select id="ssva-language" aria-label="Assistant language">
          <option value="en-IN">English</option>
          <option value="hi-IN">हिन्दी</option>
        </select>
      </div>
      <p class="ssva-disclosure">Mic is optional. Speech recognition may be processed by your browser provider; this app does not save audio or transcripts. No medical advice.</p>
      <div class="ssva-log" role="log" aria-live="polite"><p class="ssva-welcome"></p></div>
      <div class="ssva-quick" aria-label="Quick questions">
        <button type="button" data-query="What can you do?">What can you do?</button>
        <button type="button" data-query="Explain this demo">About this demo</button>
        <button type="button" data-query="Privacy and microphone">Privacy</button>
      </div>
      <form class="ssva-form">
        <label class="ssva-sr" for="ssva-input">Ask about the app or enter a navigation command</label>
        <input id="ssva-input" type="text" autocomplete="off" placeholder="Ask about the app…">
        <button class="ssva-send" type="submit">Ask</button>
      </form>
      <div class="ssva-actions">
        <button type="button" class="ssva-mic">Start microphone</button>
        <button type="button" class="ssva-stop">Stop speech</button>
      </div>
      <p class="ssva-status" aria-live="polite">Ready. Voice recognition depends on browser support.</p>
    </div>`;
  document.body.appendChild(host);

  const panel = host.querySelector(".ssva-panel");
  const launch = host.querySelector(".ssva-launch");
  const input = host.querySelector("#ssva-input");
  const log = host.querySelector(".ssva-log");
  const status = host.querySelector(".ssva-status");
  const mic = host.querySelector(".ssva-mic");
  const languageSelect = host.querySelector("#ssva-language");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let language = localStorage.getItem("ssva-language") === "hi-IN" ? "hi-IN" : "en-IN";
  let chatHistory = [];

  const copy = {
    "en-IN": {
      subtitle: "App navigation · LLM-ready",
      language: "Language",
      disclosure: "Mic is optional. Speech recognition may be processed by your browser provider; this app does not save audio or transcripts. No medical advice.",
      welcome: "Try “open MaternalCare,” “open insights,” or ask what this demo does. Now powered by an LLM-ready backend.",
      label: "Ask about the app or enter a navigation command",
      placeholder: "Ask about the app…",
      ask: "Ask",
      quick: ["What can you do?", "About this demo", "Privacy"],
      mic: "Start microphone",
      stop: "Stop speech",
      ready: "Ready. Backend assistant + optional voice.",
    },
    "hi-IN": {
      subtitle: "ऐप नेविगेशन · LLM-ready",
      language: "भाषा",
      disclosure: "माइक वैकल्पिक है। आवाज़ पहचान आपके ब्राउज़र प्रदाता द्वारा संसाधित हो सकती है; यह ऐप ऑडियो या ट्रांसक्रिप्ट सेव नहीं करता। चिकित्सा सलाह नहीं।",
      welcome: "कहें “डैशबोर्ड खोलो” या “इनसाइट्स खोलो”, अथवा डेमो के बारे में पूछें।",
      label: "ऐप के बारे में पूछें या नेविगेशन निर्देश दें",
      placeholder: "ऐप के बारे में पूछें…",
      ask: "पूछें",
      quick: ["आप क्या कर सकते हैं?", "डेमो के बारे में", "गोपनीयता"],
      mic: "माइक शुरू करें",
      stop: "आवाज़ रोकें",
      ready: "तैयार। बैकएंड असिस्टेंट + वैकल्पिक आवाज़।",
    },
  };

  function applyLanguage() {
    const t = copy[language];
    languageSelect.value = language;
    host.querySelector(".ssva-subtitle").textContent = t.subtitle;
    host.querySelector(".ssva-language-row label").textContent = t.language;
    host.querySelector(".ssva-disclosure").textContent = t.disclosure;
    host.querySelector(".ssva-welcome").textContent = t.welcome;
    host.querySelector(".ssva-sr").textContent = t.label;
    input.placeholder = t.placeholder;
    host.querySelector(".ssva-send").textContent = t.ask;
    host.querySelectorAll(".ssva-quick button").forEach((b, i) => {
      b.textContent = t.quick[i];
      b.dataset.query = t.quick[i];
    });
    host.querySelector(".ssva-stop").textContent = t.stop;
    status.textContent = t.ready;
    if (recognition) recognition.lang = language;
    if (SpeechRecognition) mic.textContent = t.mic;
  }

  languageSelect.addEventListener("change", () => {
    language = languageSelect.value;
    localStorage.setItem("ssva-language", language);
    applyLanguage();
  });

  function openPanel(open) {
    panel.hidden = !open;
    launch.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
  }

  launch.addEventListener("click", () => openPanel(panel.hidden));
  host.querySelector(".ssva-close").addEventListener("click", () => openPanel(false));

  function addMessage(who, text) {
    const message = document.createElement("p");
    message.className = `ssva-message ${who}`;
    message.textContent = text;
    log.appendChild(message);
    log.scrollTop = log.scrollHeight;
  }

  function speak(text) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      window.speechSynthesis.speak(utterance);
    }
  }

  // Local navigation helper (still works even if backend is down)
  const destinations = [
    { terms: ["dashboard", "home", "डैशबोर्ड", "होम"], file: "dashboard", en: "Dashboard", hi: "डैशबोर्ड" },
    { terms: ["maternalcare", "maternal care", "pregnancy", "मातृ देखभाल", "गर्भावस्था"], file: "maternalcare", en: "MaternalCare", hi: "मातृ देखभाल" },
    { terms: ["healthguard", "health guard", "symptom", "हेल्थगार्ड", "स्वास्थ्य जांच"], file: "healthguard", en: "HealthGuard", hi: "हेल्थगार्ड" },
    { terms: ["medireach", "medi reach", "hospital", "facility", "अस्पताल", "मेडिरेच"], file: "medireach", en: "MediReach", hi: "MediReach" },
    { terms: ["insights", "machine learning", "ml demo", "coordination model", "ai insights", "इनसाइट्स", "मशीन लर्निंग"], file: "ml-insights", en: "Care Coordination AI Insights", hi: "केयर कोऑर्डिनेशन AI इनसाइट्स" },
    { terms: ["referral", "referrals", "रेफरल"], file: "referrals", en: "Smart Referral", hi: "स्मार्ट रेफरल" },
    { terms: ["patient journey", "unified journey", "journey", "रोगी यात्रा"], file: "patient-journey", en: "Unified Patient Journey", hi: "यूनिफाइड पेशेंट जर्नी" },
    { terms: ["my workspace", "role dashboard", "workspace", "कार्यस्थान"], file: "role-dashboard", en: "My Workspace", hi: "मेरा कार्यस्थान" },
    { terms: ["admin panel", "administrator panel", "प्रशासक"], file: "admin-panel", en: "Admin Panel", hi: "एडमिन पैनल" },
  ];

  function tryLocalNavigate(raw) {
    const command = raw.toLowerCase().trim();
    const go = /\b(open|go|show|take me|navigate)\b/.test(command) || /(खोलो|खोलें|दिखाओ|जाओ|ले चलो)/.test(command);
    const destination = destinations.find(item => go && item.terms.some(term => command.includes(term)));
    if (destination) {
      const hi = language === "hi-IN";
      const msg = hi ? `${destination.hi} पेज खोल रहा हूँ।` : `Opening ${destination.en}.`;
      addMessage("assistant", msg);
      speak(msg);
      setTimeout(() => { location.href = pageHref(destination.file); }, 600);
      return true;
    }
    return false;
  }

  async function askBackend(raw) {
    if (!apiOrigin) return null;
    try {
      const res = await fetch(`${apiOrigin}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: raw,
          language,
          history: chatHistory.slice(-8),
          context: location.pathname.split("/").pop() || "index",
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  }

  async function respond(raw) {
    const command = raw.trim();
    if (!command) return;
    addMessage("you", raw);

    // Fast local navigation first
    if (tryLocalNavigate(command)) {
      chatHistory.push({ role: "user", content: raw });
      return;
    }

    status.textContent = language === "hi-IN" ? "सोच रहा हूँ…" : "Thinking…";

    // Try LLM-ready backend
    const backend = await askBackend(command);
    if (backend && backend.reply) {
      addMessage("assistant", backend.reply);
      speak(backend.reply);
      chatHistory.push({ role: "user", content: raw });
      chatHistory.push({ role: "assistant", content: backend.reply });
      status.textContent = backend.source === "llm"
        ? (language === "hi-IN" ? "LLM उत्तर" : "LLM reply")
        : (language === "hi-IN" ? "नियम-आधारित उत्तर" : "Rule-based reply");
      return;
    }

    // Ultimate offline fallback
    const hi = language === "hi-IN";
    const fallback = hi
      ? "मैं अभी बैकएंड से जुड़ नहीं पाया। आप पेज नाम कहकर नेविगेट कर सकते हैं, जैसे “डैशबोर्ड खोलो”।"
      : "I could not reach the backend assistant right now. You can still navigate by saying page names, for example “open dashboard”.";
    addMessage("assistant", fallback);
    speak(fallback);
    status.textContent = hi ? "ऑफ़लाइन मोड" : "Offline fallback";
  }

  host.querySelector(".ssva-form").addEventListener("submit", e => {
    e.preventDefault();
    const value = input.value;
    input.value = "";
    respond(value);
  });

  host.querySelectorAll(".ssva-quick button").forEach(btn => {
    btn.addEventListener("click", () => respond(btn.dataset.query || btn.textContent));
  });

  // Speech recognition
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onresult = event => {
      const text = event.results[0][0].transcript;
      input.value = text;
      respond(text);
    };
    recognition.onerror = () => {
      status.textContent = language === "hi-IN" ? "माइक त्रुटि" : "Microphone error";
    };
    recognition.onend = () => {
      status.textContent = copy[language].ready;
    };

    mic.addEventListener("click", () => {
      try {
        recognition.lang = language;
        recognition.start();
        status.textContent = language === "hi-IN" ? "सुन रहा हूँ…" : "Listening…";
      } catch {
        status.textContent = language === "hi-IN" ? "माइक शुरू नहीं हो सका" : "Could not start microphone";
      }
    });
  } else {
    mic.disabled = true;
    mic.textContent = language === "hi-IN" ? "माइक उपलब्ध नहीं" : "Mic not supported";
  }

  host.querySelector(".ssva-stop").addEventListener("click", () => {
    window.speechSynthesis?.cancel();
    recognition?.stop();
    status.textContent = language === "hi-IN" ? "आवाज़ रोक दी गई।" : "Speech stopped.";
  });

  applyLanguage();
})();
