const API_BASE = window.SWASTHYASETU_API || "http://127.0.0.1:8000";
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");
const authMessage = document.getElementById("authMessage");

function showLoginForm() {
  loginForm.classList.remove("hidden"); registerForm.classList.add("hidden");
  loginTab.classList.add("active"); registerTab.classList.remove("active"); authMessage.textContent = "";
}
function showRegisterForm() {
  registerForm.classList.remove("hidden"); loginForm.classList.add("hidden");
  registerTab.classList.add("active"); loginTab.classList.remove("active"); authMessage.textContent = "";
}
loginTab.addEventListener("click", showLoginForm);
registerTab.addEventListener("click", showRegisterForm);
showRegister.addEventListener("click", e => { e.preventDefault(); showRegisterForm(); });
showLogin.addEventListener("click", e => { e.preventDefault(); showLoginForm(); });

async function submitAuth(path, payload) {
  const response = await fetch(`${API_BASE}/api/auth/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.detail || `Request failed (${response.status})`);
  localStorage.setItem("ss_demo_token", result.access_token);
  localStorage.setItem("ss_demo_user", JSON.stringify(result.user));
  window.location.href = "role-dashboard.html";
}

registerForm.addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await submitAuth("register", {
      name: document.getElementById("fullName").value.trim(),
      email: document.getElementById("registerEmail").value.trim(),
      password: document.getElementById("registerPassword").value
    });
  } catch (error) { authMessage.textContent = error.message; }
});

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await submitAuth("login", {
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value
    });
  } catch (error) { authMessage.textContent = error.message; }
});
