const resultBox = document.getElementById("predictionResult");
const patientGrid = document.getElementById("patientGrid");
const importanceBars = document.getElementById("importanceBars");

const apiOrigin = window.SWASTHYASETU_API || (
  ["localhost", "127.0.0.1"].includes(location.hostname)
    ? `${location.protocol}//${location.hostname}:8000`
    : ""
);

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function addText(tag, text, parent, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  parent.appendChild(node);
  return node;
}

function renderImportance(importance, labels) {
  if (!importance || !Object.keys(importance).length) {
    importanceBars.textContent = "Feature importance not available.";
    return;
  }
  const max = Math.max(...Object.values(importance), 0.01);
  const sorted = Object.entries(importance).sort((a, b) => b[1] - a[1]);
  importanceBars.innerHTML = sorted.map(([key, val]) => {
    const pct = Math.round((val / max) * 100);
    const label = (labels && labels[key]) || key;
    return `
      <div class="imp-row">
        <span class="imp-label">${esc(label)}</span>
        <div class="imp-track"><div class="imp-fill" style="width:${pct}%"></div></div>
        <span class="imp-val">${(val * 100).toFixed(1)}%</span>
      </div>`;
  }).join("");
}

function renderPrediction(data) {
  resultBox.replaceChildren();
  const badge = document.createElement("div");
  badge.className = `result-badge ${data.category_key || ""}`;
  badge.innerHTML = `<strong>${esc(data.category)}</strong>
    <span>Coordination-load index: <b>${data.coordination_load_index}</b></span>`;
  resultBox.appendChild(badge);

  if (data.suggested_action) {
    const action = document.createElement("div");
    action.className = "suggested-action";
    action.innerHTML = `<span class="action-label">Suggested next step</span>
      <p>${esc(data.suggested_action)}</p>`;
    resultBox.appendChild(action);
  }

  if (data.explanations && data.explanations.length) {
    const expTitle = document.createElement("h4");
    expTitle.textContent = "What drove this score";
    resultBox.appendChild(expTitle);

    const list = document.createElement("div");
    list.className = "contrib-list";
    data.explanations.forEach(e => {
      const row = document.createElement("div");
      row.className = "contrib-row";
      const sign = e.contribution >= 0 ? "+" : "";
      row.innerHTML = `
        <span class="contrib-label">${esc(e.label)} <small>(${e.value})</small></span>
        <span class="contrib-val ${e.contribution >= 0 ? "pos" : "neg"}">${sign}${e.contribution}</span>`;
      list.appendChild(row);
    });
    resultBox.appendChild(list);
  }

  const notice = document.createElement("p");
  notice.className = "mini-notice";
  notice.textContent = data.notice || "Synthetic demonstration only — not a clinical score.";
  resultBox.appendChild(notice);
}

function renderPatient(patient) {
  const card = document.createElement("article");
  card.className = "patient-card";
  const pred = patient.prediction || {};

  const header = document.createElement("header");
  addText("h3", patient.name || patient.demo_id, header);
  addText("span", pred.category || "—", header, `badge ${pred.category_key || ""}`);
  card.appendChild(header);

  const idLine = document.createElement("p");
  idLine.className = "demo-id";
  idLine.textContent = patient.demo_id;
  card.appendChild(idLine);

  const scores = document.createElement("div");
  scores.className = "patient-stats";
  const feats = patient.features || {};
  const statValues = [
    [feats.days_since_last_contact, "days since contact"],
    [feats.missed_appointments_90d, "missed visits"],
    [feats.open_follow_up_tasks, "open tasks"],
    [feats.previous_escalations, "escalations"],
  ];
  for (const [value, label] of statValues) {
    const stat = document.createElement("div");
    addText("strong", String(value ?? "—"), stat);
    addText("span", label, stat);
    scores.appendChild(stat);
  }
  card.appendChild(scores);

  addText("p",
    `Index: ${pred.coordination_load_index ?? "—"} · ${pred.suggested_action ? pred.suggested_action.slice(0, 90) + "…" : ""}`,
    card, "card-action");

  if (pred.top_drivers && pred.top_drivers.length) {
    const drivers = document.createElement("p");
    drivers.className = "top-drivers";
    drivers.textContent = "Top drivers: " + pred.top_drivers.join(", ");
    card.appendChild(drivers);
  }

  const details = document.createElement("details");
  addText("summary", "View fictional history", details);
  const list = document.createElement("ul");
  (patient.history || []).forEach(event => addText("li", event, list));
  details.appendChild(list);
  card.appendChild(details);

  return card;
}

async function loadDemoCases() {
  try {
    const response = await fetch(`${apiOrigin}/api/insights/demo-patients`);
    if (!response.ok) throw new Error("Could not load demo histories.");
    const data = await response.json();

    document.getElementById("modelTitle").textContent = data.model || "Explainable model";
    document.getElementById("trainingCount").textContent = `${data.training_examples || "—"} synthetic examples`;
    document.getElementById("engineBadge").textContent = data.using_sklearn
      ? "scikit-learn RandomForest"
      : "Pure-Python ensemble";

    renderImportance(data.feature_importance, data.feature_labels);

    patientGrid.replaceChildren();
    (data.patients || []).forEach(p => patientGrid.appendChild(renderPatient(p)));
  } catch (error) {
    patientGrid.textContent = `${error.message} Check that the backend is running at ${apiOrigin || "the configured API"}.`;
    importanceBars.textContent = "Unable to load feature importance.";
  }
}

document.getElementById("predictForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Running AI…";
  resultBox.textContent = "Calculating explainable prediction…";
  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    Object.keys(payload).forEach(k => { payload[k] = Number(payload[k]); });
    const response = await fetch(`${apiOrigin}/api/insights/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Prediction request failed.");
    renderPrediction(data);
  } catch (error) {
    resultBox.textContent = `Unable to run the demo prediction: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Run AI prediction";
  }
});

loadDemoCases();
