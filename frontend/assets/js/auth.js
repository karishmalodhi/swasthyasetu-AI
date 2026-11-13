
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");

const authMessage = document.getElementById("authMessage");

function showLoginForm() {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");

    loginTab.classList.add("active");
    registerTab.classList.remove("active");

    authMessage.textContent = "";
}

function showRegisterForm() {
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");

    registerTab.classList.add("active");
    loginTab.classList.remove("active");

    authMessage.textContent = "";
}

loginTab.addEventListener("click", showLoginForm);
registerTab.addEventListener("click", showRegisterForm);

showRegister.addEventListener("click", function(event) {
    event.preventDefault();
    showRegisterForm();
});

showLogin.addEventListener("click", function(event) {
    event.preventDefault();
    showLoginForm();
});

registerForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!name || !email || !password) {
        authMessage.textContent = "Please fill all fields.";
        return;
    }

    authMessage.textContent = "Registration successful! Your demo account form is complete.";
    registerForm.reset();
});

loginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        authMessage.textContent = "Please enter email and password.";
        return;
    }

    // Demo login: frontend navigation only
    localStorage.setItem("userName", "User");
window.location.href = "dashboard.html";
    window.location.href = "dashboard.html";
});