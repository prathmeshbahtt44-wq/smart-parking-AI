// controllers/bookingController.js
'use strict';
const { getDb }             = require('../db/database');
const { uuidv4, qrToken }   = require('../utils/crypto');

exports.create = (req, res) => {
  const { lotId, slotId, vehicleNumber, hours } = req.body || {};
  if (!lotId||!slotId||!vehicleNumber||!hours)
    return res.status(400).json({ success:false, message:'lotId, slotId, vehicleNumber, hours required' });
  const h = parseInt(hours);
  if (isNaN(h)||h<1||h>24)
    return res.status(400).json({ success:false, message:'Hours must be 1-24' });

  const db   = getDb();
  const lot  = db.prepare('SELECT * FROM parking_lots WHERE id=?').get(lotId);
  if (!lot)  return res.status(404).json({ success:false, message:'Lot not found' });

  const slot = db.prepare('SELECT * FROM slots WHERE slot_id=? AND lot_id=?').get(slotId, lotId);
  if (!slot) return res.status(404).json({ success:false, message:'Slot not found' });
  if (slot.is_occupied) return res.status(400).json({ success:false, message:'Slot already occupied' });

  const id       = uuidv4();
  const token    = qrToken();
  const now      = new Date();
  const expires  = new Date(now.getTime() + h*3600000);
  const amount   = lot.price_per_hour * h;
  const vehNum   = vehicleNumber.toUpperCase().trim();

  db.prepare(`INSERT INTO bookings
    (id,user_id,lot_id,lot_name,location,slot_id,slot_number,vehicle_number,
     hours,total_amount,price_per_hour,qr_token,status,booked_at,expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, lotId, lot.name, lot.location, slotId, slot.slot_number,
         vehNum, h, amount, lot.price_per_hour, token, 'active',
         now.toISOString(), expires.toISOString());

  db.prepare('UPDATE slots SET is_occupied=1,booked_by=?,booking_id=? WHERE slot_id=?')
    .run(req.user.id, id, slotId);

  const booking = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  res.status(201).json({ success:true, message:'Booking confirmed!', booking:{ ...booking } });
};

exports.getMy = (req, res) => {
  const db       = getDb();
  const bookings = db.prepare('SELECT * FROM bookings WHERE user_id=? ORDER BY booked_at DESC').all(req.user.id);
  res.json({ success:true, count:bookings.length, bookings:bookings.map(b=>({...b})) });
};

exports.cancel = (req, res) => {
  const db      = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!booking)          return res.status(404).json({ success:false, message:'Booking not found' });
  if (booking.status==='cancelled') return res.status(400).json({ success:false, message:'Already cancelled' });

  const now = new Date().toISOString();
  db.prepare("UPDATE bookings SET status='cancelled',cancelled_at=? WHERE id=?").run(now, req.params.id);
  db.prepare('UPDATE slots SET is_occupied=0,booked_by=NULL,booking_id=NULL WHERE slot_id=?').run(booking.slot_id);

  const updated = db.prepare('SELECT * FROM bookings WHERE id=?').get(req.params.id);
  res.json({ success:true, message:'Booking cancelled', booking:{ ...updated } });
};
