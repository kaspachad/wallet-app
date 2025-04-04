const express = require('express');
const router = express.Router();

// Load user settings
router.get('/', async (req, res) => {
  const db = req.db;
  const user = req.session.user;

  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const [rows] = await db.promise().query('SELECT currency, theme, date_format, auto_refresh FROM user_settings WHERE user_id = ?', [user.id]);

    if (rows.length === 0) {
      // Return default settings if none found
      return res.json({
        currency: 'USD',
        theme: 'light',
        date_format: 'MM/DD/YYYY',
        auto_refresh: true
      });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error loading settings:', err);
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
});

// Save/update user settings
router.post('/', async (req, res) => {
    console.log('[DEBUG] POST /settings hit');
  const db = req.db;
  const user = req.session.user;
  const { currency, theme, date_format, auto_refresh } = req.body;

  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const [existing] = await db.promise().query('SELECT id FROM user_settings WHERE user_id = ?', [user.id]);

    if (existing.length > 0) {
      // Update
      await db.promise().query(
        'UPDATE user_settings SET currency = ?, theme = ?, date_format = ?, auto_refresh = ? WHERE user_id = ?',
        [currency, theme, date_format, auto_refresh, user.id]
      );
    } else {
      // Insert
      await db.promise().query(
        'INSERT INTO user_settings (user_id, currency, theme, date_format, auto_refresh) VALUES (?, ?, ?, ?, ?)',
        [user.id, currency, theme, date_format, auto_refresh]
      );
    }

    return res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

module.exports = router;

