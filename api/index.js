// Vercel Serverless Function Entry Point
process.env.VERCEL = process.env.VERCEL || '1';
const { app } = require('../server');

module.exports = app;
