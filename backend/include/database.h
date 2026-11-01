#ifndef SMARTLIBRARY_DATABASE_H
#define SMARTLIBRARY_DATABASE_H

#include <string>
#include <libpq-fe.h>

/**
 * Global database connection pointer.
 */
extern PGconn* dbConn;

/**
 * Establishes a connection to the PostgreSQL database.
 * If conninfo is empty, it automatically attempts to read:
 * 1. The DATABASE_URL environment variable.
 * 2. Standard PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD environment variables.
 * 
 * @param conninfo Optional connection URI or keyword string.
 * @return True if connection was successful, false otherwise.
 */
bool connectDatabase(const std::string& conninfo = "");

/**
 * Safely closes the active PostgreSQL connection and releases memory.
 */
void closeDatabase();

/**
 * Returns the active PGconn handle.
 */
PGconn* getDatabaseConnection();

/**
 * Executes a simple SQL command (without parameters).
 * 
 * @param sql The SQL statement to run.
 * @return True on success (PGRES_COMMAND_OK or PGRES_TUPLES_OK), false on failure.
 */
bool executeSimpleQuery(const std::string& sql);

#endif // SMARTLIBRARY_DATABASE_H

