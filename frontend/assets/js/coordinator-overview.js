(() => {
  const store = window.SSReferralStore;
  if (!store) return;
  const tbody = document.getElementById("coordination-tbody");
  if (!tbody) return;

  const isComplete = item => item.status === "Follow-up complete";
  const isOverdue = item => !isComplete(item) && new Date(`${item.dueDate}T00:00:00`) < new Date(new Date().toDateString());
  const formatDate = value => {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
  };
  function render(items) {
    const overdue = items.filter(isOverdue).length;
    document.getElementById("coordination-total").textContent = String(items.length);
    document.getElementById("coordination-open").textContent = String(items.filter(item => !isComplete(item)).length);
    document.getElementById("coordination-overdue").textContent = String(overdue);
    document.getElementById("coordination-complete").textContent = String(items.filter(isComplete).length);
    tbody.replaceChildren();
    const sorted = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
    if (!sorted.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "No demo referrals yet. Add one in the referral tracker.";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }
    sorted.forEach(item => {
      const row = document.createElement("tr");
      [item.caseId, item.task, item.facility].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      const due = document.createElement("td");
      due.textContent = `${formatDate(item.dueDate)}${isOverdue(item) ? " · past due" : ""}`;
      if (isOverdue(item)) due.className = "is-overdue";
      row.appendChild(due);
      const status = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `coordination-badge status-${item.status.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "")}`;
      badge.textContent = item.status;
      status.appendChild(badge);
      row.appendChild(status);
      tbody.appendChild(row);
    });
  }
  render(store.list());
  window.addEventListener("ss:referrals-changed", event => render(event.detail || store.list()));
})();
