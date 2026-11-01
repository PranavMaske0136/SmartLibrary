const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { neon } = require('@neondatabase/serverless');

// Load environment variables (try .env.local first, then .env)
const envLocalPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON body parsing and CORS
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Helper: Get SQL client with fallback
function getSql() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error('DATABASE_URL environment variable is missing.');
    }
    return neon(dbUrl);
}

// =============================================================================
// 1. NEON POSTGRES HEALTH & METRICS
// =============================================================================
app.get('/api/health', async (req, res) => {
    try {
        const sql = getSql();
        const ping = await sql`SELECT 1 as healthy, NOW() as server_time;`;
        const bookCount = await sql`SELECT COUNT(*)::int as count FROM books;`;
        const userCount = await sql`SELECT COUNT(*)::int as count FROM students;`;
        const adminCount = await sql`SELECT COUNT(*)::int as count FROM students WHERE role = 'admin';`;

        res.json({
            status: 'online',
            service: 'Smart Library with Neon Serverless Postgres',
            branch: process.env.NEON_BRANCH || 'production',
            environment: process.env.VERCEL ? 'vercel-serverless' : 'local-node',
            postgres: {
                healthy: ping[0].healthy === 1,
                serverTime: ping[0].server_time,
                totalBooks: bookCount[0].count,
                totalUsers: userCount[0].count,
                totalAdmins: adminCount[0].count
            },
            auth: {
                provider: 'Neon Auth (Managed Better Auth)',
                baseUrl: process.env.NEON_AUTH_BASE_URL || null,
                jwksUrl: process.env.NEON_AUTH_JWKS_URL || null
            }
        });
    } catch (err) {
        console.error('[Health Check Error]:', err);
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// =============================================================================
// 2. NEON POSTGRES - BOOKS CATALOG API
// =============================================================================
app.get('/api/books', async (req, res) => {
    try {
        const sql = getSql();
        const { category, available } = req.query;

        let query = 'SELECT id, title, author, category, quantity, available_copies as "availableCopies" FROM books WHERE 1=1';
        const params = [];

        if (category) {
            params.push(category);
            query += ` AND category = $${params.length}`;
        }

        if (available === 'true') {
            query += ' AND available_copies > 0';
        } else if (available === 'false') {
            query += ' AND available_copies = 0';
        }

        query += ' ORDER BY id ASC;';

        const books = await sql.query(query, params);
        res.json({ total: books.length, books });
    } catch (err) {
        console.error('[Books API Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// Search books by keyword in title, author, or category
app.get('/api/books/search', async (req, res) => {
    try {
        const sql = getSql();
        const keyword = (req.query.q || '').trim();
        if (!keyword) {
            return res.json({ total: 0, books: [] });
        }

        const books = await sql`
            SELECT id, title, author, category, quantity, available_copies as "availableCopies"
            FROM books
            WHERE title ILIKE ${'%' + keyword + '%'}
               OR author ILIKE ${'%' + keyword + '%'}
               OR category ILIKE ${'%' + keyword + '%'}
            ORDER BY id ASC;
        `;

        res.json({ total: books.length, query: keyword, books });
    } catch (err) {
        console.error('[Search API Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// 3. NEON POSTGRES - AUTHENTICATION & PATRON REGISTRATION
// =============================================================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const sql = getSql();
        const { studentId, name, email, password } = req.body;

        if (!studentId || !name || !email || !password) {
            return res.status(400).json({ error: 'All fields (studentId, name, email, password) are required.' });
        }

        if (email.toLowerCase() === 'admin@smartlibrary.edu' || studentId.toUpperCase().startsWith('ADM')) {
            return res.status(403).json({ error: 'Administrative registration is restricted. The system permits only one dedicated administrator.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        // Insert into Neon Postgres (enforcing student role)
        const result = await sql`
            INSERT INTO students (student_id, name, email, password_hash, role)
            VALUES (${studentId.toUpperCase()}, ${name}, ${email.toLowerCase()}, ${password}, 'student')
            RETURNING id, student_id as "studentId", name, email, role, created_at as "createdAt";
        `;

        res.status(201).json({
            message: 'Student account registered successfully in Neon Postgres!',
            user: result[0]
        });
    } catch (err) {
        console.error('[Register API Error]:', err);
        if (err.message.includes('unique constraint') || err.message.includes('duplicate key')) {
            return res.status(409).json({ error: 'An account with this email or student ID already exists in the database.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const sql = getSql();
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const users = await sql`
            SELECT id, student_id as "studentId", name, email, role, is_active as "isActive"
            FROM students
            WHERE email = ${email.toLowerCase()} AND password_hash = ${password} AND is_active = TRUE
            LIMIT 1;
        `;

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = users[0];
        res.json({
            message: `Authentication successful! Logged in as ${user.name} (${user.role}).`,
            user
        });
    } catch (err) {
        console.error('[Login API Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// 4. NEON POSTGRES - ADMIN PORTAL MANAGEMENT APIS
// =============================================================================

// Get Overview Stats for Admin Dashboard
app.get('/api/admin/overview', async (req, res) => {
    try {
        const sql = getSql();
        const bookStats = await sql`
            SELECT COUNT(*)::int as "totalTitles",
                   COALESCE(SUM(quantity), 0)::int as "totalCopies",
                   COALESCE(SUM(available_copies), 0)::int as "availableCopies"
            FROM books;
        `;
        const studentStats = await sql`
            SELECT COUNT(*)::int as "totalStudents"
            FROM students
            WHERE role = 'student';
        `;
        const issueStats = await sql`
            SELECT COUNT(*)::int as "activeLoans"
            FROM issue_returns
            WHERE status = 'issued';
        `;

        res.json({
            totalTitles: bookStats[0].totalTitles,
            totalCopies: bookStats[0].totalCopies,
            availableCopies: bookStats[0].availableCopies,
            borrowedCopies: bookStats[0].totalCopies - bookStats[0].availableCopies,
            totalStudents: studentStats[0].totalStudents,
            activeLoans: issueStats[0].activeLoans
        });
    } catch (err) {
        console.error('[Admin Overview Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin adds a new book to Neon Postgres
app.post('/api/admin/books', async (req, res) => {
    try {
        const sql = getSql();
        const { title, author, category, quantity } = req.body;
        if (!title || !author) {
            return res.status(400).json({ error: 'Book title and author are required.' });
        }
        const qty = parseInt(quantity) > 0 ? parseInt(quantity) : 1;

        const newBook = await sql`
            INSERT INTO books (title, author, category, quantity, available_copies)
            VALUES (${title.trim()}, ${author.trim()}, ${category || 'General'}, ${qty}, ${qty})
            RETURNING id, title, author, category, quantity, available_copies as "availableCopies";
        `;

        res.status(201).json({
            message: `Book '${title}' added successfully to Neon Postgres!`,
            book: newBook[0]
        });
    } catch (err) {
        console.error('[Admin Add Book Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin deletes a book (if no active loan)
app.delete('/api/admin/books/:id', async (req, res) => {
    try {
        const sql = getSql();
        const bookId = parseInt(req.params.id);
        const active = await sql`SELECT id FROM issue_returns WHERE book_id = ${bookId} AND status = 'issued' LIMIT 1;`;
        if (active.length > 0) {
            return res.status(400).json({ error: 'Cannot delete book: active borrowing records exist.' });
        }

        await sql`DELETE FROM books WHERE id = ${bookId};`;
        res.json({ message: 'Book deleted successfully from database.' });
    } catch (err) {
        console.error('[Admin Delete Book Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin fetches all registered students
app.get('/api/admin/students', async (req, res) => {
    try {
        const sql = getSql();
        const students = await sql`
            SELECT id, student_id as "studentId", name, email, role, is_active as "isActive", created_at as "createdAt"
            FROM students
            WHERE role = 'student'
            ORDER BY id ASC;
        `;
        res.json({ total: students.length, students });
    } catch (err) {
        console.error('[Admin Students Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin fetches all circulation/issue records
app.get('/api/admin/issues', async (req, res) => {
    try {
        const sql = getSql();
        const records = await sql`
            SELECT ir.id, ir.book_id as "bookId", b.title as "bookTitle",
                   ir.student_id as "studentId", s.name as "studentName", s.student_id as "studentCode",
                   ir.issue_date as "issueDate", ir.due_date as "dueDate", ir.return_date as "returnDate",
                   ir.status, ir.fine
            FROM issue_returns ir
            JOIN books b ON ir.book_id = b.id
            JOIN students s ON ir.student_id = s.id
            ORDER BY ir.id DESC;
        `;
        res.json({ total: records.length, records });
    } catch (err) {
        console.error('[Admin Issues Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin issues a book to a student
app.post('/api/admin/issue', async (req, res) => {
    try {
        const sql = getSql();
        const { bookId, studentId, loanDays } = req.body;
        const bId = parseInt(bookId);
        const sId = parseInt(studentId);
        const days = parseInt(loanDays) > 0 ? parseInt(loanDays) : 14;

        if (!bId || !sId) {
            return res.status(400).json({ error: 'Book ID and Student ID are required.' });
        }

        // Verify book availability
        const bookCheck = await sql`SELECT available_copies, title FROM books WHERE id = ${bId};`;
        if (bookCheck.length === 0) {
            return res.status(404).json({ error: 'Book not found.' });
        }
        if (bookCheck[0].available_copies <= 0) {
            return res.status(400).json({ error: 'No copies of this book are currently available on shelves.' });
        }

        // Execute issue transaction
        await sql`UPDATE books SET available_copies = available_copies - 1 WHERE id = ${bId};`;
        const issue = await sql`
            INSERT INTO issue_returns (book_id, student_id, issue_date, due_date, status)
            VALUES (${bId}, ${sId}, CURRENT_DATE, CURRENT_DATE + (${days} || ' days')::INTERVAL, 'issued')
            RETURNING *;
        `;

        res.status(201).json({
            message: `Book '${bookCheck[0].title}' successfully issued!`,
            issue: issue[0]
        });
    } catch (err) {
        console.error('[Admin Issue Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin processes a return
app.post('/api/admin/return', async (req, res) => {
    try {
        const sql = getSql();
        const { issueId } = req.body;
        const id = parseInt(issueId);

        const check = await sql`SELECT book_id, status FROM issue_returns WHERE id = ${id};`;
        if (check.length === 0) {
            return res.status(404).json({ error: 'Loan record not found.' });
        }
        if (check[0].status === 'returned') {
            return res.status(400).json({ error: 'This book has already been marked as returned.' });
        }

        await sql`UPDATE issue_returns SET status = 'returned', return_date = CURRENT_DATE WHERE id = ${id};`;
        await sql`UPDATE books SET available_copies = available_copies + 1 WHERE id = ${check[0].book_id};`;

        res.json({ message: 'Book return processed successfully and inventory updated!' });
    } catch (err) {
        console.error('[Admin Return Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// 5. NEON AUTH SERVICE INTEGRATION
// =============================================================================
app.get('/api/auth/config', (req, res) => {
    res.json({
        provider: 'Neon Auth',
        baseUrl: process.env.NEON_AUTH_BASE_URL || null,
        jwksUrl: process.env.NEON_AUTH_JWKS_URL || null,
        branch: process.env.NEON_BRANCH || 'production'
    });
});

app.get('/api/auth/verify-jwks', async (req, res) => {
    try {
        const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
        if (!jwksUrl) {
            return res.status(400).json({ error: 'NEON_AUTH_JWKS_URL not configured' });
        }

        const response = await fetch(jwksUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: `Neon Auth returned HTTP ${response.status}` });
        }

        const jwksData = await response.json();
        res.json({
            status: 'operational',
            provider: 'Neon Auth JWKS',
            keysFound: (jwksData.keys || []).length,
            jwksData
        });
    } catch (err) {
        console.error('[Neon Auth Verification Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// 6. STATIC WEB APP & ASSETS
// =============================================================================
app.use('/website', express.static(path.join(__dirname, 'website')));
app.use('/chatbot', express.static(path.join(__dirname, 'chatbot')));

// Redirect root to website home
app.get('/', (req, res) => {
    res.redirect('/website/index.html');
});

// Start Express Server locally (Only when not running in Vercel Serverless environment)
let server = null;
if (!process.env.VERCEL) {
    server = app.listen(PORT, () => {
        console.log(`\n==========================================================`);
        console.log(`  SMART LIBRARY APPLICATION SERVER RUNNING ON NEON!       `);
        console.log(`==========================================================`);
        console.log(`  Port:             ${PORT}`);
        console.log(`  Web Home:         http://localhost:${PORT}/website/index.html`);
        console.log(`  Admin Portal:     http://localhost:${PORT}/website/admin.html`);
        console.log(`  Student Portal:   http://localhost:${PORT}/website/student.html`);
        console.log(`  Chatbot:          http://localhost:${PORT}/chatbot/chatbot.html`);
        console.log(`  Health API:       http://localhost:${PORT}/api/health`);
        console.log(`  Books API:        http://localhost:${PORT}/api/books`);
        console.log(`  Admin Overview:   http://localhost:${PORT}/api/admin/overview`);
        console.log(`==========================================================\n`);
    });
}

module.exports = { app, server };
