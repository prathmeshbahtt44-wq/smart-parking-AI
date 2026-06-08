// middleware/auth.js
'use strict';
const { verifyJwt } = require('../utils/crypto');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Bearer ')) {
    res.statusCode = 401;
    return res.json({ success: false, message: 'No token provided' });
  }
  try {
    req.user = verifyJwt(header.slice(7));
    next();
  } catch (e) {
    res.statusCode = 401;
    res.json({ success: false, message: e.message });
  }
};
