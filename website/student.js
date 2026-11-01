/* =====================================
   SMART LIBRARY - ADVANCED BOOK SEARCH
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    const searchInput = document.getElementById("bookSearch");
    const categoryFilter = document.getElementById("categoryFilter");
    const availabilityFilter = document.getElementById("availabilityFilter");

    const bookList = document.getElementById("studentBookList");
    const bookCount = document.getElementById("bookCount");
    const noBooksMessage = document.getElementById("noBooksMessage");

    let books = Array.isArray(window.libraryBooks)
        ? window.libraryBooks
        : [];

    // Load categories from actual dataset
    function loadCategories() {
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

        categories.sort();

        // Clear existing categories (except "All")
        categoryFilter.innerHTML = '<option value="">All Categories</option>';

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    // Display book cards
    function displayBooks(bookArray) {
        bookList.innerHTML = "";

        bookCount.textContent =
            `Showing ${bookArray.length} of ${books.length} books`;

        if (bookArray.length === 0) {
            noBooksMessage.hidden = false;
            noBooksMessage.textContent = books.length === 0
                ? "The library collection is empty. Books will appear here after they are added."
                : "No books match your filters.";
            return;
        }

        noBooksMessage.hidden = true;

        bookArray.forEach(book => {
            const card = document.createElement("div");
            card.className = "student-book-card";

            const title = document.createElement("h3");
            title.textContent = book.title;

            const author = document.createElement("p");
            author.textContent = `Author: ${book.author}`;

            card.appendChild(title);
            card.appendChild(author);

            if (book.category) {
                const category = document.createElement("p");
                category.textContent = `Category: ${book.category}`;
                card.appendChild(category);
            }

            if (typeof book.availableCopies === "number") {
                const availability = document.createElement("p");
                availability.textContent =
                    book.availableCopies > 0
                        ? `Available Copies: ${book.availableCopies}`
                        : "Currently Unavailable";

                availability.className =
                    book.availableCopies > 0
                        ? "book-available"
                        : "book-unavailable";

                card.appendChild(availability);
            }

            bookList.appendChild(card);
        });
    }

    // Apply all filters together
    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();
        const selectedCategory = categoryFilter.value;
        const selectedAvailability = availabilityFilter.value;

        const filteredBooks = books.filter(book => {
            const title = String(book.title || "").toLowerCase();
            const author = String(book.author || "").toLowerCase();

            const matchesSearch =
                title.includes(query) ||
                author.includes(query);

            const matchesCategory =
                selectedCategory === "" ||
                book.category === selectedCategory;

            let matchesAvailability = true;

            if (selectedAvailability === "available") {
                matchesAvailability =
                    typeof book.availableCopies === "number" &&
                    book.availableCopies > 0;
            }

            if (selectedAvailability === "unavailable") {
                matchesAvailability =
                    typeof book.availableCopies === "number" &&
                    book.availableCopies === 0;
            }

            return (
                matchesSearch &&
                matchesCategory &&
                matchesAvailability
            );
        });

        displayBooks(filteredBooks);
    }

    // Fetch live books from Neon API
    async function fetchBooksFromApi() {
        try {
            const res = await fetch("/api/books");
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    books = data.map(b => ({
                        id: b.id,
                        title: b.title,
                        author: b.author,
                        category: b.category,
                        availableCopies: typeof b.available_copies === "number" ? b.available_copies : b.quantity,
                        quantity: b.quantity
                    }));
                    loadCategories();
                    displayBooks(books);
                }
            }
        } catch (e) {
            console.warn("Could not fetch live books from Neon API, using fallback data:", e);
        }
    }

    // Listen for filter changes
    searchInput.addEventListener("input", applyFilters);
    categoryFilter.addEventListener("change", applyFilters);
    availabilityFilter.addEventListener("change", applyFilters);

    // Initial setup with fallback
    loadCategories();
    displayBooks(books);

    // Load live books from Neon
    fetchBooksFromApi();

    console.log("Advanced Student Book Search Loaded!");
});
