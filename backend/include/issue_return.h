#ifndef SMARTLIBRARY_ISSUE_RETURN_H
#define SMARTLIBRARY_ISSUE_RETURN_H

#include <string>
#include <vector>

struct IssueRecord {
    int id;
    int bookId;
    std::string bookTitle;
    int studentId;
    std::string studentName;
    std::string issueDate;
    std::string dueDate;
    std::string returnDate;
    std::string status;
    double fine;
};

/**
 * Issues a book to a student atomically using a PostgreSQL transaction.
 * Checks available_copies, inserts an issue record, and decrements available_copies.
 */
bool issueBook(int bookId, int studentId, int loanDays = 14);

/**
 * Returns an issued book atomically using a PostgreSQL transaction.
 * Updates issue status to 'returned', sets return_date, and increments available_copies.
 */
bool returnBook(int issueId);

/**
 * Displays all active/pending borrowed books.
 */
std::vector<IssueRecord> getActiveIssuedBooks();

#endif // SMARTLIBRARY_ISSUE_RETURN_H

