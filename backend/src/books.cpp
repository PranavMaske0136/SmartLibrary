#include <iostream>
#include <vector>
#include <string>
#include <cstdlib>
#include <libpq-fe.h>
#include "books.h"
#include "database.h"

using namespace std;

bool addBook(const string& title, const string& author, const string& category, int quantity)
{
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Books] No database connection available." << endl;
        return false;
    }

    const char* sql = "INSERT INTO books (title, author, category, quantity, available_copies) "
                      "VALUES ($1, $2, $3, $4, $4);";

    string qtyStr = to_string(quantity);
    const char* paramValues[4] = { title.c_str(), author.c_str(), category.c_str(), qtyStr.c_str() };

    PGresult* res = PQexecParams(
        conn,
        sql,
        4,
        NULL,
        paramValues,
        NULL,
        NULL,
        0
    );

    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        cerr << "[Books Error] Failed to add book: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        return false;
    }

    PQclear(res);
    cout << "[Books] Successfully added book: '" << title << "' by " << author << endl;
    return true;
}

vector<BookRecord> getAllBooks()
{
    vector<BookRecord> bookList;
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Books] No database connection available." << endl;
        return bookList;
    }

    const char* sql = "SELECT id, title, author, category, quantity, available_copies FROM books ORDER BY id ASC;";
    PGresult* res = PQexec(conn, sql);

    if (PQresultStatus(res) != PGRES_TUPLES_OK) {
        cerr << "[Books Error] Failed to fetch books: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        return bookList;
    }

    int rows = PQntuples(res);
    for (int i = 0; i < rows; ++i) {
        BookRecord book;
        book.id = atoi(PQgetvalue(res, i, 0));
        book.title = PQgetvalue(res, i, 1);
        book.author = PQgetvalue(res, i, 2);
        book.category = PQgetvalue(res, i, 3);
        book.quantity = atoi(PQgetvalue(res, i, 4));
        book.availableCopies = atoi(PQgetvalue(res, i, 5));

        bookList.push_back(book);
    }

    PQclear(res);
    return bookList;
}

vector<BookRecord> searchBooks(const string& keyword)
{
    vector<BookRecord> results;
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Books] No database connection available." << endl;
        return results;
    }

    const char* sql = "SELECT id, title, author, category, quantity, available_copies FROM books "
                      "WHERE title ILIKE '%' || $1 || '%' OR author ILIKE '%' || $1 || '%' OR category ILIKE '%' || $1 || '%' "
                      "ORDER BY id ASC;";

    const char* paramValues[1] = { keyword.c_str() };

    PGresult* res = PQexecParams(conn, sql, 1, NULL, paramValues, NULL, NULL, 0);

    if (PQresultStatus(res) != PGRES_TUPLES_OK) {
        cerr << "[Books Error] Search failed: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        return results;
    }

    int rows = PQntuples(res);
    for (int i = 0; i < rows; ++i) {
        BookRecord book;
        book.id = atoi(PQgetvalue(res, i, 0));
        book.title = PQgetvalue(res, i, 1);
        book.author = PQgetvalue(res, i, 2);
        book.category = PQgetvalue(res, i, 3);
        book.quantity = atoi(PQgetvalue(res, i, 4));
        book.availableCopies = atoi(PQgetvalue(res, i, 5));

        results.push_back(book);
    }

    PQclear(res);
    return results;
}

bool updateBookStock(int bookId, int delta)
{
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Books] No database connection available." << endl;
        return false;
    }

    const char* sql = "UPDATE books SET available_copies = available_copies + $1 "
                      "WHERE id = $2 AND (available_copies + $1) >= 0 AND (available_copies + $1) <= quantity;";

    string deltaStr = to_string(delta);
    string idStr = to_string(bookId);
    const char* paramValues[2] = { deltaStr.c_str(), idStr.c_str() };

    PGresult* res = PQexecParams(conn, sql, 2, NULL, paramValues, NULL, NULL, 0);

    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        cerr << "[Books Error] Failed to update stock: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        return false;
    }

    char* affected = PQcmdTuples(res);
    bool ok = (affected && atoi(affected) > 0);
    PQclear(res);

    return ok;
}

