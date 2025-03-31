const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// GET /api/kns/check?domain=johnny.kas
router.get('/check', async (req, res) => {
  const domain = req.query.domain;

  if (!domain || !domain.endsWith('.kas')) {
    return res.status(400).json({ success: false, message: 'Invalid domain' });
  }

  try {
    const response = await fetch(`https://api.knsdomains.org/mainnet/api/v1/${domain}/owner`);
    
    if (!response.ok) {
      return res.status(200).json({
        domain,
        available: true,
        message: 'Domain is available',
      });
    }

    const { data } = await response.json();
    res.json({
      domain: data.asset,
      available: false,
      owner: data.owner,
    });

  } catch (err) {
    console.error('KNS check error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;

