const http = require('http');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const { app, server } = require('../server');

async function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, headers: res.headers, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, raw: body });
                }
            });
        });

        req.on('error', (err) => reject(err));

        if (postData) {
            req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

async function runTests() {
    console.log('\n==========================================================');
    console.log('    TESTING NEON POSTGRESQL & NEON AUTH SERVICES END-TO-END');
    console.log('==========================================================\n');

    let passedTests = 0;
    let totalTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (condition) {
            console.log(`  [PASS] ${message}`);
            passedTests++;
        } else {
            console.error(`  [FAIL] ${message}`);
        }
    }

    try {
        // TEST 1: Health & Neon Postgres Connectivity
        console.log('--- 1. Testing Neon Postgres Health Endpoint ---');
        const healthRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/health',
            method: 'GET'
        });
        assert(healthRes.status === 200, `Health check returned HTTP 200`);
        assert(healthRes.data.postgres && healthRes.data.postgres.healthy === true, `PostgreSQL ping succeeded on branch: ${healthRes.data.branch}`);
        assert(healthRes.data.postgres.totalBooks === 25, `Total 25 catalog books found in Neon Postgres`);
        assert(healthRes.data.postgres.totalAdmins === 1, `Enforced single administrator constraint in Neon Postgres (totalAdmins: 1)`);

        // TEST 2: Neon Auth Configuration & JWKS Verification
        console.log('\n--- 2. Testing Neon Auth Integration ---');
        const authConfigRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/config',
            method: 'GET'
        });
        assert(authConfigRes.status === 200, `Auth config returned HTTP 200`);
        assert(!!authConfigRes.data.baseUrl, `NEON_AUTH_BASE_URL is configured: ${authConfigRes.data.baseUrl}`);
        assert(!!authConfigRes.data.jwksUrl, `NEON_AUTH_JWKS_URL is configured: ${authConfigRes.data.jwksUrl}`);

        const jwksRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/verify-jwks',
            method: 'GET'
        });
        assert(jwksRes.status === 200, `Neon Auth JWKS endpoint reachable (HTTP 200)`);
        assert(jwksRes.data.status === 'operational', `Neon Auth service status is operational`);

        // TEST 3: Books Catalog Query from Neon
        console.log('\n--- 3. Testing Books Catalog API ---');
        const booksRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/books',
            method: 'GET'
        });
        assert(booksRes.status === 200, `Books API returned HTTP 200`);
        assert(Array.isArray(booksRes.data.books) && booksRes.data.books.length === 25, `Retrieved all 25 books from Neon Postgres`);

        // TEST 4: Book Search
        console.log('\n--- 4. Testing Books Search ---');
        const searchRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/books/search?q=clean',
            method: 'GET'
        });
        assert(searchRes.status === 200, `Search API returned HTTP 200`);
        assert(searchRes.data.books.length >= 2, `Search for 'clean' returned expected matching books (Clean Code, Clean Architecture)`);

        // TEST 5: Administrator Login
        console.log('\n--- 5. Testing Single Admin Login in Neon ---');
        const adminLoginRes = await makeRequest(
            {
                hostname: 'localhost',
                port: 3000,
                path: '/api/auth/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            },
            { email: 'admin@smartlibrary.edu', password: 'admin123' }
        );
        assert(adminLoginRes.status === 200, `Admin authentication verified (HTTP 200)`);
        assert(adminLoginRes.data.user.role === 'admin', `Verified role is 'admin' for ${adminLoginRes.data.user.name}`);

        // TEST 6: Student Patron Registration
        console.log('\n--- 6. Testing Student Patron Registration in Neon ---');
        const uniqueId = 'TEST' + Math.floor(Math.random() * 9000 + 1000);
        const testStudent = {
            studentId: uniqueId,
            name: 'Test Patron',
            email: `patron_${uniqueId.toLowerCase()}@student.edu`,
            password: 'securePassword123'
        };

        const regRes = await makeRequest(
            {
                hostname: 'localhost',
                port: 3000,
                path: '/api/auth/register',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            },
            testStudent
        );
        assert(regRes.status === 201, `Student registration succeeded in Neon Postgres (HTTP 201)`);
        assert(regRes.data.user.role === 'student', `Registered user automatically assigned role 'student'`);

        // TEST 7: Login with Newly Registered Student
        console.log('\n--- 7. Testing Login for Newly Registered Student ---');
        const studentLoginRes = await makeRequest(
            {
                hostname: 'localhost',
                port: 3000,
                path: '/api/auth/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            },
            { email: testStudent.email, password: testStudent.password }
        );
        assert(studentLoginRes.status === 200, `Newly registered student authenticated successfully (HTTP 200)`);
        assert(studentLoginRes.data.user.studentId === uniqueId, `Matched student ID ${uniqueId}`);

        // TEST 8: Rejection of Admin Registration
        console.log('\n--- 8. Testing Security Constraint: Rejecting Admin Registration ---');
        const fakeAdminRes = await makeRequest(
            {
                hostname: 'localhost',
                port: 3000,
                path: '/api/auth/register',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            },
            {
                studentId: 'ADM999',
                name: 'Fake Admin',
                email: 'admin@smartlibrary.edu',
                password: 'hackerPassword'
            }
        );
        assert(fakeAdminRes.status === 403, `Admin registration correctly forbidden with HTTP 403`);

        console.log('\n==========================================================');
        console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED!`);
        console.log('==========================================================\n');

        server.close(() => {
            process.exit(passedTests === totalTests ? 0 : 1);
        });

    } catch (err) {
        console.error('Fatal Test Exception:', err);
        server.close(() => process.exit(1));
    }
}

runTests();

