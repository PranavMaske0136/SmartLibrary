#include <iostream>
#include <cstdlib>
#include <string>
#include <libpq-fe.h>
#include "database.h"

using namespace std;

// Global connection handle
PGconn* dbConn = NULL;

bool connectDatabase(const std::string& conninfo)
{
    string targetConnStr = conninfo;

    // If no explicit connection string was passed, attempt to read from environment
    if (targetConnStr.empty())
    {
        const char* envUrl = getenv("DATABASE_URL");
        if (envUrl != NULL && string(envUrl).length() > 0)
        {
            targetConnStr = envUrl;
        }
    }

    if (targetConnStr.empty())
    {
        cout << "[Database] No explicit connection string or DATABASE_URL found." << endl;
        cout << "[Database] Attempting connection via standard PostgreSQL environment variables or localhost default..." << endl;
        targetConnStr = "dbname=postgres";
    }

    cout << "[Database] Connecting to PostgreSQL..." << endl;

    dbConn = PQconnectdb(targetConnStr.c_str());

    if (PQstatus(dbConn) != CONNECTION_OK)
    {
        cerr << "[Database Error] Connection to PostgreSQL failed:" << endl;
        cerr << "  " << PQerrorMessage(dbConn) << endl;
        cerr << "[Hint] If connecting to a cloud database (Neon/Supabase), ensure:" << endl;
        cerr << "  1. DATABASE_URL is set in your environment (e.g. $env:DATABASE_URL=\"...\")." << endl;
        cerr << "  2. The connection string includes '?sslmode=require'." << endl;
        cerr << "  3. Your network allows outbound TCP connections on port 5432 or 6543." << endl;

        closeDatabase();
        return false;
    }

    cout << "[Database] Successfully connected to PostgreSQL!" << endl;
    cout << "  Server Protocol Version: " << PQprotocolVersion(dbConn) << endl;
    cout << "  Server Version:          " << PQserverVersion(dbConn) << endl;

    return true;
}

void closeDatabase()
{
    if (dbConn != NULL)
    {
        PQfinish(dbConn);
        dbConn = NULL;
        cout << "[Database] Connection closed." << endl;
    }
}

PGconn* getDatabaseConnection()
{
    return dbConn;
}

bool executeSimpleQuery(const std::string& sql)
{
    if (dbConn == NULL)
    {
        cerr << "[Database Error] Cannot execute query: No active database connection." << endl;
        return false;
    }

    PGresult* res = PQexec(dbConn, sql.c_str());
    ExecStatusType status = PQresultStatus(res);

    if (status != PGRES_COMMAND_OK && status != PGRES_TUPLES_OK)
    {
        cerr << "[Database Query Error] " << PQerrorMessage(dbConn) << endl;
        PQclear(res);
        return false;
    }

    PQclear(res);
    return true;
}
