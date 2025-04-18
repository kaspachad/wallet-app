// jobs/fetchKaspaPrices.js
const db    = require('../config/db');
const fetch = (...a) => import('node-fetch').then(({default: f}) => f(...a));

async function run () {
  /* 1. Get distinct currency list from user_settings */
  const [rows] = await db.query(
    'SELECT DISTINCT currency FROM user_settings WHERE currency IS NOT NULL'
  );
  const list = rows.map(r => r.currency.toLowerCase());

  if (!list.length) return console.log('[price‑job] no currencies found');

  /* 2. Fetch ALL at once from CoinGecko (supports comma‑separated list) */
  const url = `https://api.coingecko.com/api/v3/simple/price` +
              `?ids=kaspa&vs_currencies=${list.join(',')}`;

  const res  = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

  const data = await res.json();       // { kaspa: { usd: 0.08, ils: 0.30, … } }
  const prices = data.kaspa || {};

  /* 3. Upsert into kaspa_prices */
  const stmt = `INSERT INTO kaspa_prices (currency, price)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE price = VALUES(price),
                                        last_updated = CURRENT_TIMESTAMP`;

  for (const [cur, val] of Object.entries(prices)) {
    await db.query(stmt, [cur.toUpperCase(), val]);
  }

  console.log('[price‑job] updated', Object.keys(prices).length, 'currencies');
}

module.exports = { run };

