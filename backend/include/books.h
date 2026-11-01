#ifndef SMARTLIBRARY_BOOKS_H
#define SMARTLIBRARY_BOOKS_H

#include <string>
#include <vector>

struct BookRecord {
    int id;
    std::string title;
    std::string author;
    std::string category;
    int quantity;
    int availableCopies;
};

/**
 * Inserts a new book into the PostgreSQL books table using parameterized queries.
 */
bool addBook(const std::string& title, const std::string& author, const std::string& category, int quantity);

/**
 * Retrieves all books currently stored in the database and prints them to stdout.
 */
std::vector<BookRecord> getAllBooks();

/**
 * Searches books by keyword (matches title, author, or category).
 */
std::vector<BookRecord> searchBooks(const std::string& keyword);

/**
 * Updates the available copies count of a book.
 * @param bookId The ID of the book.
 * @param delta Positive number to increase stock (e.g. +1), negative to decrease (e.g. -1).
 */
bool updateBookStock(int bookId, int delta);

#endif // SMARTLIBRARY_BOOKS_H

