// controllers/parkingController.js
'use strict';
const { getDb } = require('../db/database');

function haversine(lat1,lon1,lat2,lon2) {
  const R=6371, d2r=Math.PI/180;
  const dlat=(lat2-lat1)*d2r, dlon=(lon2-lon1)*d2r;
  const a=Math.sin(dlat/2)**2+Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dlon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function enrichLot(lot, db) {
  const row = db.prepare('SELECT COUNT(*) as c FROM slots WHERE lot_id=? AND is_occupied=0').get(lot.id);
  return { ...lot, availableSlots: row.c };
}

exports.getAll = (req, res) => {
  const db   = getDb();
  const lots = db.prepare('SELECT * FROM parking_lots').all().map(l => enrichLot({...l}, db));
  res.json({ success:true, count:lots.length, lots });
};

exports.getNearby = (req, res) => {
  const lat    = parseFloat(req.query.lat);
  const lng    = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius) || 15;
  if (isNaN(lat)||isNaN(lng)) return res.status(400).json({ success:false, message:'lat and lng required' });

  const db   = getDb();
  const lots = db.prepare('SELECT * FROM parking_lots').all()
    .map(l => { const d=haversine(lat,lng,l.lat,l.lng); return {...l,distanceKm:Math.round(d*10)/10}; })
    .filter(l => l.distanceKm <= radius)
    .sort((a,b) => a.distanceKm-b.distanceKm)
    .map(l => enrichLot(l, db));
  res.json({ success:true, count:lots.length, lots });
};

exports.getById = (req, res) => {
  const db  = getDb();
  const lot = db.prepare('SELECT * FROM parking_lots WHERE id=?').get(req.params.id);
  if (!lot) return res.status(404).json({ success:false, message:'Lot not found' });
  const slots = db.prepare('SELECT * FROM slots WHERE lot_id=? ORDER BY slot_number').all(req.params.id);
  res.json({ success:true, lot:{ ...enrichLot({...lot},db), slots } });
};

exports.getSlots = (req, res) => {
  const db  = getDb();
  const lot = db.prepare('SELECT id,name FROM parking_lots WHERE id=?').get(req.params.id);
  if (!lot) return res.status(404).json({ success:false, message:'Lot not found' });
  const slots = db.prepare('SELECT * FROM slots WHERE lot_id=? ORDER BY slot_number').all(req.params.id);
  res.json({ success:true, lotId:lot.id, lotName:lot.name, slots });
};
