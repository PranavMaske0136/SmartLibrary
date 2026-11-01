/* =============================================================================
   SMART LIBRARY - LIVE DATABASE ASSISTANT (POSTGRESQL SYNCHRONIZED)
   Connects directly to Neon PostgreSQL /api/books for real-time catalog access.
============================================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const messagesBox = document.getElementById("chatMessages");
    const userInput = document.getElementById("userMessage");
    const chatForm = document.getElementById("chatForm");
    const clearButton = document.getElementById("clearChat");
    const suggestionButtons = document.querySelectorAll(".suggestion-btn");
    const botStatus = document.getElementById("botStatus");

    // Start with fallback dataset, then hydrate from live Neon PostgreSQL database
    let books = Array.isArray(window.libraryBooks) ? window.libraryBooks : [];

    // Helper: Update online status indicator in UI
    function updateStatus(text, isError = false) {
        if (!botStatus) return;
        botStatus.textContent = text;
        botStatus.style.color = isError ? "#f87171" : "#4ade80";
    }

    // Helper: Add message to chat stream
    function addMessage(message, sender) {
        if (!messagesBox) return;

        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender === "user" ? "user-message" : "bot-message");

        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = sender === "user" ? "👤" : "🤖";

        const content = document.createElement("div");
        content.className = "message-content";

        // Preserve line breaks
        const paragraphs = String(message).split("\n\n");
        paragraphs.forEach(pText => {
            const p = document.createElement("p");
            p.style.whiteSpace = "pre-line";
            p.textContent = pText;
            content.appendChild(p);
        });

        messageElement.appendChild(avatar);
        messageElement.appendChild(content);
        messagesBox.appendChild(messageElement);

        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    // Format a book record into clean readable response
    function formatBook(book) {
        let details = `📖 ${book.title || "Untitled"}`;
        if (book.author) details += `\n   Author: ${book.author}`;
        if (book.category) details += `\n   Category: ${book.category}`;
        if (typeof book.availableCopies === "number") {
            const total = book.quantity !== undefined ? book.quantity : book.availableCopies;
            details += `\n   Availability: ${book.availableCopies > 0 ? `✅ ${book.availableCopies} of ${total} copies on shelf` : "❌ Currently checked out"}`;
        }
        return details;
    }

    // Synchronize catalog with live Neon PostgreSQL backend
    async function syncBooksFromDatabase() {
        try {
            const res = await fetch("/api/books");
            if (res.ok) {
                const data = await res.json();
                const catalog = Array.isArray(data) ? data : data.books;
                if (Array.isArray(catalog) && catalog.length > 0) {
                    books = catalog.map(b => ({
                        id: b.id,
                        title: b.title,
                        author: b.author,
                        category: b.category,
                        quantity: typeof b.quantity === "number" ? b.quantity : 1,
                        availableCopies: typeof b.availableCopies === "number" 
                            ? b.availableCopies 
                            : (typeof b.available_copies === "number" ? b.available_copies : b.quantity)
                    }));
                    updateStatus(`● Online | Live Database (${books.length} Books)`);
                    console.log(`[Chatbot] Synchronized ${books.length} books with Neon PostgreSQL.`);
                    return true;
                }
            }
        } catch (err) {
            console.warn("[Chatbot] Live database fetch error, using local dataset:", err);
        }

        if (books.length > 0) {
            updateStatus(`● Online | Local Dataset (${books.length} Books)`);
        } else {
            updateStatus(`● Offline | Database Unavailable`, true);
        }
        return false;
    }

    // Advanced Multi-Strategy Book Search
    function searchBooks(rawQuery) {
        const query = rawQuery.toLowerCase().trim();
        if (!query) return [];

        const stopWords = new Set([
            "a", "an", "the", "in", "on", "at", "by", "for", "of", "to", "is", "are", 
            "do", "does", "did", "you", "have", "has", "had", "can", "could", "would",
            "please", "tell", "me", "about", "book", "books", "find", "search", "show",
            "list", "get", "check", "available", "availability", "copies", "library",
            "any", "some", "what", "which", "who", "written"
        ]);

        const queryTokens = query
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter(t => t.length > 1 && !stopWords.has(t));

        // 1. Exact or Bidirectional Substring Matches (Title, Author, Category)
        const matched = books.filter(book => {
            const title = String(book.title || "").toLowerCase();
            const author = String(book.author || "").toLowerCase();
            const category = String(book.category || "").toLowerCase();

            // Direct substring match
            if (title.includes(query) || author.includes(query) || category.includes(query)) {
                return true;
            }

            // Bidirectional: Does user message contain the full title, author, or category?
            if (title.length > 2 && query.includes(title)) return true;
            if (author.length > 2 && query.includes(author)) return true;
            if (category.length > 2 && query.includes(category)) return true;

            // Token overlap
            if (queryTokens.length > 0) {
                const bookText = `${title} ${author} ${category}`.toLowerCase();
                const matchedTokens = queryTokens.filter(t => bookText.includes(t));
                // If all tokens or majority match
                return matchedTokens.length === queryTokens.length || 
                       (queryTokens.length >= 2 && matchedTokens.length >= 2);
            }

            return false;
        });

        return matched;
    }

    // Main Bot Response Logic
    function getBotResponse(rawMessage) {
        const query = rawMessage.toLowerCase().trim();

        // 1. English filter
        if (!/^[\x00-\x7F]*$/.test(rawMessage)) {
            return "Please ask your question in English. I can help you search the library catalog.";
        }

        // 2. Greetings
        if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))\b/i.test(query)) {
            return `Hello! I am your Smart Library Assistant, connected to our live PostgreSQL database.\n\nWe currently have ${books.length} titles in the collection. You can ask me to search titles, check stock, find authors, or recommend books!`;
        }

        // 3. Help
        if (query === "help" || query.includes("what can you do") || query.includes("how to use")) {
            return "Here are things you can ask me:\n\n" +
                   "• Show all books\n" +
                   "• Do you have [book title]?\n" +
                   "• Books by [author name]\n" +
                   "• Show [category] books (e.g. Programming, Biography, AI)\n" +
                   "• Is [book title] available?\n" +
                   "• List all categories\n" +
                   "• Total books count";
        }

        // 4. Catalog Empty Warning
        if (books.length === 0) {
            return "The library catalog is currently empty. Once books are added by the administrator, they will appear here automatically.";
        }

        // 5. Show All Books
        if (
            query.includes("show all books") || 
            query.includes("list all books") || 
            query === "all books" ||
            query === "books"
        ) {
            return `Here is our complete library collection (${books.length} titles):\n\n` +
                   books.map(formatBook).join("\n\n");
        }

        // 6. List Categories
        if (
            query.includes("category") || 
            query.includes("categories") ||
            query === "subjects"
        ) {
            const categories = [
                ...new Set(books.map(b => b.category).filter(c => c && c.trim() !== ""))
            ].sort();

            if (query.includes("list") || query.includes("show") || query === "categories" || query.includes("all categories")) {
                return `We have books across ${categories.length} categories:\n\n` +
                       categories.map(c => `• ${c} (${books.filter(b => b.category === c).length} titles)`).join("\n");
            }
        }

        // 7. Total Books Count
        if (
            query.includes("how many books") || 
            query.includes("total books") || 
            query.includes("number of books") ||
            query.includes("catalog size")
        ) {
            const totalStock = books.reduce((sum, b) => sum + (b.quantity || 0), 0);
            const totalAvailable = books.reduce((sum, b) => sum + (b.availableCopies || 0), 0);
            return `Our library currently features ${books.length} unique titles with ${totalStock} total copies (${totalAvailable} available on shelf right now).`;
        }

        // 8. Available Books Check
        if (
            query === "show available books" || 
            query === "list available books" || 
            query === "what books are available"
        ) {
            const avail = books.filter(b => b.availableCopies > 0);
            return `Books currently available for checkout (${avail.length} titles):\n\n` +
                   avail.map(formatBook).join("\n\n");
        }

        // 9. Specific Availability Questions (e.g. "is Bahadur Pranav available?", "how many copies of Clean Code?")
        if (
            query.includes("available") || 
            query.includes("availability") || 
            query.includes("copies") ||
            query.includes("in stock")
        ) {
            const matches = searchBooks(query);
            if (matches.length > 0) {
                return matches.map(b => {
                    const copies = b.availableCopies !== undefined ? b.availableCopies : b.quantity;
                    if (copies > 0) {
                        return `✅ "${b.title}" is AVAILABLE!\nWe have ${copies} copy/copies ready for checkout.`;
                    } else {
                        return `❌ "${b.title}" is currently OUT OF STOCK (all copies are checked out).`;
                    }
                }).join("\n\n");
            }
        }

        // 10. Specific Author Searches (e.g. "books by Pranav Maske", "Robert Martin")
        if (query.includes("written by") || query.includes("books by") || query.includes("author")) {
            const matches = searchBooks(query);
            if (matches.length > 0) {
                return `Here are the matching books:\n\n` + matches.map(formatBook).join("\n\n");
            }
        }

        // 11. Recommendations (e.g. "recommend a programming book", "suggest biography")
        if (query.includes("recommend") || query.includes("suggest")) {
            const matches = searchBooks(query);
            if (matches.length > 0) {
                return `Here are our recommended picks from the collection:\n\n` + matches.map(formatBook).join("\n\n");
            }
            return "Please specify a category or topic you're interested in, such as Programming, Architecture, Biography, AI, or Databases.";
        }

        // 12. General Search for Title, Author, or Keyword
        const matches = searchBooks(query);
        if (matches.length > 0) {
            return `Found ${matches.length} matching book(s) in our catalog:\n\n` +
                   matches.map(formatBook).join("\n\n");
        }

        // 13. Fallback Response
        return `I couldn't find any books matching "${rawMessage}" in our current collection.\n\n` +
               `• Try searching by a specific title (e.g., "Bahadur Pranav", "Clean Code")\n` +
               `• Or by author (e.g., "Pranav Maske", "Martin Fowler")\n` +
               `• Or ask "show all books" to browse the entire collection.`;
    }

    // Process outgoing user message
    async function sendMessage() {
        if (!userInput) return;
        const message = userInput.value.trim();
        if (message === "") return;

        // Post user message
        addMessage(message, "user");
        userInput.value = "";

        // Re-sync with live Neon PostgreSQL before replying (ensures newly added books are immediately known)
        await syncBooksFromDatabase();

        // Generate response
        const response = getBotResponse(message);
        addMessage(response, "bot");
    }

    // Wire form submit event (prevents page refresh)
    if (chatForm) {
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await sendMessage();
        });
    }

    // Wire enter key on input
    if (userInput) {
        userInput.addEventListener("keydown", async (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                await sendMessage();
            }
        });
    }

    // Wire suggestion pills
    suggestionButtons.forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!userInput) return;
            userInput.value = btn.textContent.trim();
            await sendMessage();
        });
    });

    // Wire clear chat button
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (!messagesBox) return;
            messagesBox.innerHTML = "";
            addMessage(
                "Hello! Welcome to Smart Library. I am your Library Assistant, connected live to our PostgreSQL database. How can I help you today?",
                "bot"
            );
        });
    }

    // Initial database synchronization on page load
    syncBooksFromDatabase();

    console.log("Smart Library Assistant Initialized with Live Neon PostgreSQL Sync.");

});
