(() => {
  "use strict";

  const store = window.SSReferralStore;
  const form = document.getElementById("referral-form");
  const list = document.getElementById("referral-list");
  const searchInput = document.getElementById("search-input");
  const statusFilter = document.getElementById("status-filter");
  const emptyState = document.getElementById("empty-state");
  const resultCount = document.getElementById("result-count");
  const formMessage = document.getElementById("form-message");
  const resetButton = document.getElementById("reset-button");

  if (!store || !form || !list) return;

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  const statusClass = status => `status-${String(status).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

  function formatDate(value) {
    if (!value) return "No due date";
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed);
  }

  function populateStatuses() {
    store.statuses.forEach(status => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      statusFilter.append(option);
    });
  }

  function render() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const selectedStatus = statusFilter.value;
    const referrals = store.list().filter(item => {
      const searchable = [item.caseId, item.facility, item.task, item.dueDate, item.status].join(" ").toLocaleLowerCase();
      return (!query || searchable.includes(query)) && (!selectedStatus || item.status === selectedStatus);
    });

    list.replaceChildren();
    referrals.forEach(item => {
      const article = document.createElement("article");
      article.className = "referral-card";
      const controlsId = `status-${String(item.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
      article.innerHTML = `
        <div>
          <div class="case-line">
            <span class="case-id">${escapeHTML(item.caseId)}</span>
            <span class="status-badge ${statusClass(item.status)}">${escapeHTML(item.status)}</span>
          </div>
          <div class="referral-details">
            <strong>${escapeHTML(item.facility)}</strong>
            <span>${escapeHTML(item.task)}</span>
            <span>Due ${escapeHTML(formatDate(item.dueDate))}</span>
          </div>
        </div>
        <div class="card-controls">
          <label for="${escapeHTML(controlsId)}">Update status</label>
          <select id="${escapeHTML(controlsId)}" data-referral-id="${escapeHTML(item.id)}" aria-label="Update status for ${escapeHTML(item.caseId)}">
            ${store.statuses.map(status => `<option value="${escapeHTML(status)}"${status === item.status ? " selected" : ""}>${escapeHTML(status)}</option>`).join("")}
          </select>
        </div>`;
      list.append(article);
    });

    emptyState.hidden = referrals.length > 0;
    resultCount.textContent = `${referrals.length} ${referrals.length === 1 ? "item" : "items"}`;
  }

  populateStatuses();
  render();
  searchInput.addEventListener("input", render);
  statusFilter.addEventListener("change", render);
  list.addEventListener("change", event => {
    const select = event.target.closest("select[data-referral-id]");
    if (!select || !store.statuses.includes(select.value)) return;
    store.update(select.dataset.referralId, { status: select.value });
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    formMessage.textContent = "";
    formMessage.classList.remove("error");
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const record = {
      caseId: String(data.get("caseId")).trim().toUpperCase(),
      facility: String(data.get("facility")).trim(),
      task: String(data.get("task")).trim(),
      dueDate: String(data.get("dueDate")),
      status: store.statuses[0]
    };

    if (!/^DEMO-[0-9]{3,}$/.test(record.caseId)) {
      formMessage.textContent = "Use a fictional case ID such as DEMO-500.";
      formMessage.classList.add("error");
      return;
    }
    if (store.list().some(item => item.caseId.toUpperCase() === record.caseId)) {
      formMessage.textContent = "That demo case ID is already in use. Choose another synthetic ID.";
      formMessage.classList.add("error");
      return;
    }

    store.create(record);
    form.reset();
    formMessage.textContent = `${record.caseId} added to the demo worklist.`;
    searchInput.value = "";
    statusFilter.value = "";
    document.getElementById("case-id").focus();
  });

  resetButton.addEventListener("click", () => {
    if (window.confirm("Reset this browser's referral list to the four fictional sample cases? Any demo entries you added will be removed.")) {
      store.reset();
      formMessage.textContent = "Sample referrals restored.";
      formMessage.classList.remove("error");
      searchInput.value = "";
      statusFilter.value = "";
      render();
    }
  });

  window.addEventListener("ss:referrals-changed", render);
})();
