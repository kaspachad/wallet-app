// backend/middleware/authMiddleware.js

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized. Please log in.' });
}

module.exports = { ensureAuthenticated };

