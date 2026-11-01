#include <iostream>
#include <vector>
#include <iomanip>
#include "database.h"
#include "books.h"
#include "students.h"
#include "issue_return.h"

using namespace std;

int main()
{
    cout << "==========================================================" << endl;
    cout << "       SMART LIBRARY C++ BACKEND (POSTGRESQL EDITION)     " << endl;
    cout << "          With Registration & Authentication Engine       " << endl;
    cout << "==========================================================" << endl;

    if (!connectDatabase())
    {
        cerr << "\n[Fatal] Could not establish connection to PostgreSQL." << endl;
        cerr << "[Action Required] Please set your DATABASE_URL environment variable:" << endl;
        cerr << "  PowerShell:" << endl;
        cerr << "    $env:DATABASE_URL=\"postgresql://user:password@your-host:5432/dbname?sslmode=require\"" << endl;
        cerr << "    .\\smartlibrary_server.exe" << endl;
        return 1;
    }

    cout << "\n--- 1. Testing Registered Users & Authentication ---" << endl;
    vector<StudentRecord> students = getAllStudents();
    cout << "Total registered users: " << students.size() << endl;
    for (const auto& s : students) {
        cout << "  - " << s.studentId << ": " << s.name 
             << " <" << s.email << "> [Role: " << s.role << "]" << endl;
    }

    // Demo: Authenticate Existing Student
    cout << "\n[Auth Test] Authenticating 'john.doe@student.edu' with password 'password123'..." << endl;
    StudentRecord authUser;
    if (authenticateUser("john.doe@student.edu", "password123", authUser)) {
        cout << "  -> Authentication SUCCESSFUL! Logged in as: " << authUser.name << " (" << authUser.role << ")" << endl;
    } else {
        cout << "  -> Authentication FAILED." << endl;
    }

    // Demo: Authenticate with invalid password
    cout << "[Auth Test] Authenticating 'john.doe@student.edu' with INVALID password..." << endl;
    if (authenticateUser("john.doe@student.edu", "wrongpassword", authUser)) {
        cout << "  -> Authentication SUCCESSFUL (Unexpected)!" << endl;
    } else {
        cout << "  -> Authentication correctly REJECTED (Invalid credentials)." << endl;
    }

    cout << "\n--- 2. Fetching Library Books Catalog ---" << endl;
    vector<BookRecord> books = getAllBooks();
    cout << "Total books found: " << books.size() << endl;

    int displayLimit = min((int)books.size(), 5);
    for (int i = 0; i < displayLimit; ++i) {
        cout << "  [" << books[i].id << "] " << books[i].title 
             << " | " << books[i].author 
             << " (" << books[i].category << ") "
             << " - Available: " << books[i].availableCopies << "/" << books[i].quantity << endl;
    }
    if (books.size() > 5) {
        cout << "  ... and " << (books.size() - 5) << " more books." << endl;
    }

    cout << "\n--- 3. Active Circulations (Borrowed Books) ---" << endl;
    vector<IssueRecord> activeIssues = getActiveIssuedBooks();
    cout << "Total active issues: " << activeIssues.size() << endl;
    for (const auto& issue : activeIssues) {
        cout << "  - Issue #" << issue.id << ": '" << issue.bookTitle 
             << "' issued to " << issue.studentName 
             << " (Due: " << issue.dueDate << ")" << endl;
    }

    cout << "\n[System Status] Smart Library C++ PostgreSQL Engine is fully operational!" << endl;
    cout << "==========================================================" << endl;

    closeDatabase();
    return 0;
}
