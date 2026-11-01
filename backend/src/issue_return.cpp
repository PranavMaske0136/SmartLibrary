#include <iostream>
#include <vector>
#include <string>
#include <cstdlib>
#include <libpq-fe.h>
#include "issue_return.h"
#include "database.h"

using namespace std;

bool issueBook(int bookId, int studentId, int loanDays)
{
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Circulation] No database connection available." << endl;
        return false;
    }

    // Begin PostgreSQL Transaction
    PGresult* res = PQexec(conn, "BEGIN;");
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        cerr << "[Circulation Error] Could not begin transaction: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        return false;
    }
    PQclear(res);

    // 1. Verify available copies > 0 with row lock
    string checkSql = "SELECT available_copies FROM books WHERE id = $1 FOR UPDATE;";
    string bookIdStr = to_string(bookId);
    const char* bookParam[1] = { bookIdStr.c_str() };

    res = PQexecParams(conn, checkSql.c_str(), 1, NULL, bookParam, NULL, NULL, 0);
    if (PQresultStatus(res) != PGRES_TUPLES_OK || PQntuples(res) == 0) {
        cerr << "[Circulation Error] Book not found (ID: " << bookId << ")." << endl;
        PQclear(res);
        PQexec(conn, "ROLLBACK;");
        return false;
    }

    int available = atoi(PQgetvalue(res, 0, 0));
    PQclear(res);

    if (available <= 0) {
        cerr << "[Circulation] Book (ID: " << bookId << ") has no available copies to lend." << endl;
        PQexec(conn, "ROLLBACK;");
        return false;
    }

    // 2. Insert into issue_returns table
    string issueSql = "INSERT INTO issue_returns (book_id, student_id, issue_date, due_date, status) "
                      "VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + ($3 || ' days')::INTERVAL, 'issued');";
    string studentIdStr = to_string(studentId);
    string daysStr = to_string(loanDays);
    const char* issueParams[3] = { bookIdStr.c_str(), studentIdStr.c_str(), daysStr.c_str() };

    res = PQexecParams(conn, issueSql.c_str(), 3, NULL, issueParams, NULL, NULL, 0);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        cerr << "[Circulation Error] Failed to record issue transaction: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        PQexec(conn, "ROLLBACK;");
        return false;
    }
    PQclear(res);

    // 3. Decrement available_copies
    string decSql = "UPDATE books SET available_copies = available_copies - 1 WHERE id = $1;";
    res = PQexecParams(conn, decSql.c_str(), 1, NULL, bookParam, NULL, NULL, 0);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        cerr << "[Circulation Error] Failed to decrement book stock: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        PQexec(conn, "ROLLBACK;");
        return false;
    }
    PQclear(res);

    // Commit Transaction
    res = PQexec(conn, "COMMIT;");
    PQclear(res);

    cout << "[Circulation] Successfully issued Book ID " << bookId << " to Student ID " << studentId << "." << endl;
    return true;
}

bool returnBook(int issueId)
{
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Circulation] No database connection available." << endl;
        return false;
    }

    // Begin PostgreSQL Transaction
    PGresult* res = PQexec(conn, "BEGIN;");
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        cerr << "[Circulation Error] Could not begin transaction: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        return false;
    }
    PQclear(res);

    // 1. Fetch book_id and check status
    string fetchSql = "SELECT book_id, status FROM issue_returns WHERE id = $1 FOR UPDATE;";
    string issueIdStr = to_string(issueId);
    const char* issueParam[1] = { issueIdStr.c_str() };

    res = PQexecParams(conn, fetchSql.c_str(), 1, NULL, issueParam, NULL, NULL, 0);
    if (PQresultStatus(res) != PGRES_TUPLES_OK || PQntuples(res) == 0) {
        cerr << "[Circulation Error] Issue record not found (ID: " << issueId << ")." << endl;
        PQclear(res);
        PQexec(conn, "ROLLBACK;");
        return false;
    }

    int bookId = atoi(PQgetvalue(res, 0, 0));
    string status = PQgetvalue(res, 0, 1);
    PQclear(res);

    if (status == "returned") {
        cout << "[Circulation] Book issue ID " << issueId << " was already marked as returned." << endl;
        PQexec(conn, "ROLLBACK;");
        return true;
    }

    // 2. Mark as returned
    string returnSql = "UPDATE issue_returns SET status = 'returned', return_date = CURRENT_DATE WHERE id = $1;";
    res = PQexecParams(conn, returnSql.c_str(), 1, NULL, issueParam, NULL, NULL, 0);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        cerr << "[Circulation Error] Failed to update issue status: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        PQexec(conn, "ROLLBACK;");
        return false;
    }
    PQclear(res);

    // 3. Increment book available_copies
    string incSql = "UPDATE books SET available_copies = available_copies + 1 WHERE id = $1;";
    string bookIdStr = to_string(bookId);
    const char* bookParam[1] = { bookIdStr.c_str() };

    res = PQexecParams(conn, incSql.c_str(), 1, NULL, bookParam, NULL, NULL, 0);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        cerr << "[Circulation Error] Failed to increment book stock: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        PQexec(conn, "ROLLBACK;");
        return false;
    }
    PQclear(res);

    // Commit Transaction
    res = PQexec(conn, "COMMIT;");
    PQclear(res);

    cout << "[Circulation] Successfully processed return for Issue ID " << issueId << "." << endl;
    return true;
}

vector<IssueRecord> getActiveIssuedBooks()
{
    vector<IssueRecord> list;
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Circulation] No database connection available." << endl;
        return list;
    }

    const char* sql =
        "SELECT ir.id, ir.book_id, b.title, ir.student_id, s.name, "
        "       ir.issue_date::text, ir.due_date::text, COALESCE(ir.return_date::text, 'Not Returned'), "
        "       ir.status, ir.fine "
        "FROM issue_returns ir "
        "JOIN books b ON ir.book_id = b.id "
        "JOIN students s ON ir.student_id = s.id "
        "WHERE ir.status = 'issued' "
        "ORDER BY ir.id DESC;";

    PGresult* res = PQexec(conn, sql);
    if (PQresultStatus(res) != PGRES_TUPLES_OK) {
        cerr << "[Circulation Error] Query failed: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        return list;
    }

    int rows = PQntuples(res);
    for (int i = 0; i < rows; ++i) {
        IssueRecord rec;
        rec.id = atoi(PQgetvalue(res, i, 0));
        rec.bookId = atoi(PQgetvalue(res, i, 1));
        rec.bookTitle = PQgetvalue(res, i, 2);
        rec.studentId = atoi(PQgetvalue(res, i, 3));
        rec.studentName = PQgetvalue(res, i, 4);
        rec.issueDate = PQgetvalue(res, i, 5);
        rec.dueDate = PQgetvalue(res, i, 6);
        rec.returnDate = PQgetvalue(res, i, 7);
        rec.status = PQgetvalue(res, i, 8);
        rec.fine = atof(PQgetvalue(res, i, 9));

        list.push_back(rec);
    }

    PQclear(res);
    return list;
}

