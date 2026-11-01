-- =============================================================================
-- SMART LIBRARY MANAGEMENT SYSTEM - POSTGRESQL DATABASE SCHEMA
-- Compatible with Cloud PostgreSQL (Supabase, Neon, Render, AWS RDS) & Local PostgreSQL
-- Architecture: Single Dedicated Administrator & Multi-Student Patron Registration
-- =============================================================================

-- Clean up existing tables if rebuilding (in reverse dependency order)
DROP TABLE IF EXISTS issue_returns CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS books CASCADE;

-- -----------------------------------------------------------------------------
-- 1. BOOKS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    available_copies INT NOT NULL DEFAULT 1 CHECK (available_copies >= 0 AND available_copies <= quantity),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast search and category filtering
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_title_author ON books(title, author);

-- -----------------------------------------------------------------------------
-- 2. USERS TABLE (Single Admin + Student Patrons)
-- -----------------------------------------------------------------------------
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_role ON students(role);

-- Architectural Rule: Strictly enforce exactly ONE Admin in the entire database
CREATE UNIQUE INDEX idx_single_admin ON students(role) WHERE role = 'admin';

-- -----------------------------------------------------------------------------
-- 3. ISSUE & RETURN CIRCULATION TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE issue_returns (
    id SERIAL PRIMARY KEY,
    book_id INT NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    student_id INT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
    return_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue')),
    fine NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (fine >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_issue_returns_book_id ON issue_returns(book_id);
CREATE INDEX idx_issue_returns_student_id ON issue_returns(student_id);
CREATE INDEX idx_issue_returns_status ON issue_returns(status);

-- -----------------------------------------------------------------------------
-- 4. SEED DATA - INITIAL LIBRARY BOOKS CATALOG (25 BOOKS)
-- -----------------------------------------------------------------------------
INSERT INTO books (title, author, category, quantity, available_copies) VALUES
('Clean Code', 'Robert C. Martin', 'Programming', 5, 5),
('The Pragmatic Programmer', 'Andrew Hunt & David Thomas', 'Programming', 4, 4),
('Introduction to Algorithms', 'Thomas H. Cormen', 'Computer Science', 6, 6),
('Design Patterns', 'Erich Gamma et al.', 'Software Architecture', 4, 3),
('Structure and Interpretation of Computer Programs', 'Harold Abelson', 'Computer Science', 3, 3),
('Artificial Intelligence: A Modern Approach', 'Stuart Russell & Peter Norvig', 'Artificial Intelligence', 5, 5),
('Operating System Concepts', 'Abraham Silberschatz', 'Operating Systems', 5, 4),
('Computer Networking: A Top-Down Approach', 'James F. Kurose', 'Networking', 4, 4),
('Database System Concepts', 'Abraham Silberschatz', 'Databases', 5, 5),
('The C++ Programming Language', 'Bjarne Stroustrup', 'Programming', 4, 4),
('Head First Design Patterns', 'Eric Freeman', 'Software Architecture', 3, 2),
('Refactoring', 'Martin Fowler', 'Software Architecture', 4, 4),
('Code Complete', 'Steve McConnell', 'Software Engineering', 4, 4),
('Cracking the Coding Interview', 'Gayle Laakmann McDowell', 'Interview Prep', 7, 6),
('Deep Learning', 'Ian Goodfellow', 'Artificial Intelligence', 3, 3),
('Designing Data-Intensive Applications', 'Martin Kleppmann', 'Distributed Systems', 5, 5),
('Effective Modern C++', 'Scott Meyers', 'Programming', 4, 3),
('Modern Operating Systems', 'Andrew S. Tanenbaum', 'Operating Systems', 4, 4),
('Compilers: Principles, Techniques, and Tools', 'Alfred V. Aho', 'Computer Science', 3, 3),
('Hands-On Machine Learning with Scikit-Learn and TensorFlow', 'Aurélien Géron', 'Machine Learning', 5, 4),
('Clean Architecture', 'Robert C. Martin', 'Software Architecture', 5, 5),
('Programming Pearls', 'Jon Bentley', 'Computer Science', 3, 3),
('The Mythical Man-Month', 'Frederick P. Brooks Jr.', 'Project Management', 4, 4),
('You Don''t Know JS Yet', 'Kyle Simpson', 'Web Development', 6, 6),
('Patterns of Enterprise Application Architecture', 'Martin Fowler', 'Software Architecture', 3, 3);

-- -----------------------------------------------------------------------------
-- 5. SEED DATA - SOLE SYSTEM ADMINISTRATOR + INITIAL STUDENTS
-- Note: System permits exactly ONE administrator account.
-- -----------------------------------------------------------------------------
INSERT INTO students (student_id, name, email, password_hash, role) VALUES
('ADM001', 'System Administrator', 'admin@smartlibrary.edu', 'admin123', 'admin'),
('STU101', 'John Doe', 'john.doe@student.edu', 'password123', 'student'),
('STU102', 'Jane Smith', 'jane.smith@student.edu', 'password123', 'student'),
('STU103', 'Alex Rivera', 'alex.rivera@student.edu', 'password123', 'student');

-- -----------------------------------------------------------------------------
-- 6. VERIFICATION QUERY
-- -----------------------------------------------------------------------------
SELECT 'Database initialized with Single-Admin & Student Registration constraints!' AS status,
       (SELECT COUNT(*) FROM books) AS total_books,
       (SELECT COUNT(*) FROM students WHERE role = 'admin') AS total_admins,
       (SELECT COUNT(*) FROM students WHERE role = 'student') AS total_students;
