const mongoose = require('mongoose');

// One morning briefing per user per local day (see services/briefingService.js)
const briefingSchema = new mongoose.Schema({
  uid:      { type: String, required: true },
  date:     { type: String, required: true }, // local YYYY-MM-DD
  sections: [{ _id: false, id: String, title: String, text: String }],
  script:   String,
  model:    String,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }, // old briefings expire after 30 days
});

briefingSchema.index({ uid: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Briefing', briefingSchema);
