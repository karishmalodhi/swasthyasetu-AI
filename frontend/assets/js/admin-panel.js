const API_BASE = window.SWASTHYASETU_API || "http://127.0.0.1:8000";
const token = localStorage.getItem("ss_demo_token");
const cachedUser = JSON.parse(localStorage.getItem("ss_demo_user") || "null");
const messageEl = document.getElementById("message");

if (!token || !cachedUser) window.location.href = "auth.html";

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}

function say(text, error = false) {
  messageEl.textContent = text;
  messageEl.style.color = error ? "#a04430" : "#14747a";
}

function renderStats(c) {
  document.getElementById("stats").innerHTML = [
    [c.users, "Total accounts"],
    [c.active_workers, "Active workers"],
    [c.journeys, "Demo journeys"],
    [c.open_referrals, "Open referrals"],
  ]
    .map(([n, l]) => `<article><strong>${n ?? 0}</strong><span>${l}</span></article>`)
    .join("");
}

function renderAiSummary(summary) {
  if (!summary) return;
  const headline = document.getElementById("aiHeadline");
  const bullets = document.getElementById("aiBullets");
  const fairness = document.getElementById("aiFairness");

  headline.textContent = summary.headline || "Operational summary unavailable.";
  bullets.innerHTML = (summary.bullets || [])
    .map(b => `<li>${esc(b)}</li>`)
    .join("");
  fairness.textContent = summary.fairness_note
    ? `Balance note: ${summary.fairness_note}`
    : "";
}

function renderImpact(impact, roleDist) {
  const grid = document.getElementById("impactGrid");
  if (impact) {
    grid.innerHTML = [
      [impact.demo_journeys_created, "Journeys created"],
      [impact.referrals_tracked, "Referrals tracked"],
      [`${impact.worker_coverage_pct ?? 0}%`, "Worker coverage"],
      [impact.active_staff, "Active staff"],
    ]
      .map(([n, l]) => `<div class="impact-item"><strong>${n ?? 0}</strong><span>${l}</span></div>`)
      .join("");
  }

  const roleEl = document.getElementById("roleDist");
  if (roleDist && roleDist.length) {
    roleEl.innerHTML =
      "<span class='role-label'>Role distribution:</span> " +
      roleDist
        .map(r => `<span class="role-pill">${esc(r.role)} <b>${r.count}</b></span>`)
        .join(" ");
  } else {
    roleEl.innerHTML = "";
  }
}

async function loadUsers() {
  const users = await api("/api/admin/users");
  document.getElementById("usersBody").innerHTML =
    users
      .map(
        u => `<tr data-user="${u.id}">
      <td><b>${esc(u.name)}</b><small>${esc(u.email)}</small></td>
      <td>
        <select class="role-select">
          <option value="patient" ${u.role === "patient" ? "selected" : ""}>Patient</option>
          <option value="health_worker" ${u.role === "health_worker" ? "selected" : ""}>Health Worker</option>
          <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
      </td>
      <td>${u.is_active ? "Active" : "Inactive"}</td>
      <td>
        <button class="save-user">Save changes</button>
        <button class="toggle-user" data-active="${u.is_active ? "0" : "1"}">
          ${u.is_active ? "Deactivate" : "Activate"}
        </button>
      </td>
    </tr>`
      )
      .join("") || `<tr><td colspan="4">No accounts found.</td></tr>`;

  document.querySelectorAll(".save-user").forEach(btn =>
    btn.addEventListener("click", async () => {
      const tr = btn.closest("tr");
      try {
        await api(`/api/admin/users/${tr.dataset.user}`, {
          method: "PATCH",
          body: JSON.stringify({ role: tr.querySelector(".role-select").value }),
        });
        say("Account role updated. The account must sign in again.");
        await loadUsers();
      } catch (e) {
        say(e.message, true);
      }
    })
  );

  document.querySelectorAll(".toggle-user").forEach(btn =>
    btn.addEventListener("click", async () => {
      const tr = btn.closest("tr");
      try {
        await api(`/api/admin/users/${tr.dataset.user}`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: btn.dataset.active === "1" }),
        });
        say("Account status updated.");
        await loadUsers();
      } catch (e) {
        say(e.message, true);
      }
    })
  );
}

async function loadAssignments() {
  const [journeys, workers] = await Promise.all([
    api("/api/admin/journeys"),
    api("/api/admin/workers"),
  ]);
  const opts =
    `<option value="">Unassigned</option>` +
    workers.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join("");

  document.getElementById("journeysBody").innerHTML =
    journeys
      .map(
        j => `<tr data-journey="${esc(j.journey_id)}">
      <td><b>${esc(j.name)}</b><small>${esc(j.journey_id)}</small></td>
      <td>${esc(j.current_stage)}</td>
      <td>
        <select class="worker-select">${opts}</select>
        <small>${esc(j.assigned_worker || "Not assigned")}</small>
      </td>
      <td><button class="save-assignment">Save</button></td>
    </tr>`
      )
      .join("") || `<tr><td colspan="4">No demo journeys yet.</td></tr>`;

  journeys.forEach(j => {
    const row = document.querySelector(`[data-journey="${CSS.escape(j.journey_id)}"]`);
    if (row) row.querySelector("select").value = j.assigned_worker_id || "";
  });

  document.querySelectorAll(".save-assignment").forEach(btn =>
    btn.addEventListener("click", async () => {
      const tr = btn.closest("tr");
      const value = tr.querySelector("select").value;
      try {
        await api(`/api/admin/journeys/${encodeURIComponent(tr.dataset.journey)}/assignment`, {
          method: "PATCH",
          body: JSON.stringify({ worker_id: value ? Number(value) : null }),
        });
        say("Health-worker assignment saved.");
        await loadAssignments();
      } catch (e) {
        say(e.message, true);
      }
    })
  );
}

async function loadActivity() {
  const rows = await api("/api/admin/activity?limit=50");
  document.getElementById("activityBody").innerHTML =
    rows
      .map(
        r => `<tr>
      <td>${esc(r.created_at)}</td>
      <td>${esc(r.actor_name)}<small>${esc(r.actor_role)}</small></td>
      <td>${esc(r.action)}</td>
      <td>${esc(r.target_type)} ${esc(r.target_id)}</td>
      <td>${esc(r.details)}</td>
    </tr>`
      )
      .join("") || `<tr><td colspan="5">No admin actions recorded yet.</td></tr>`;
}

async function init() {
  try {
    const me = await api("/api/auth/me");
    if (me.user.role !== "admin") {
      say("Administrator access is required.", true);
      setTimeout(() => (location.href = "role-dashboard.html"), 900);
      return;
    }

    const [overview] = await Promise.all([
      api("/api/admin/overview"),
      loadUsers(),
      loadAssignments(),
      loadActivity(),
    ]);

    renderStats(overview.counts);
    renderAiSummary(overview.ai_summary);
    renderImpact(overview.impact, overview.role_distribution);

    document.getElementById("referralStats").innerHTML =
      (overview.referrals_by_status || [])
        .map(s => `<span class="referral-pill"><b>${s.count}</b>${esc(s.status)}</span>`)
        .join("") || "No referral records yet.";
  } catch (e) {
    say(`${e.message}. Please sign in again with an administrator account.`, true);
    localStorage.removeItem("ss_demo_token");
    localStorage.removeItem("ss_demo_user");
    setTimeout(() => (location.href = "auth.html"), 1200);
  }
}

document.getElementById("seedDemoBtn")?.addEventListener("click", async () => {
  const btn = document.getElementById("seedDemoBtn");
  btn.disabled = true;
  btn.textContent = "Seeding…";
  try {
    const result = await api("/api/admin/seed-demo", { method: "POST" });
    say(result.message + (result.notice ? " " + result.notice : ""));
    // Refresh all panels
    const overview = await api("/api/admin/overview");
    renderStats(overview.counts);
    renderAiSummary(overview.ai_summary);
    renderImpact(overview.impact, overview.role_distribution);
    document.getElementById("referralStats").innerHTML =
      (overview.referrals_by_status || [])
        .map(s => `<span class="referral-pill"><b>${s.count}</b>${esc(s.status)}</span>`)
        .join("") || "No referral records yet.";
    await loadAssignments();
    await loadActivity();
  } catch (e) {
    say(e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Seed demo data";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("ss_demo_token");
  localStorage.removeItem("ss_demo_user");
  location.href = "auth.html";
});

init();
