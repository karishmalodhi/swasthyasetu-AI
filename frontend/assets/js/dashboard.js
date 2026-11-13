
document.addEventListener("DOMContentLoaded", function () {

    // Sidebar active menu
    const sidebarLinks = document.querySelectorAll(".sidebar a");

    sidebarLinks.forEach(link => {
        link.addEventListener("click", function () {
            sidebarLinks.forEach(item => item.classList.remove("active"));
            this.classList.add("active");
        });
    });

    // Welcome message
    const userName = localStorage.getItem("userName");
    const welcomeText = document.getElementById("welcomeUser");

    if (userName && welcomeText) {
        welcomeText.textContent = `Welcome back, ${userName}!`;
    }

});
