/* =============================================================================
   SMART LIBRARY - CENTRAL BOOK DATASET (POSTGRESQL SYNCHRONIZED)
   Contains the initial 25 library books matching the backend PostgreSQL database.
============================================================================= */

window.libraryBooks = [
    {
        id: 1,
        title: "Clean Code",
        author: "Robert C. Martin",
        category: "Programming",
        quantity: 5,
        availableCopies: 5
    },
    {
        id: 2,
        title: "The Pragmatic Programmer",
        author: "Andrew Hunt & David Thomas",
        category: "Programming",
        quantity: 4,
        availableCopies: 4
    },
    {
        id: 3,
        title: "Introduction to Algorithms",
        author: "Thomas H. Cormen",
        category: "Computer Science",
        quantity: 6,
        availableCopies: 6
    },
    {
        id: 4,
        title: "Design Patterns",
        author: "Erich Gamma et al.",
        category: "Software Architecture",
        quantity: 4,
        availableCopies: 3
    },
    {
        id: 5,
        title: "Structure and Interpretation of Computer Programs",
        author: "Harold Abelson",
        category: "Computer Science",
        quantity: 3,
        availableCopies: 3
    },
    {
        id: 6,
        title: "Artificial Intelligence: A Modern Approach",
        author: "Stuart Russell & Peter Norvig",
        category: "Artificial Intelligence",
        quantity: 5,
        availableCopies: 5
    },
    {
        id: 7,
        title: "Operating System Concepts",
        author: "Abraham Silberschatz",
        category: "Operating Systems",
        quantity: 5,
        availableCopies: 4
    },
    {
        id: 8,
        title: "Computer Networking: A Top-Down Approach",
        author: "James F. Kurose",
        category: "Networking",
        quantity: 4,
        availableCopies: 4
    },
    {
        id: 9,
        title: "Database System Concepts",
        author: "Abraham Silberschatz",
        category: "Databases",
        quantity: 5,
        availableCopies: 5
    },
    {
        id: 10,
        title: "The C++ Programming Language",
        author: "Bjarne Stroustrup",
        category: "Programming",
        quantity: 4,
        availableCopies: 4
    },
    {
        id: 11,
        title: "Head First Design Patterns",
        author: "Eric Freeman",
        category: "Software Architecture",
        quantity: 3,
        availableCopies: 2
    },
    {
        id: 12,
        title: "Refactoring",
        author: "Martin Fowler",
        category: "Software Architecture",
        quantity: 4,
        availableCopies: 4
    },
    {
        id: 13,
        title: "Code Complete",
        author: "Steve McConnell",
        category: "Software Engineering",
        quantity: 4,
        availableCopies: 4
    },
    {
        id: 14,
        title: "Cracking the Coding Interview",
        author: "Gayle Laakmann McDowell",
        category: "Interview Prep",
        quantity: 7,
        availableCopies: 6
    },
    {
        id: 15,
        title: "Deep Learning",
        author: "Ian Goodfellow",
        category: "Artificial Intelligence",
        quantity: 3,
        availableCopies: 3
    },
    {
        id: 16,
        title: "Designing Data-Intensive Applications",
        author: "Martin Kleppmann",
        category: "Distributed Systems",
        quantity: 5,
        availableCopies: 5
    },
    {
        id: 17,
        title: "Effective Modern C++",
        author: "Scott Meyers",
        category: "Programming",
        quantity: 4,
        availableCopies: 3
    },
    {
        id: 18,
        title: "Modern Operating Systems",
        author: "Andrew S. Tanenbaum",
        category: "Operating Systems",
        quantity: 4,
        availableCopies: 4
    },
    {
        id: 19,
        title: "Compilers: Principles, Techniques, and Tools",
        author: "Alfred V. Aho",
        category: "Computer Science",
        quantity: 3,
        availableCopies: 3
    },
    {
        id: 20,
        title: "Hands-On Machine Learning with Scikit-Learn and TensorFlow",
        author: "Aurélien Géron",
        category: "Machine Learning",
        quantity: 5,
        availableCopies: 4
    },
    {
        id: 21,
        title: "Clean Architecture",
        author: "Robert C. Martin",
        category: "Software Architecture",
        quantity: 5,
        availableCopies: 5
    },
    {
        id: 22,
        title: "Programming Pearls",
        author: "Jon Bentley",
        category: "Computer Science",
        quantity: 3,
        availableCopies: 3
    },
    {
        id: 23,
        title: "The Mythical Man-Month",
        author: "Frederick P. Brooks Jr.",
        category: "Project Management",
        quantity: 4,
        availableCopies: 4
    },
    {
        id: 24,
        title: "You Don't Know JS Yet",
        author: "Kyle Simpson",
        category: "Web Development",
        quantity: 6,
        availableCopies: 6
    },
    {
        id: 25,
        title: "Patterns of Enterprise Application Architecture",
        author: "Martin Fowler",
        category: "Software Architecture",
        quantity: 3,
        availableCopies: 3
    }
];

// Validate dataset
function validateLibraryBooks(bookArray) {
    const validBooks = [];
    const usedIds = new Set();
    let invalidCount = 0;

    bookArray.forEach((book, index) => {
        const errors = [];

        if (!book || typeof book !== "object") {
            errors.push("Invalid book record");
        } else {
            if (book.id === undefined || book.id === null || book.id === "") {
                errors.push("Missing book ID");
            }
            if (typeof book.title !== "string" || !book.title.trim()) {
                errors.push("Missing book title");
            }
            if (typeof book.author !== "string" || !book.author.trim()) {
                errors.push("Missing author name");
            }
            if (
                book.availableCopies !== undefined &&
                (!Number.isInteger(book.availableCopies) || book.availableCopies < 0)
            ) {
                errors.push("Invalid availableCopies value");
            }
            if (
                book.quantity !== undefined &&
                (!Number.isInteger(book.quantity) || book.quantity < 0)
            ) {
                errors.push("Invalid quantity value");
            }
            if (
                book.quantity !== undefined &&
                book.availableCopies !== undefined &&
                book.availableCopies > book.quantity
            ) {
                errors.push("Available copies cannot exceed quantity");
            }
            if (book.id !== undefined && book.id !== null) {
                const id = String(book.id);
                if (usedIds.has(id)) {
                    errors.push("Duplicate book ID");
                } else {
                    usedIds.add(id);
                }
            }
        }

        if (errors.length === 0) {
            validBooks.push(book);
        } else {
            invalidCount++;
            console.warn(`Book record ${index + 1} is invalid:`, errors);
        }
    });

    console.log("Dataset Validation Complete");
    console.log("Total records:", bookArray.length);
    console.log("Valid records:", validBooks.length);
    console.log("Invalid records:", invalidCount);

    return validBooks;
}

// Keep only valid records
window.libraryBooks = validateLibraryBooks(window.libraryBooks);

// Dataset information
window.libraryDatasetInfo = {
    totalBooks: window.libraryBooks.length,
    language: "English",
    source: "Smart Library PostgreSQL Synced Catalog"
};

console.log("Smart Library Dataset Loaded:", window.libraryBooks.length, "books");
