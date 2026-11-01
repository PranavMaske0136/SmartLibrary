
#include <iostream>
#include <string>
#include "sqlite3.h"

using namespace std;

sqlite3* db = NULL;

bool connectDatabase()
{
    int result = sqlite3_open("database/library.db", &db);

    if (result != SQLITE_OK)
    {
        cout << "Database connection failed: "
             << sqlite3_errmsg(db) << endl;

        return false;
    }

    cout << "Database connected successfully!" << endl;

    return true;
}

void closeDatabase()
{
    if (db != NULL)
    {
        sqlite3_close(db);
        db = NULL;
    }
}
