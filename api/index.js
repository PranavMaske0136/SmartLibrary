// Vercel Serverless Function Entry Point
process.env.VERCEL = process.env.VERCEL || '1';
const serverModule = require('../server');
const app = serverModule.app || serverModule;

module.exports = app;
