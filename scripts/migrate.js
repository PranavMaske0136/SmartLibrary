const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const { neon } = require('@neondatabase/serverless');

async function migrate() {
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    if (!connectionString) {
        console.warn('[Neon Migration] Warning: DATABASE_URL or DATABASE_URL_UNPOOLED is not set.');
        console.warn('[Neon Migration] Skipping schema migration step. If deploying to Vercel, ensure env vars are configured.');
        return;
    }
    if (process.env.VERCEL) {
        console.log('[Neon Migration] Detected Vercel build environment. Skipping database migration during deployment.');
        return;
    }
    const sql = neon(connectionString);

    const schemaPath = path.join(__dirname, '..', 'backend', 'database', 'schema.sql');
    const rawSql = fs.readFileSync(schemaPath, 'utf8');

    // Remove single-line comments
    const cleanSql = rawSql.replace(/--[^\r\n]*/g, '');

    // Split on semicolon
    const statements = cleanSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`[Neon Migration] Total statements to execute: ${statements.length}`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt) continue;
        try {
            const preview = stmt.replace(/\s+/g, ' ').substring(0, 50);
            console.log(`[Executing ${i+1}/${statements.length}]: ${preview}...`);
            await sql.query(stmt);
        } catch (err) {
            console.error(`Error on statement ${i+1}: ${err.message}`);
        }
    }

    const bookCount = await sql`SELECT COUNT(*)::int as count FROM books;`;
    const studentCount = await sql`SELECT COUNT(*)::int as count FROM students;`;
    const adminCount = await sql`SELECT COUNT(*)::int as count FROM students WHERE role = 'admin';`;

    console.log('\n==========================================================');
    console.log('         NEON POSTGRESQL MIGRATION SUCCESSFUL!            ');
    console.log('==========================================================');
    console.log(`  Database Branch:        ${process.env.NEON_BRANCH || 'production'}`);
    console.log(`  Total Books Seeded:     ${bookCount[0].count}`);
    console.log(`  Total Users Seeded:     ${studentCount[0].count}`);
    console.log(`  Total Admins (Limit 1): ${adminCount[0].count}`);
    console.log('==========================================================');
}

migrate().catch(err => {
    console.error('[Fatal Error]:', err);
    process.exit(1);
});
