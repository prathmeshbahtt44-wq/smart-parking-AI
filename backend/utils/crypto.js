/**
 * utils/crypto.js — JWT + password hashing using Node crypto
 */
'use strict';

const crypto = require('crypto');

const JWT_SECRET =
  process.env.JWT_SECRET || 'smartpark_jwt_secret_2026';

const JWT_EXPIRY =
  7 * 24 * 60 * 60;

/* ─────────────────────────────────────────
   Base64URL Helpers
───────────────────────────────────────── */

const b64url = (s) =>
  Buffer.from(s).toString('base64url');

const fromB64url = (s) =>
  Buffer.from(s, 'base64url').toString('utf8');

/* ─────────────────────────────────────────
   JWT (HS256)
───────────────────────────────────────── */

function signJwt(payload) {

  const header = b64url(
    JSON.stringify({
      alg: 'HS256',
      typ: 'JWT'
    })
  );

  const body = b64url(
    JSON.stringify({
      ...payload,
      exp:
        Math.floor(Date.now() / 1000) +
        JWT_EXPIRY
    })
  );

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

function verifyJwt(token) {

  try {

    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error('Invalid token');
    }

    const [header, body, signature] = parts;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (
      signature !== expectedSignature
    ) {
      throw new Error('Invalid signature');
    }

    const payload = JSON.parse(
      fromB64url(body)
    );

    if (
      payload.exp &&
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      throw new Error('Token expired');
    }

    return payload;

  } catch (err) {

    throw new Error(
      err.message || 'Invalid token'
    );
  }
}

/* ─────────────────────────────────────────
   Password Hashing
───────────────────────────────────────── */

function hashPassword(password) {

  const salt = crypto
    .randomBytes(16)
    .toString('hex');

  const hash = crypto
    .pbkdf2Sync(
      password,
      salt,
      100000,
      32,
      'sha256'
    )
    .toString('hex');

  return `${salt}$${hash}`;
}

function verifyPassword(password, stored) {

  try {

    if (
      !stored ||
      !stored.includes('$')
    ) {
      return false;
    }

    const [salt, originalHash] =
      stored.split('$');

    const hash = crypto
      .pbkdf2Sync(
        password,
        salt,
        100000,
        32,
        'sha256'
      )
      .toString('hex');

    return hash === originalHash;

  } catch (err) {

    console.error(err);

    return false;
  }
}

/* ─────────────────────────────────────────
   UUID v4
───────────────────────────────────────── */

function uuidv4() {
  return crypto.randomUUID();
}

/* ─────────────────────────────────────────
   QR Token
───────────────────────────────────────── */

function qrToken() {
  return crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase();
}

/* ───────────────────────────────────────── */

module.exports = {
  signJwt,
  verifyJwt,
  hashPassword,
  verifyPassword,
  uuidv4,
  qrToken
};