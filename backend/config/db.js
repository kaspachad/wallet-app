
// backend/config/db.js

const mysql = require('mysql2');

const db = mysql.createPool({
  host: 'localhost',
  user: 'kaspa',
  password: 'kaspa',
  database: 'kaspa',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db;

