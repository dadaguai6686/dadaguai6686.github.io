// auth.js - JWT Authentication Middleware
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Load JWT Secret from env. Development gets an ephemeral secret rather than
// a hard-coded production credential.
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');

if (!process.env.JWT_SECRET) {
  const level = process.env.NODE_ENV === 'production' ? 'error' : 'warn';
  console[level]('[auth] JWT_SECRET is not set. Using an ephemeral secret; set JWT_SECRET before deployment.');
}

/**
 * Middleware to verify JWT token and authenticate admin requests
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
