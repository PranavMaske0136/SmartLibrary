#ifndef SMARTLIBRARY_STUDENTS_H
#define SMARTLIBRARY_STUDENTS_H

#include <string>
#include <vector>

struct StudentRecord {
    int id;
    std::string studentId;
    std::string name;
    std::string email;
    std::string passwordHash;
    std::string role;
    bool isActive;
};

/**
 * Registers a new student or admin in the PostgreSQL database.
 * Includes password authentication credentials.
 */
bool registerStudent(
    const std::string& studentId,
    const std::string& name,
    const std::string& email,
    const std::string& passwordHash,
    const std::string& role = "student"
);

/**
 * Authenticates a user against PostgreSQL by matching email, password_hash, and checking is_active.
 * Returns true and populates outUser if credentials are valid.
 */
bool authenticateUser(
    const std::string& email,
    const std::string& passwordHash,
    StudentRecord& outUser
);

/**
 * Retrieves all registered user accounts.
 */
std::vector<StudentRecord> getAllStudents();

/**
 * Finds a student by their unique student_id code (e.g. "STU101").
 */
bool findStudentById(const std::string& studentId, StudentRecord& outStudent);

#endif // SMARTLIBRARY_STUDENTS_H
