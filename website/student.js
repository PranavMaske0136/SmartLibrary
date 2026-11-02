/* =============================================================================
   SMART LIBRARY - ADVANCED STUDENT BOOK SEARCH
   Live synchronization with Neon PostgreSQL Database (/api/books)
============================================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const searchInput = document.getElementById("bookSearch");
    const categoryFilter = document.getElementById("categoryFilter");
    const availabilityFilter = document.getElementById("availabilityFilter");

    const bookList = document.getElementById("studentBookList");
    const bookCount = document.getElementById("bookCount");
    const noBooksMessage = document.getElementById("noBooksMessage");

    // Initialize with fallback dataset, dynamically populated from live database
    let books = Array.isArray(window.libraryBooks) ? window.libraryBooks : [];

    // Load categories dynamically from current dataset
    function loadCategories() {
        if (!categoryFilter) return;

        const categories = [
            ...new Set(
                books
                    .map(book => book.category)
                    .filter(category =>
                        typeof category === "string" &&
                        category.trim() !== ""
                    )
            )
        ];

        categories.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

        // Preserve currently selected category
        const currentSelected = categoryFilter.value;

        // Clear existing categories (keep "All Categories")
        categoryFilter.innerHTML = '<option value="">All Categories</option>';

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            if (category === currentSelected) {
                option.selected = true;
            }
            categoryFilter.appendChild(option);
        });
    }

    // Display book cards
    function displayBooks(bookArray) {
        if (!bookList || !bookCount) return;

        bookList.innerHTML = "";

        bookCount.textContent =
            `Showing ${bookArray.length} of ${books.length} books in library catalog`;

        if (bookArray.length === 0) {
            if (noBooksMessage) {
                noBooksMessage.hidden = false;
                noBooksMessage.textContent = books.length === 0
                    ? "The library collection is currently empty."
                    : "No books match your search filters. Try searching by title, author, or category.";
            }
            return;
        }

        if (noBooksMessage) {
            noBooksMessage.hidden = true;
        }

        bookArray.forEach(book => {
            const card = document.createElement("div");
            card.className = "student-book-card";

            const title = document.createElement("h3");
            title.textContent = book.title || "Untitled";

            const author = document.createElement("p");
            author.textContent = `Author: ${book.author || "Unknown"}`;

            card.appendChild(title);
            card.appendChild(author);

            if (book.category) {
                const category = document.createElement("p");
                category.textContent = `Category: ${book.category}`;
                card.appendChild(category);
            }

            if (typeof book.availableCopies === "number") {
                const totalCopies = typeof book.quantity === "number" ? book.quantity : book.availableCopies;
                const availability = document.createElement("p");
                availability.textContent =
                    book.availableCopies > 0
                        ? `Available Copies: ${book.availableCopies} of ${totalCopies}`
                        : "Currently Unavailable (All copies checked out)";

                availability.className =
                    book.availableCopies > 0
                        ? "book-available"
                        : "book-unavailable";

                card.appendChild(availability);
            }

            bookList.appendChild(card);
        });
    }

    // Apply all filters together: Search by title, author, OR category + category dropdown + availability dropdown
    function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const selectedCategory = categoryFilter ? categoryFilter.value.toLowerCase().trim() : "";
        const selectedAvailability = availabilityFilter ? availabilityFilter.value : "";

        const filteredBooks = books.filter(book => {
            const title = String(book.title || "").toLowerCase();
            const author = String(book.author || "").toLowerCase();
            const category = String(book.category || "").toLowerCase();

            // Match query in Title, Author, OR Category
            const matchesSearch =
                query === "" ||
                title.includes(query) ||
                author.includes(query) ||
                category.includes(query);

            // Match selected category dropdown
            const matchesCategory =
                selectedCategory === "" ||
                category === selectedCategory;

            // Match availability dropdown
            let matchesAvailability = true;
            if (selectedAvailability === "available") {
                matchesAvailability =
                    typeof book.availableCopies === "number" &&
                    book.availableCopies > 0;
            } else if (selectedAvailability === "unavailable") {
                matchesAvailability =
                    typeof book.availableCopies === "number" &&
                    book.availableCopies === 0;
            }

            return matchesSearch && matchesCategory && matchesAvailability;
        });

        displayBooks(filteredBooks);
    }

    // Fetch live books from Neon PostgreSQL API
    async function fetchBooksFromApi() {
        try {
            const res = await fetch("/api/books");
            if (res.ok) {
                const data = await res.json();
                // Support both { total, books: [...] } and raw array [...]
                const rawList = Array.isArray(data) ? data : (data.books || []);
                if (Array.isArray(rawList) && rawList.length > 0) {
                    books = rawList.map(b => ({
                        id: b.id,
                        title: b.title,
                        author: b.author,
                        category: b.category,
                        quantity: typeof b.quantity === "number" ? b.quantity : 1,
                        availableCopies: typeof b.availableCopies === "number"
                            ? b.availableCopies
                            : (typeof b.available_copies === "number" ? b.available_copies : b.quantity)
                    }));

                    loadCategories();
                    applyFilters();
                    console.log(`[Student Portal] Synchronized ${books.length} live books from Neon PostgreSQL.`);
                    return;
                }
            }
        } catch (e) {
            console.warn("[Student Portal] Live fetch failed, using fallback:", e);
        }

        // Render fallback if fetch was unavailable
        loadCategories();
        applyFilters();
    }

    // Wire filter listeners
    if (searchInput) {
        searchInput.addEventListener("input", applyFilters);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener("change", applyFilters);
    }
    if (availabilityFilter) {
        availabilityFilter.addEventListener("change", applyFilters);
    }

    // Initial render with fallback while fetching
    loadCategories();
    displayBooks(books);

    // Immediately fetch live books from Neon PostgreSQL
    fetchBooksFromApi();

    // Automatically re-sync live books when the tab gains focus
    window.addEventListener("focus", fetchBooksFromApi);

    console.log("Advanced Student Book Search Initialized with Live Neon PostgreSQL Sync.");

});
