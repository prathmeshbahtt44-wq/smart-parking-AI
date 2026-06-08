// controllers/aiController.js
'use strict';
const { getDb } = require('../db/database');

function haversine(lat1,lon1,lat2,lon2) {
  const R=6371, d2r=Math.PI/180;
  const dlat=(lat2-lat1)*d2r, dlon=(lon2-lon1)*d2r;
  const a=Math.sin(dlat/2)**2+Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dlon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

exports.fallback = (req, res) => {
  const lat  = parseFloat(req.query.lat);
  const lng  = parseFloat(req.query.lng);
  const vt   = req.query.vehicleType || 'Both';
  if (isNaN(lat)||isNaN(lng)) return res.status(400).json({ success:false, message:'lat and lng required' });

  const db    = getDb();
  const spots = db.prepare('SELECT * FROM ai_spots').all()
    .filter(s => vt==='Both' || s.vehicle_type==='Both' || s.vehicle_type===vt)
    .map(s => ({ ...s, distanceKm: Math.round(haversine(lat,lng,s.lat,s.lng)*10)/10 }))
    .sort((a,b) => a.distanceKm-b.distanceKm)
    .slice(0,5);

  res.json({ success:true, message:'AI alternative spots found', count:spots.length, spots });
};
