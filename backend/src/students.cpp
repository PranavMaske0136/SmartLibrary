#include <iostream>
#include <vector>
#include <string>
#include <cstdlib>
#include <libpq-fe.h>
#include "students.h"
#include "database.h"

using namespace std;

bool registerStudent(
    const string& studentId,
    const string& name,
    const string& email,
    const string& passwordHash,
    const string& role
) {
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Auth/Registration] No database connection available." << endl;
        return false;
    }

    // Architectural Rule: Public self-registration is strictly for Students only.
    // There is only ONE pre-configured System Administrator in the database.
    if (role == "admin") {
        cerr << "[Registration Error] Cannot register as admin: The system allows only ONE pre-configured administrator account." << endl;
        return false;
    }

    const char* sql =
        "INSERT INTO students (student_id, name, email, password_hash, role) "
        "VALUES ($1, $2, $3, $4, 'student');";

    const char* paramValues[4] = {
        studentId.c_str(),
        name.c_str(),
        email.c_str(),
        passwordHash.c_str()
    };

    PGresult* res = PQexecParams(conn, sql, 4, NULL, paramValues, NULL, NULL, 0);

    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        cerr << "[Registration Error] Could not register student: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        return false;
    }

    PQclear(res);
    cout << "[Auth/Registration] Student '" << name << "' (" << studentId << ") registered successfully!" << endl;
    return true;
}

bool authenticateUser(
    const string& email,
    const string& passwordHash,
    StudentRecord& outUser
) {
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Auth] No database connection available." << endl;
        return false;
    }

    const char* sql =
        "SELECT id, student_id, name, email, role, is_active "
        "FROM students "
        "WHERE email = $1 AND password_hash = $2 AND is_active = TRUE "
        "LIMIT 1;";

    const char* paramValues[2] = {
        email.c_str(),
        passwordHash.c_str()
    };

    PGresult* res = PQexecParams(conn, sql, 2, NULL, paramValues, NULL, NULL, 0);

    if (PQresultStatus(res) != PGRES_TUPLES_OK || PQntuples(res) == 0) {
        PQclear(res);
        return false;
    }

    outUser.id = atoi(PQgetvalue(res, 0, 0));
    outUser.studentId = PQgetvalue(res, 0, 1);
    outUser.name = PQgetvalue(res, 0, 2);
    outUser.email = PQgetvalue(res, 0, 3);
    outUser.role = PQgetvalue(res, 0, 4);
    outUser.isActive = (string(PQgetvalue(res, 0, 5)) == "t");

    PQclear(res);
    return true;
}

vector<StudentRecord> getAllStudents()
{
    vector<StudentRecord> list;
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Students] No database connection available." << endl;
        return list;
    }

    const char* sql = "SELECT id, student_id, name, email, role, is_active FROM students ORDER BY id ASC;";
    PGresult* res = PQexec(conn, sql);

    if (PQresultStatus(res) != PGRES_TUPLES_OK) {
        cerr << "[Students Error] Failed to fetch students: " << PQerrorMessage(conn) << endl;
        PQclear(res);
        return list;
    }

    int rows = PQntuples(res);
    for (int i = 0; i < rows; ++i) {
        StudentRecord s;
        s.id = atoi(PQgetvalue(res, i, 0));
        s.studentId = PQgetvalue(res, i, 1);
        s.name = PQgetvalue(res, i, 2);
        s.email = PQgetvalue(res, i, 3);
        s.role = PQgetvalue(res, i, 4);
        s.isActive = (string(PQgetvalue(res, i, 5)) == "t");

        list.push_back(s);
    }

    PQclear(res);
    return list;
}

bool findStudentById(const string& studentId, StudentRecord& outStudent)
{
    PGconn* conn = getDatabaseConnection();
    if (!conn) {
        cerr << "[Students] No database connection available." << endl;
        return false;
    }

    const char* sql = "SELECT id, student_id, name, email, role, is_active FROM students WHERE student_id = $1 LIMIT 1;";
    const char* paramValues[1] = { studentId.c_str() };

    PGresult* res = PQexecParams(conn, sql, 1, NULL, paramValues, NULL, NULL, 0);

    if (PQresultStatus(res) != PGRES_TUPLES_OK || PQntuples(res) == 0) {
        PQclear(res);
        return false;
    }

    outStudent.id = atoi(PQgetvalue(res, 0, 0));
    outStudent.studentId = PQgetvalue(res, 0, 1);
    outStudent.name = PQgetvalue(res, 0, 2);
    outStudent.email = PQgetvalue(res, 0, 3);
    outStudent.role = PQgetvalue(res, 0, 4);
    outStudent.isActive = (string(PQgetvalue(res, 0, 5)) == "t");

    PQclear(res);
    return true;
}
