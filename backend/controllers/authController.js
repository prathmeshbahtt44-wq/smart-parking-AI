// controllers/authController.js
'use strict';

const { getDb } = require('../db/database');

const {
  hashPassword,
  verifyPassword,
  signJwt,
  uuidv4
} = require('../utils/crypto');

/* =========================================================
   REGISTER USER
========================================================= */
exports.register = (req, res) => {

  try {

    const { name, email, password } = req.body || {};

    /* ---------- Validation ---------- */

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const cleanName  = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    const db = getDb();

    /* ---------- Check Existing User ---------- */

    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(cleanEmail);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    /* ---------- Create User ---------- */

    const id        = uuidv4();
    const createdAt = new Date().toISOString();

    const hashedPassword = hashPassword(password);

    db.prepare(`
      INSERT INTO users (
        id,
        name,
        email,
        password,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      cleanName,
      cleanEmail,
      hashedPassword,
      createdAt
    );

    /* ---------- Create JWT ---------- */

    const token = signJwt({
      id,
      name: cleanName,
      email: cleanEmail
    });

    /* ---------- Response ---------- */

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id,
        name: cleanName,
        email: cleanEmail,
        created_at: createdAt
      }
    });

  } catch (error) {

    console.error('REGISTER ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


/* =========================================================
   LOGIN USER
========================================================= */
exports.login = (req, res) => {

  try {

    const { email, password } = req.body || {};

    /* ---------- Validation ---------- */

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const db = getDb();

    /* ---------- Find User ---------- */

    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(cleanEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    /* ---------- Verify Password ---------- */

    const isPasswordValid = verifyPassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    /* ---------- Create JWT ---------- */

    const token = signJwt({
      id: user.id,
      name: user.name,
      email: user.email
    });

    /* ---------- Response ---------- */

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      }
    });

  } catch (error) {

    console.error('LOGIN ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


/* =========================================================
   USER PROFILE
========================================================= */
exports.profile = (req, res) => {

  try {

    const db = getDb();

    const user = db.prepare(`
      SELECT
        id,
        name,
        email,
        created_at
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      user
    });

  } catch (error) {

    console.error('PROFILE ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};