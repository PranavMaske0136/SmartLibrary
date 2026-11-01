/* =============================================================================
   SMART LIBRARY - ADMIN DASHBOARD LOGIC
   Directly interacts with Neon Serverless Postgres via API
============================================================================= */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Session & Role Verification
    const currentUser = JSON.parse(sessionStorage.getItem("smartlibrary_current_user") || "null");

    if (currentUser && currentUser.role === "admin") {
        const greeting = document.getElementById("adminGreeting");
        if (greeting) {
            greeting.textContent = `Admin: ${currentUser.name}`;
        }
    } else {
        // If not logged in as admin, redirect to login
        console.warn("No active admin session detected.");
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            sessionStorage.removeItem("smartlibrary_current_user");
            window.location.href = "login.html?role=admin";
        });
    }

    // 2. Tab Navigation
    const tabButtons = document.querySelectorAll(".admin-tab");
    const tabContents = document.querySelectorAll(".admin-tab-content");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-tab");

            tabButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add("active");
        });
    });

    // 3. Alert / Toast helper
    const alertBox = document.getElementById("adminAlert");
    function showAlert(message, type = "success") {
        if (!alertBox) return;
        alertBox.textContent = message;
        alertBox.className = `admin-alert ${type}`;
        alertBox.hidden = false;
        setTimeout(() => {
            alertBox.hidden = true;
        }, 4000);
    }

    // 4. Load Overview KPIs from Neon
    async function loadOverview() {
        try {
            const res = await fetch("/api/admin/overview");
            if (!res.ok) throw new Error("Failed to load overview");
            const data = await res.json();

            document.getElementById("statTotalTitles").textContent = data.totalTitles || 0;
            document.getElementById("statTotalCopies").textContent = data.totalCopies || 0;
            document.getElementById("statAvailableCopies").textContent = data.availableCopies || 0;
            document.getElementById("statActiveLoans").textContent = data.activeLoans || 0;
            document.getElementById("statTotalStudents").textContent = data.totalStudents || 0;
        } catch (err) {
            console.error("Error loading overview:", err);
        }
    }

    // 5. Load Books Table from Neon
    let cachedBooks = [];
    async function loadBooks() {
        const tbody = document.getElementById("booksTableBody");
        const bookSelect = document.getElementById("issueBookSelect");

        try {
            const res = await fetch("/api/books");
            if (!res.ok) throw new Error("Failed to load books");
            const data = await res.json();
            cachedBooks = data.books || [];

            renderBooksTable(cachedBooks);

            // Populate Issue select dropdown (only available books)
            if (bookSelect) {
                bookSelect.innerHTML = '<option value="">-- Choose an Available Book --</option>';
                cachedBooks.filter(b => b.availableCopies > 0).forEach(book => {
                    const opt = document.createElement("option");
                    opt.value = book.id;
                    opt.textContent = `${book.title} (${book.availableCopies} available)`;
                    bookSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error loading books:", err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="error-cell">Error loading books from Neon: ${err.message}</td></tr>`;
        }
    }

    function renderBooksTable(books) {
        const tbody = document.getElementById("booksTableBody");
        if (!tbody) return;

        if (books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No books found in catalog.</td></tr>';
            return;
        }

        tbody.innerHTML = books.map(book => `
            <tr>
                <td>#${book.id}</td>
                <td><strong>${book.title}</strong></td>
                <td>${book.author}</td>
                <td><span class="category-badge">${book.category || 'General'}</span></td>
                <td>${book.quantity}</td>
                <td><span class="${book.availableCopies > 0 ? 'stock-available' : 'stock-out'}">${book.availableCopies}</span></td>
                <td>
                    <button class="delete-btn" onclick="deleteBook(${book.id}, '${book.title.replace(/'/g, "\\'")}')">Delete</button>
                </td>
            </tr>
        `).join("");
    }

    // Filter books search
    const bookFilter = document.getElementById("adminBookFilter");
    if (bookFilter) {
        bookFilter.addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase().trim();
            const filtered = cachedBooks.filter(b => 
                (b.title || '').toLowerCase().includes(q) ||
                (b.author || '').toLowerCase().includes(q) ||
                (b.category || '').toLowerCase().includes(q)
            );
            renderBooksTable(filtered);
        });
    }

    // 6. Delete Book Handler
    window.deleteBook = async function(id, title) {
        if (!confirm(`Are you sure you want to delete '${title}' from Neon Postgres?`)) return;

        try {
            const res = await fetch(`/api/admin/books/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete book");

            showAlert(`Book '${title}' deleted successfully!`);
            loadOverview();
            loadBooks();
        } catch (err) {
            alert(`Could not delete book: ${err.message}`);
        }
    };

    // 7. Add New Book Form
    const addBookForm = document.getElementById("addBookForm");
    if (addBookForm) {
        addBookForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const title = document.getElementById("newBookTitle").value.trim();
            const author = document.getElementById("newBookAuthor").value.trim();
            const category = document.getElementById("newBookCategory").value.trim();
            const quantity = parseInt(document.getElementById("newBookQuantity").value) || 1;

            try {
                const res = await fetch("/api/admin/books", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, author, category, quantity })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to add book");

                showAlert(`✓ ${data.message}`);
                addBookForm.reset();
                loadOverview();
                loadBooks();

                // Switch back to books tab
                const booksTabBtn = document.querySelector('[data-tab="booksTab"]');
                if (booksTabBtn) booksTabBtn.click();
            } catch (err) {
                showAlert(`Error: ${err.message}`, "error");
            }
        });
    }

    // 8. Load Students
    async function loadStudents() {
        const tbody = document.getElementById("studentsTableBody");
        const studentSelect = document.getElementById("issueStudentSelect");

        try {
            const res = await fetch("/api/admin/students");
            if (!res.ok) throw new Error("Failed to load students");
            const data = await res.json();
            const students = data.students || [];

            if (tbody) {
                if (students.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No students registered yet.</td></tr>';
                } else {
                    tbody.innerHTML = students.map(s => `
                        <tr>
                            <td>#${s.id}</td>
                            <td><span class="code-badge">${s.studentId}</span></td>
                            <td><strong>${s.name}</strong></td>
                            <td>${s.email}</td>
                            <td><span class="status-active">${s.isActive ? 'Active' : 'Inactive'}</span></td>
                            <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</td>
                        </tr>
                    `).join("");
                }
            }

            if (studentSelect) {
                studentSelect.innerHTML = '<option value="">-- Choose a Student --</option>';
                students.forEach(s => {
                    const opt = document.createElement("option");
                    opt.value = s.id;
                    opt.textContent = `${s.name} (${s.studentId}) - ${s.email}`;
                    studentSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error loading students:", err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="error-cell">Error: ${err.message}</td></tr>`;
        }
    }

    // 9. Load Circulation & Issues
    async function loadIssues() {
        const tbody = document.getElementById("issuesTableBody");

        try {
            const res = await fetch("/api/admin/issues");
            if (!res.ok) throw new Error("Failed to load circulation records");
            const data = await res.json();
            const issues = data.records || [];

            if (tbody) {
                if (issues.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No active or past loans recorded.</td></tr>';
                } else {
                    tbody.innerHTML = issues.map(iss => `
                        <tr>
                            <td>#${iss.id}</td>
                            <td><strong>${iss.bookTitle}</strong></td>
                            <td>${iss.studentName} <small class="text-muted">(${iss.studentCode})</small></td>
                            <td>${iss.issueDate ? iss.issueDate.substring(0, 10) : '-'}</td>
                            <td>${iss.dueDate ? iss.dueDate.substring(0, 10) : '-'}</td>
                            <td>
                                <span class="badge-${iss.status}">${iss.status.toUpperCase()}</span>
                            </td>
                            <td>
                                ${iss.status === 'issued' ? 
                                    `<button class="return-btn" onclick="returnBook(${iss.id})">Mark Returned ✓</button>` : 
                                    `<span class="returned-text">Returned on ${iss.returnDate ? iss.returnDate.substring(0, 10) : 'Done'}</span>`}
                            </td>
                        </tr>
                    `).join("");
                }
            }
        } catch (err) {
            console.error("Error loading issues:", err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="error-cell">Error: ${err.message}</td></tr>`;
        }
    }

    // 10. Issue Book Form
    const issueForm = document.getElementById("issueBookForm");
    if (issueForm) {
        issueForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const bookId = document.getElementById("issueBookSelect").value;
            const studentId = document.getElementById("issueStudentSelect").value;
            const loanDays = document.getElementById("issueLoanDays").value || 14;

            try {
                const res = await fetch("/api/admin/issue", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bookId, studentId, loanDays })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to issue book");

                showAlert(`✓ ${data.message}`);
                issueForm.reset();
                loadOverview();
                loadBooks();
                loadIssues();
            } catch (err) {
                showAlert(`Error: ${err.message}`, "error");
            }
        });
    }

    // 11. Process Return
    window.returnBook = async function(issueId) {
        try {
            const res = await fetch("/api/admin/return", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ issueId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to process return");

            showAlert("✓ Book marked as returned and inventory updated!");
            loadOverview();
            loadBooks();
            loadIssues();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    // 12. Refresh Button
    const refreshBtn = document.getElementById("refreshDataBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            loadOverview();
            loadBooks();
            loadStudents();
            loadIssues();
            showAlert("Data refreshed from Neon Postgres!");
        });
    }

    // Initial load
    loadOverview();
    loadBooks();
    loadStudents();
    loadIssues();
});

