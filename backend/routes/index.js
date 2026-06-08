// routes/index.js — mounts all routes onto the app
'use strict';

const auth    = require('../middleware/auth');
const authCtl = require('../controllers/authController');
const parkCtl = require('../controllers/parkingController');
const bkCtl   = require('../controllers/bookingController');
const aiCtl   = require('../controllers/aiController');

module.exports = function mountRoutes(app) {

  /* ── Auth ── */
  app.post('/api/auth/register', authCtl.register);
  app.post('/api/auth/login',    authCtl.login);
  app.get ('/api/auth/profile',  auth, authCtl.profile);

  /* ── Parking ── */
  app.get('/api/parking',            auth, parkCtl.getAll);
  app.get('/api/parking/nearby',     auth, parkCtl.getNearby);
  app.get('/api/parking/:id',        auth, parkCtl.getById);
  app.get('/api/parking/:id/slots',  auth, parkCtl.getSlots);

  /* ── Bookings ── */
  app.post ('/api/bookings',             auth, bkCtl.create);
  app.get  ('/api/bookings/my',          auth, bkCtl.getMy);
  app.patch('/api/bookings/:id/cancel',  auth, bkCtl.cancel);

  /* ── AI ── */
  app.get('/api/ai/fallback', auth, aiCtl.fallback);

  /* ── Health ── */
  app.get('/api/health', (req,res) =>
    res.json({ status:'OK', message:'SmartPark AI running', node: process.version }));
};
