(() => {
  const KEY = "ss-demo-referrals-v1";
  const STATUSES = ["New", "Referred", "Appointment scheduled", "Follow-up complete"];
  const dateOffset = days => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const seed = () => [
    { id: "demo-ref-1", caseId: "DEMO-104", facility: "Community Health Center", task: "Missed appointment follow-up", dueDate: dateOffset(-1), status: "New" },
    { id: "demo-ref-2", caseId: "DEMO-218", facility: "District Wellness Center", task: "Routine maternal-care check-in", dueDate: dateOffset(0), status: "Referred" },
    { id: "demo-ref-3", caseId: "DEMO-327", facility: "Primary Care Clinic", task: "Appointment coordination", dueDate: dateOffset(2), status: "Appointment scheduled" },
    { id: "demo-ref-4", caseId: "DEMO-403", facility: "Community Health Center", task: "Post-visit follow-up", dueDate: dateOffset(-4), status: "Follow-up complete" },
  ];
  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (Array.isArray(saved)) return saved;
      const initial = seed();
      localStorage.setItem(KEY, JSON.stringify(initial));
      return initial;
    } catch {
      return seed();
    }
  }
  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* Keep the current view usable if storage is unavailable. */ }
    window.dispatchEvent(new CustomEvent("ss:referrals-changed", { detail: items }));
    return items;
  }
  const api = {
    statuses: STATUSES,
    list: read,
    create(record) {
      const items = read();
      const id = window.crypto?.randomUUID ? crypto.randomUUID() : `demo-ref-${Date.now()}`;
      return write([{ ...record, id }, ...items]);
    },
    update(id, patch) {
      return write(read().map(item => item.id === id ? { ...item, ...patch } : item));
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch { /* Ignore storage restrictions. */ }
      return write(seed());
    },
  };
  window.SSReferralStore = api;
  window.addEventListener("storage", event => {
    if (event.key === KEY) window.dispatchEvent(new CustomEvent("ss:referrals-changed", { detail: read() }));
  });
})();
