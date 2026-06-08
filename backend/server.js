/**
 * server.js — SmartPark AI Backend
 * Pure Node.js — zero npm dependencies
 * Run: node --experimental-sqlite server.js
 */
'use strict';

const path     = require('path');
const { initDb } = require('./db/database');
const createApp  = require('./framework');
const mountRoutes = require('./routes/index');

const PORT         = process.env.PORT || 5000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// Init database
initDb();

// Create app
const app = createApp();

// Serve static frontend files
app.static('/', FRONTEND_DIR);

// Mount all API routes
mountRoutes(app);

// Start server
app.listen(PORT, () => {
  console.log('\n🚗  SmartPark AI — Node.js Backend');
  console.log(`📡  http://localhost:${PORT}`);
  console.log(`💾  SQLite: ${path.join(__dirname, 'db', 'smartpark.db')}`);
  console.log(`🔑  JWT secret: ${process.env.JWT_SECRET ? 'from env' : 'default (set JWT_SECRET in prod)'}`);
  console.log('\n  Pages:');
  console.log(`  → http://localhost:${PORT}/               (landing)`);
  console.log(`  → http://localhost:${PORT}/pages/login.html`);
  console.log(`  → http://localhost:${PORT}/pages/dashboard.html`);
  console.log(`  → http://localhost:${PORT}/pages/map.html`);
  console.log(`  → http://localhost:${PORT}/pages/camera-scanner.html`);
  console.log(`  → http://localhost:${PORT}/pages/vehicle-finder.html\n`);
});
