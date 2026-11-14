// Unified Patient Journey frontend. Uses the FastAPI backend; no patient data is stored in localStorage.
const API_BASE = window.SWASTHYASETU_API || "http://127.0.0.1:8000";
const STAGES = ["Registration", "HealthGuard", "MaternalCare", "MediReach", "Referral", "Follow-up"];
let activeJourneyId = null;
let activeJourney = null;
const demoUser = JSON.parse(localStorage.getItem("ss_demo_user") || "null");
const demoToken = localStorage.getItem("ss_demo_token");
const canCoordinate = demoUser && ["health_worker", "admin"].includes(demoUser.role);
if (!demoToken || !demoUser) window.location.href = "auth.html";

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}), ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`);
  return body;
}

function applyRoleUI() {
  const roleLabel = document.getElementById("currentRoleLabel");
  if (roleLabel && demoUser) roleLabel.textContent = `${demoUser.name} · ${demoUser.role.replace("_", " ")}`;
  if (!canCoordinate) {
    ["eventForm", "referralForm"].forEach(id => { const node = $(id); if (node) node.hidden = true; });
    const hint = document.getElementById("patientReadOnlyHint");
    if (hint) hint.hidden = false;
  }
}

function showMessage(message, type = "") {
  const el = $("formMessage");
  el.textContent = message;
  el.className = `message ${type}`;
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

async function loadJourneys() {
  const list = $("journeyList");
  list.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const journeys = await api("/api/journeys");
    $("journeyTotal").textContent = journeys.length;
    $("openReferralTotal").textContent = journeys.reduce((sum, item) => sum + Number(item.open_referrals || 0), 0);
    if (!journeys.length) {
      list.innerHTML = '<p class="empty-state">No demo journeys yet. Create the first one using the form.</p>';
      return;
    }
    list.innerHTML = journeys.map(item => `
      <button type="button" class="journey-item ${item.journey_id === activeJourneyId ? "selected" : ""}" data-journey="${esc(item.journey_id)}">
        <strong>${esc(item.name)}</strong>
        <small>${esc(item.journey_id)} · Created ${formatDate(item.created_at)}</small>
        <span class="item-bottom"><span class="pill">${esc(item.current_stage)}</span><small>${Number(item.open_referrals || 0)} open referral(s)</small></span>
      </button>`).join("");
    list.querySelectorAll("[data-journey]").forEach(button => {
      button.addEventListener("click", () => openJourney(button.dataset.journey));
    });
  } catch (error) {
    list.innerHTML = `<p class="empty-state">Could not load journeys: ${esc(error.message)}. Check that the FastAPI server is running.</p>`;
  }
}

async function openJourney(id) {
  try {
    const data = await api(`/api/journeys/${encodeURIComponent(id)}`);
    activeJourneyId = id;
    activeJourney = data;
    renderJourney(data);
    $("detailPanel").hidden = false;
    $("detailPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    await loadJourneys();
  } catch (error) {
    alert(error.message);
  }
}

function renderJourney(data) {
  const patient = data.patient;
  $("detailName").textContent = patient.name;
  $("detailMeta").textContent = `Age: ${patient.age ?? "Not provided"} · Sex: ${patient.sex || "Not provided"} · Created: ${formatDate(patient.created_at)}`;
  $("journeyId").textContent = patient.journey_id;
  renderProgress(data.events || [], patient.current_stage);
  renderEvents(data.events || []);
  renderReferrals(data.referrals || []);
}

function renderProgress(events, currentStage) {
  const latest = {};
  events.forEach(event => { latest[event.stage] = event; });
  const currentIndex = STAGES.indexOf(currentStage);
  $("journeyProgress").innerHTML = STAGES.map((stage, index) => {
    const event = latest[stage];
    let cls = "";
    let label = "Not started";
    if (event && event.status === "Completed") { cls = "done"; label = "Completed"; }
    else if (event && event.status === "In progress") { cls = "current"; label = "In progress"; }
    else if (index === currentIndex) { cls = "current"; label = "Current stage"; }
    else if (index < currentIndex) { cls = "done"; label = "Passed"; }
    return `<div class="progress-step ${cls}">${esc(stage)}<span>${esc(label)}</span></div>`;
  }).join("");
}

function renderEvents(events) {
  const target = $("eventTimeline");
  if (!events.length) {
    target.innerHTML = '<p class="empty-state">No activity recorded yet.</p>';
    return;
  }
  target.innerHTML = [...events].reverse().map(event => `
    <article class="event-item">
      <strong>${esc(event.stage)} · ${esc(event.status)}</strong>
      <p>${esc(event.note || "No additional note")}</p>
      <small>${esc(event.created_at || "")}</small>
    </article>`).join("");
}

function renderReferrals(referrals) {
  const target = $("referralList");
  if (!referrals.length) {
    target.innerHTML = '<p class="empty-state">No referrals created for this demo journey.</p>';
    return;
  }
  target.innerHTML = referrals.map(ref => `
    <article class="referral-card">
      <span class="referral-code">${esc(ref.referral_code)}</span>
      <strong>${esc(ref.facility)}</strong>
      <p>${esc(ref.reason)} · ${formatDate(ref.appointment_date)}</p>
      <label>Referral status
        <select data-referral-id="${Number(ref.id)}">
          ${["New", "Referred", "Appointment scheduled", "Follow-up complete"].map(status =>
            `<option ${ref.status === status ? "selected" : ""}>${esc(status)}</option>`).join("")}
        </select>
      </label>
    </article>`).join("");
  target.querySelectorAll("[data-referral-id]").forEach(select => {
    if (!canCoordinate) { select.disabled = true; return; }
    select.addEventListener("change", async () => {
      try {
        const result = await api(`/api/journeys/${encodeURIComponent(activeJourneyId)}/referrals/${select.dataset.referralId}`, {
          method: "PATCH", body: JSON.stringify({ status: select.value })
        });
        activeJourney = result;
        renderJourney(result);
        await loadJourneys();
      } catch (error) {
        alert(`Could not update referral: ${error.message}`);
        if (activeJourney) renderReferrals(activeJourney.referrals);
      }
    });
  });
}

$("patientForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!$("demoConfirm").checked) return showMessage("Please confirm that the details are fictional.", "error");
  const age = $("patientAge").value;
  const payload = {
    name: $("patientName").value.trim(),
    age: age === "" ? null : Number(age),
    sex: $("patientSex").value || null,
    phone: $("patientPhone").value.trim() || null,
    notes: $("patientNotes").value.trim() || null
  };
  try {
    const result = await api("/api/journeys", { method: "POST", body: JSON.stringify(payload) });
    $("patientForm").reset();
    showMessage(`Created ${result.patient.journey_id}`, "success");
    await loadJourneys();
    await openJourney(result.patient.journey_id);
  } catch (error) {
    showMessage(error.message, "error");
  }
});

$("eventForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeJourneyId) return;
  try {
    const result = await api(`/api/journeys/${encodeURIComponent(activeJourneyId)}/events`, {
      method: "POST",
      body: JSON.stringify({
        stage: $("eventStage").value,
        status: $("eventStatus").value,
        note: $("eventNote").value.trim() || null
      })
    });
    activeJourney = result;
    renderJourney(result);
    $("eventNote").value = "";
    await loadJourneys();
  } catch (error) {
    alert(error.message);
  }
});

$("referralForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeJourneyId) return;
  try {
    const dateValue = $("refDate").value;
    const result = await api(`/api/journeys/${encodeURIComponent(activeJourneyId)}/referrals`, {
      method: "POST",
      body: JSON.stringify({
        facility: $("refFacility").value.trim(),
        reason: $("refReason").value.trim(),
        appointment_date: dateValue || null
      })
    });
    $("referralForm").reset();
    await openJourney(activeJourneyId);
    await loadJourneys();
    alert(`Demo referral created: ${result.referral_code}`);
  } catch (error) {
    alert(error.message);
  }
});

$("refreshBtn").addEventListener("click", loadJourneys);
$("closeDetail").addEventListener("click", () => { $("detailPanel").hidden = true; });
document.addEventListener("DOMContentLoaded", () => { applyRoleUI(); loadJourneys(); });
