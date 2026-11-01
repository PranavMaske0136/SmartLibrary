/* =============================================================================
   SMART LIBRARY - WEB LOGIC & AUTHENTICATION ENGINE
   Supports Single Dedicated Administrator & Multi-Student Patron Registration
============================================================================= */

// Default system accounts (Single Administrator + Initial Students)
const DEFAULT_ACCOUNTS = [
    {
        studentId: "ADM001",
        name: "Administrator",
        email: "admin@smartlibrary.edu",
        password: "admin123",
        role: "admin"
    },
    {
        studentId: "STU101",
        name: "John Doe",
        email: "john.doe@student.edu",
        password: "password123",
        role: "student"
    },
    {
        studentId: "STU102",
        name: "Jane Smith",
        email: "jane.smith@student.edu",
        password: "password123",
        role: "student"
    },
    {
        studentId: "STU103",
        name: "Alex Rivera",
        email: "alex.rivera@student.edu",
        password: "password123",
        role: "student"
    }
];

// Helper: Retrieve all registered accounts (combining defaults + localStorage)
function getAllAccounts() {
    try {
        const stored = localStorage.getItem("smartlibrary_registered_users");
        const customUsers = stored ? JSON.parse(stored) : [];
        return [...DEFAULT_ACCOUNTS, ...customUsers];
    } catch (e) {
        console.error("Error reading registered users from localStorage:", e);
        return DEFAULT_ACCOUNTS;
    }
}

// Helper: Save a new user to localStorage (strictly student)
function saveCustomUser(newUser) {
    try {
        const stored = localStorage.getItem("smartlibrary_registered_users");
        const customUsers = stored ? JSON.parse(stored) : [];
        customUsers.push(newUser);
        localStorage.setItem("smartlibrary_registered_users", JSON.stringify(customUsers));
        return true;
    } catch (e) {
        console.error("Error saving user to localStorage:", e);
        return false;
    }
}

document.addEventListener("DOMContentLoaded", () => {

    // 1. Dynamic Footer Year
    const yearElements = document.querySelectorAll("#year");
    yearElements.forEach(el => {
        el.textContent = new Date().getFullYear();
    });

    // 2. Tab Elements
    const tabLoginBtn = document.getElementById("tabLoginBtn");
    const tabRegisterBtn = document.getElementById("tabRegisterBtn");
    const loginSection = document.getElementById("loginSection");
    const registerSection = document.getElementById("registerSection");
    const linkToRegister = document.getElementById("linkToRegister");
    const linkToLogin = document.getElementById("linkToLogin");

    // Function to switch tabs
    function switchTab(target) {
        if (!loginSection || !registerSection) return;

        if (target === "register") {
            loginSection.hidden = true;
            registerSection.hidden = false;
            if (tabLoginBtn) tabLoginBtn.classList.remove("active");
            if (tabRegisterBtn) tabRegisterBtn.classList.add("active");
            window.location.hash = "register";
        } else {
            registerSection.hidden = true;
            loginSection.hidden = false;
            if (tabRegisterBtn) tabRegisterBtn.classList.remove("active");
            if (tabLoginBtn) tabLoginBtn.classList.add("active");
            window.location.hash = "login";
        }
    }

    if (tabLoginBtn) tabLoginBtn.addEventListener("click", () => switchTab("login"));
    if (tabRegisterBtn) tabRegisterBtn.addEventListener("click", () => switchTab("register"));
    if (linkToRegister) linkToRegister.addEventListener("click", (e) => { e.preventDefault(); switchTab("register"); });
    if (linkToLogin) linkToLogin.addEventListener("click", (e) => { e.preventDefault(); switchTab("login"); });

    // Check URL hash or query param on initial load
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role");
    const actionParam = params.get("action");

    if (window.location.hash === "#register" || actionParam === "register") {
        switchTab("register");
    } else {
        switchTab("login");
    }

    // Auto-select role dropdown from query string
    const loginRole = document.getElementById("loginRole");
    if (loginRole && (roleParam === "admin" || roleParam === "student")) {
        loginRole.value = roleParam;
    }

    // 3. Password Show/Hide Toggles
    const togglePassword = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            const isPassword = passwordInput.type === "password";
            passwordInput.type = isPassword ? "text" : "password";
            togglePassword.textContent = isPassword ? "Hide" : "Show";
        });
    }

    const toggleRegPassword = document.getElementById("toggleRegPassword");
    const regPasswordInput = document.getElementById("regPassword");
    if (toggleRegPassword && regPasswordInput) {
        toggleRegPassword.addEventListener("click", () => {
            const isPassword = regPasswordInput.type === "password";
            regPasswordInput.type = isPassword ? "text" : "password";
            toggleRegPassword.textContent = isPassword ? "Hide" : "Show";
        });
    }

    // 4. Handle Registration Form Submission (Strictly Students Only)
    const registerForm = document.getElementById("registerForm");
    const registerMessage = document.getElementById("registerMessage");

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = document.getElementById("regName").value.trim();
            const studentId = document.getElementById("regStudentId").value.trim().toUpperCase();
            const email = document.getElementById("regEmail").value.trim().toLowerCase();
            const password = document.getElementById("regPassword").value;
            const confirmPassword = document.getElementById("regConfirmPassword").value;

            if (!registerMessage) return;

            // Form Validations
            if (!name || !studentId || !email || !password) {
                showMessage(registerMessage, "Please complete all required fields.", "error");
                return;
            }

            // Reject any attempt to register as administrator
            if (email === "admin@smartlibrary.edu" || studentId.startsWith("ADM")) {
                showMessage(
                    registerMessage,
                    "Administrative registration is restricted. The system has only one dedicated administrator.",
                    "error"
                );
                return;
            }

            if (password.length < 6) {
                showMessage(registerMessage, "Password must be at least 6 characters long.", "error");
                return;
            }

            if (password !== confirmPassword) {
                showMessage(registerMessage, "Passwords do not match. Please verify and retype.", "error");
                return;
            }

            // Try Live Neon Backend Registration
            let registeredViaBackend = false;
            try {
                const apiRes = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ studentId, name, email, password })
                });
                const data = await apiRes.json();
                if (!apiRes.ok) {
                    showMessage(registerMessage, data.error || "Registration failed.", "error");
                    return;
                }
                registeredViaBackend = true;
            } catch (err) {
                console.warn("Backend registration API unavailable, using local store:", err);
            }

            // Save to local cache as well
            const newUser = {
                id: Date.now(),
                studentId: studentId,
                name: name,
                email: email,
                password: password,
                role: "student",
                createdAt: new Date().toISOString()
            };
            saveCustomUser(newUser);

            // Success feedback
            showMessage(
                registerMessage,
                `Student account registered successfully for ${name}! Switching to Sign In...`,
                "success"
            );

            // Pre-fill login form with new student credentials
            if (loginRole) loginRole.value = "student";
            const loginEmailInput = document.getElementById("email");
            if (loginEmailInput) loginEmailInput.value = email;

            // Reset registration form
            registerForm.reset();

            // Transition to login tab after brief pause
            setTimeout(() => {
                switchTab("login");
                const loginMsg = document.getElementById("loginMessage");
                if (loginMsg) {
                    showMessage(loginMsg, `Welcome, ${name}! You can now sign in with your student credentials.`, "success");
                }
            }, 1200);

        });
    }

    // 5. Handle Sign In Form Submission (Admin & Students)
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = (document.getElementById("email").value || "").trim().toLowerCase();
            const password = document.getElementById("password").value || "";

            if (!loginMessage) return;

            if (!email || !password) {
                showMessage(loginMessage, "Please enter both email and password.", "error");
                return;
            }

            // 1. Try Live Neon Backend Authentication First
            try {
                const apiRes = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                const data = await apiRes.json();
                if (apiRes.ok && data.user) {
                    if (loginRole) {
                        loginRole.value = data.user.role;
                    }
                    try {
                        sessionStorage.setItem("smartlibrary_current_user", JSON.stringify({
                            studentId: data.user.student_id,
                            name: data.user.name,
                            email: data.user.email,
                            role: data.user.role
                        }));
                    } catch (e) {
                        console.error("Session storage error:", e);
                    }

                    if (data.user.role === "student") {
                        showMessage(loginMessage, `Welcome back, ${data.user.name}! Opening Student Portal...`, "success");
                        setTimeout(() => {
                            window.location.href = "student.html";
                        }, 700);
                        return;
                    } else if (data.user.role === "admin") {
                        showMessage(
                            loginMessage,
                            `Welcome Administrator ${data.user.name}! Opening Control Center...`,
                            "success"
                        );
                        setTimeout(() => {
                            window.location.href = "admin.html";
                        }, 700);
                        return;
                    }
                } else if (data.error) {
                    showMessage(loginMessage, data.error, "error");
                    return;
                }
            } catch (err) {
                console.warn("Backend auth unavailable, verifying locally:", err);
            }

            // 2. Fallback to Local Accounts (if offline or server unreachable)
            const accounts = getAllAccounts();
            const matchedUser = accounts.find(
                acc => acc.email.toLowerCase() === email && acc.password === password
            );

            if (!matchedUser) {
                showMessage(
                    loginMessage,
                    "Invalid email or password. Please verify your credentials or register as a student.",
                    "error"
                );
                return;
            }

            // Auto-align role
            if (loginRole) {
                loginRole.value = matchedUser.role;
            }

            // Save active session
            try {
                sessionStorage.setItem("smartlibrary_current_user", JSON.stringify({
                    studentId: matchedUser.studentId,
                    name: matchedUser.name,
                    email: matchedUser.email,
                    role: matchedUser.role
                }));
            } catch (e) {
                console.error("Session storage error:", e);
            }

            // Redirect based on role
            if (matchedUser.role === "student") {
                showMessage(loginMessage, `Welcome back, ${matchedUser.name}! Opening Student Portal...`, "success");
                setTimeout(() => {
                    window.location.href = "student.html";
                }, 700);
            } else if (matchedUser.role === "admin") {
                showMessage(
                    loginMessage,
                    `Welcome Administrator ${matchedUser.name}! Opening Control Center...`,
                    "success"
                );
                setTimeout(() => {
                    window.location.href = "admin.html";
                }, 700);
            }

        });
    }

});

// Helper: Show formatted message
function showMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = `login-message ${type}`;
    element.style.display = "block";
}

console.log("Smart Library Authentication Engine Loaded (Single Admin + Student Registration)");
