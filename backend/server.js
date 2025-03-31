const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2');
const authRoutes = require('./routes/auth');
const session = require('express-session');
const walletRoutes = require('./routes/wallet');
const tokenRoutes = require('./routes/tokens');
const knsRoutes = require('./routes/kns');

const DEBUG = true; // ✅ Turn this off to disable all console logs

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Session middleware MUST come before anything else
app.use(session({
  secret: process.env.SESSION_SECRET || 'kaspa_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // only true if HTTPS
    httpOnly: true,
    sameSite: 'lax'
  }
}));
if (DEBUG) console.log('Session middleware configured');

// ✅ CORS config
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Middleware: log requests and session info
app.use((req, res, next) => {
  if (DEBUG) {
    console.log('--- Incoming Request ---');
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Cookies:', req.headers.cookie || 'None');
    console.log('Session:', req.session || 'None');
    console.log('------------------------');
  }
  next();
});

// ✅ DB Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', err);
  } else if (DEBUG) {
    console.log('✅ Connected to MySQL');
  }
});

// ✅ Make db available in routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// ✅ Serve frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// ✅ Routes
app.use('/api', authRoutes);
app.use('/api', walletRoutes);
app.use('/api', tokenRoutes);
app.use('/api/kns', knsRoutes);

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/dashboard.html', (req, res) => {
  if (!req.session.user) {
    if (DEBUG) console.log('Access to /dashboard.html blocked — user not logged in');
    return res.redirect('/');
  }
  res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'src/index.html'));
});

app.get('/api/ping', (req, res) => {
  res.json({ status: 'API is up and running!' });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  if (DEBUG) console.log('Debug mode is ON');
});

