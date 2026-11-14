const API_BASE = window.SWASTHYASETU_API || "http://127.0.0.1:8000";
const token = localStorage.getItem("ss_demo_token");
const cachedUser = JSON.parse(localStorage.getItem("ss_demo_user") || "null");
if (!token || !cachedUser) window.location.href = "auth.html";
const roleNames = { patient: "Patient", health_worker: "Health Worker", admin: "Administrator" };
const roleInfo = {
  patient: { description: "Review your own fictional journey and explore the platform's support modules.", permissions: ["Create and view your own demo journey", "View your own referral information", "Explore HealthGuard, MaternalCare and MediReach", "Cannot view other patients or edit referral workflows"] },
  health_worker: { description: "Coordinate fictional patient journeys, service navigation and referral follow-ups.", permissions: ["View all demo journeys", "Add journey activity", "Create and update demo referrals", "Cannot access administrator-only account totals"] },
  admin: { description: "Review platform-wide demonstration activity and coordinate demo workspaces.", permissions: ["View all demo journeys", "Manage journey activity and referral status", "View aggregate demo account and referral counts", "Administrative access is still limited to synthetic data"] }
};
async function api(path) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}
function actionCard(title, description, href, icon) {
  return `<a class="role-action" href="${href}"><span>${icon}</span><h3>${title}</h3><p>${description}</p><b>Open workspace →</b></a>`;
}
async function init() {
  try {
    const result = await api("/api/auth/me");
    const user = result.user;
    localStorage.setItem("ss_demo_user", JSON.stringify(user));
    const info = roleInfo[user.role];
    document.getElementById("roleBadge").textContent = roleNames[user.role];
    document.getElementById("greeting").textContent = `Welcome, ${user.name}`;
    document.getElementById("roleDescription").textContent = info.description;
    document.getElementById("permissionList").innerHTML = info.permissions.map(x => `<li>${x}</li>`).join("");
    let cards = [actionCard("Unified Patient Journey", user.role === "patient" ? "Create and review your own demo journey." : "Coordinate fictional journeys and referral follow-ups.", "patient-journey.html", "⇄"), actionCard("HealthGuard", "Explore the non-clinical screening prototype.", "healthguard.html", "♡"), actionCard("MaternalCare", "Explore maternal-care information and demo forms.", "maternalcare.html", "✚"), actionCard("MediReach", "Explore healthcare access support.", "medireach.html", "⌖")];
    if (user.role === "health_worker" || user.role === "admin") cards.push(actionCard("Smart Referral", "Open the referral coordination module.", "referrals.html", "↗"));
    if (user.role === "admin") {
      cards.push(actionCard("Admin Panel 2.0", "Manage demo users, assign health workers, view referral analytics and audit activity.", "admin-panel.html", "⚙"));
      document.getElementById("adminStats").hidden = false;
      const stats = await api("/api/auth/admin/summary");
      document.getElementById("statUsers").textContent = stats.users;
      document.getElementById("statPatients").textContent = stats.demo_patients;
      document.getElementById("statReferrals").textContent = stats.referrals;
      document.getElementById("statOpen").textContent = stats.open_referrals;
    }
    document.getElementById("roleActions").innerHTML = cards.join("");
  } catch (error) {
    document.getElementById("roleDescription").textContent = `${error.message}. Please sign in again.`;
    localStorage.removeItem("ss_demo_token");
    localStorage.removeItem("ss_demo_user");
    setTimeout(() => { window.location.href = "auth.html"; }, 1200);
  }
}
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("ss_demo_token"); localStorage.removeItem("ss_demo_user"); window.location.href = "auth.html";
});
init();
