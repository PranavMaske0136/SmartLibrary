/* =====================================
   SMART LIBRARY - RULE-BASED CHATBOT
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    // Find chatbot elements
    const messagesBox =
        document.getElementById("chatMessages") ||
        document.querySelector(".chat-messages");

    const userInput =
        document.getElementById("userInput") ||
        document.getElementById("messageInput") ||
        document.querySelector("input[type='text'], textarea");

    const sendButton =
        document.getElementById("sendButton") ||
        document.getElementById("sendBtn") ||
        document.querySelector(".send-btn");

    const clearButton =
        document.getElementById("clearChatBtn") ||
        document.getElementById("clearChat");

    const suggestionButtons =
        document.querySelectorAll(".suggestion-btn");

    // Check whether required HTML elements exist
    if (!messagesBox || !userInput || !sendButton) {
        console.error(
            "Chatbot error: Required HTML elements were not found. Check chatbot.html IDs."
        );
        return;
    }

    // Get actual book records from books-data.js
    const books = Array.isArray(window.libraryBooks)
        ? window.libraryBooks
        : [];

    // Add a message to the chat safely
    function addMessage(message, sender) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);

        const textElement = document.createElement("p");
        textElement.textContent = message;

        messageElement.appendChild(textElement);
        messagesBox.appendChild(messageElement);

        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    // Display book information using only available fields
    function formatBook(book) {
        let details = `Title: ${book.title || "Not available"}`;

        if (book.author) {
            details += `\nAuthor: ${book.author}`;
        }

        if (book.category) {
            details += `\nCategory: ${book.category}`;
        }

        if (typeof book.availableCopies === "number") {
            details += `\nAvailable copies: ${book.availableCopies}`;
        }

        return details;
    }

    // Search books by title, author, or category
    function searchBooks(query) {
        const searchText = query.toLowerCase().trim();

        return books.filter(book => {
            const title = String(book.title || "").toLowerCase();
            const author = String(book.author || "").toLowerCase();
            const category = String(book.category || "").toLowerCase();

            return (
                title.includes(searchText) ||
                author.includes(searchText) ||
                category.includes(searchText)
            );
        });
    }

    // Generate chatbot response
  
function getBotResponse(message) {

    const query = message.toLowerCase().trim();

    // English-only chatbot
    if (!/^[\x00-\x7F]*$/.test(message)) {
        return "Please ask your question in English. I can help you search the library books.";
    }

    // Help command
    if (
        query === "help" ||
        query === "what can you do" ||
        query.includes("what can i ask")
    ) {
        return "I can help you with:\n\n1. Show all books\n2. Search books by title\n3. Search books by author\n4. List all categories\n5. Check book availability\n6. Recommend books\n\nTry asking: Show all books.";
    }

    // Empty dataset check
    if (books.length === 0) {
        return "The library book collection has not been added yet. Please try again after book records are added to the library dataset.";
    }

    // Greeting
    if (/^(hi|hello|hey)\b/.test(query)) {
        return "Hello! I am your Smart Library Assistant. Ask me about books, authors, categories, or availability.";
    }

    // Show all books
    if (
        query.includes("show all books") ||
        query.includes("list all books") ||
        query === "all books"
    ) {
        return "Here are all books in the library:\n\n" +
            books.map(formatBook).join("\n\n");
    }

    // List categories
    if (
        query.includes("list categories") ||
        query.includes("show categories") ||
        query.includes("all categories")
    ) {
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

        if (categories.length === 0) {
            return "Category information is not available in the library dataset.";
        }

        return "Available book categories:\n\n" +
            categories.map(category => "- " + category).join("\n");
    }

    // Count total book records
    if (
        query.includes("how many books") ||
        query.includes("total books") ||
        query.includes("number of books")
    ) {
        return `There are ${books.length} book records in the library dataset.`;
    }

    // Count books with recorded availability
    if (
        query.includes("how many available") ||
        query.includes("available books count")
    ) {
        const knownAvailability = books.filter(
            book => typeof book.availableCopies === "number"
        );

        const availableCount = knownAvailability.filter(
            book => book.availableCopies > 0
        ).length;

        return `${availableCount} book records have available copies. Availability is recorded for ${knownAvailability.length} out of ${books.length} book records.`;
    }

    // Show available books
    if (
        query === "show available books" ||
        query === "list available books"
    ) {
        const availableBooks = books.filter(
            book =>
                typeof book.availableCopies === "number" &&
                book.availableCopies > 0
        );

        if (availableBooks.length === 0) {
            return "No books with recorded available copies were found.";
        }

        return "Books currently available:\n\n" +
            availableBooks.map(formatBook).join("\n\n");
    }

    // Show unavailable books
    if (
        query === "show unavailable books" ||
        query === "list unavailable books"
    ) {
        const unavailableBooks = books.filter(
            book =>
                typeof book.availableCopies === "number" &&
                book.availableCopies === 0
        );

        if (unavailableBooks.length === 0) {
            return "No books with zero available copies were found.";
        }

        return "Currently unavailable books:\n\n" +
            unavailableBooks.map(formatBook).join("\n\n");
    }

    // Recommend books
    if (
        query.includes("recommend") ||
        query.includes("suggest a book")
    ) {
        const categoryMatch = query.match(
            /(?:in|about|on|for)\s+(.+?)(?:\s+books?)?$/
        );

        if (!categoryMatch) {
            return "Please tell me a subject or category, such as Programming, Science, or History.";
        }

        const category = categoryMatch[1].trim();
        const matches = searchBooks(category);

        if (matches.length === 0) {
            return `I could not find books related to "${category}".`;
        }

        return "Here are books matching your request:\n\n" +
            matches.map(formatBook).join("\n\n");
    }

    // Search by author
    if (
        query.includes("author") ||
        query.includes("written by") ||
        query.includes("books by")
    ) {
        const authorQuery = query
            .replace(/find|search|show|list|books|book|by|author|written|what|are|the|of/gi, "")
            .trim();

        if (!authorQuery) {
            return "Please enter the author's name so I can search for their books.";
        }

        const matches = searchBooks(authorQuery);

        if (matches.length === 0) {
            return `I could not find books by "${authorQuery}".`;
        }

        return "Here are the matching books:\n\n" +
            matches.map(formatBook).join("\n\n");
    }

    // Search availability for a specific book
    if (
        query.includes("available") ||
        query.includes("availability") ||
        query.includes("copies")
    ) {
        const searchQuery = query
            .replace(/is|are|the|book|books|available|availability|copies|copy|how many|check|find|of/gi, "")
            .trim();

        if (!searchQuery) {
            return "Please provide a book title so I can check its availability.";
        }

        const matches = searchBooks(searchQuery);

        if (matches.length === 0) {
            return `I could not find "${searchQuery}" in the library collection.`;
        }

        return matches.map(book => {
            if (typeof book.availableCopies !== "number") {
                return `${book.title}: Availability information has not been provided.`;
            }

            return `${book.title}: ${
                book.availableCopies > 0
                    ? `${book.availableCopies} copies available.`
                    : "Currently unavailable."
            }`;
        }).join("\n\n");
    }

    // General book search
    const matches = searchBooks(query);

    if (matches.length > 0) {
        return "I found these matching books:\n\n" +
            matches.map(formatBook).join("\n\n");
    }

    return "Sorry, I could not find matching information in the library collection. Try searching with a book title, author name, or category.";
}

    // Handle sending a message
    function sendMessage() {
        const message = userInput.value.trim();

        if (message === "") {
            return;
        }

        addMessage(message, "user");
        userInput.value = "";

        const response = getBotResponse(message);
        addMessage(response, "bot");
    }

    // Send button
    sendButton.addEventListener("click", sendMessage);

    // Press Enter to send
    userInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    // Suggested question buttons
    suggestionButtons.forEach(button => {
        button.addEventListener("click", () => {
            userInput.value = button.textContent.trim();
            sendMessage();
        });
    });

    // Clear chat
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            messagesBox.innerHTML = "";
            addMessage(
                "Hello! I am your Smart Library Assistant. Ask me about books in the library collection.",
                "bot"
            );
        });
    }

    console.log("Smart Library Chatbot Loaded!");
    console.log("Books available to chatbot:", books.length);

});