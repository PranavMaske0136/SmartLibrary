const fs = require('fs');
const path = require('path');

console.log('==========================================================');
console.log('         BUILDING SMART LIBRARY FOR PRODUCTION            ');
console.log('==========================================================');

// 1. Verify critical server & serverless function files exist
const requiredFiles = [
    'server.js',
    'api/index.js',
    'vercel.json',
    'website/index.html',
    'website/admin.html',
    'website/student.html',
    'chatbot/chatbot.html'
];

let hasErrors = false;
for (const relPath of requiredFiles) {
    const fullPath = path.join(__dirname, '..', relPath);
    if (!fs.existsSync(fullPath)) {
        console.error(`[Error]: Missing required file: ${relPath}`);
        hasErrors = true;
    } else {
        console.log(`[Verified]: ${relPath}`);
    }
}

if (hasErrors) {
    console.error('Build failed due to missing files.');
    process.exit(1);
}

// 2. Syntax check critical server code
try {
    require('../server.js');
    console.log('[Verified]: server.js syntax & export integrity verified.');
} catch (err) {
    console.error('[Error] server.js load failed:', err.message);
    process.exit(1);
}

console.log('==========================================================');
console.log('         SMART LIBRARY BUILD SUCCESSFUL!                 ');
console.log('         Ready for Local and Vercel Deployment           ');
console.log('==========================================================');
process.exit(0);

