// auth.js - JWT Authentication Middleware
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let JWT_SECRET = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

function isUnsafeJwtSecret(secret) {
  const value = String(secret || '').trim();
  const normalized = value.toLowerCase();
  return value.length < 32 ||
    normalized.includes('replace-with') ||
    normalized.includes('change-me') ||
    normalized.includes('changeme') ||
    [
      'secret',
      'jwt_secret',
      'your-secret',
      'your-jwt-secret',
      'development-secret',
      'test-secret'
    ].includes(normalized);
}

if (!JWT_SECRET) {
  if (isProduction) {
    throw new Error('JWT_SECRET must be set in production.');
  }
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('[auth] JWT_SECRET is not set. Using an ephemeral development secret.');
} else if (isProduction && isUnsafeJwtSecret(JWT_SECRET)) {
  throw new Error('JWT_SECRET must be a unique random value of at least 32 characters in production.');
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

  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
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
