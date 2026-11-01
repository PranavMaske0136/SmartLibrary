
/* =====================================
   SMART LIBRARY - WEBSITE JAVASCRIPT
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    // Update footer year
    const yearElement = document.getElementById("year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // Read selected role from URL
    const loginRole = document.getElementById("loginRole");

    if (loginRole) {
        const params = new URLSearchParams(window.location.search);
        const role = params.get("role");

        if (role === "admin" || role === "student") {
            loginRole.value = role;
        }
    }

    // Login form
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    if (loginForm) {

        loginForm.addEventListener("submit", (event) => {

            event.preventDefault();

            const selectedRole = loginRole
                ? loginRole.value
                : "student";

            if (!loginMessage) {
                return;
            }

            if (selectedRole === "student") {

                loginMessage.textContent =
                    "Student demo login successful. Opening Student Portal...";

                loginMessage.style.color = "green";

                window.location.href = "student.html";

            } else if (selectedRole === "admin") {

                loginMessage.textContent =
                    "Admin Portal will be connected with Module 1.";

                loginMessage.style.color = "#b36b00";

            }

        });

    }

});

// Show / Hide Password
function togglePassword() {

    const passwordInput = document.getElementById("password");

    if (!passwordInput) {
        return;
    }

    passwordInput.type =
        passwordInput.type === "password"
            ? "text"
            : "password";
}

console.log("Smart Library Website Loaded!");
