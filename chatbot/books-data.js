
/* =====================================
   SMART LIBRARY - COMMON BOOK DATASET
===================================== */

// Add actual library book records inside this array.
// Do not add imaginary book records.

window.libraryBooks = [

    // Example structure (replace with actual records later):
    /*
    {
        id: 1,
        title: "Actual Book Title",
        author: "Actual Author",
        category: "Programming",
        quantity: 3,
        availableCopies: 2
    }
    */

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
                (!Number.isInteger(book.availableCopies) ||
                 book.availableCopies < 0)
            ) {
                errors.push("Invalid availableCopies value");
            }

            if (
                book.quantity !== undefined &&
                (!Number.isInteger(book.quantity) ||
                 book.quantity < 0)
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

            console.warn(
                `Book record ${index + 1} is invalid:`,
                errors
            );
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
    source: "Smart Library Collection"
};

console.log(
    "Smart Library Dataset Loaded:",
    window.libraryBooks.length,
    "books"
);
