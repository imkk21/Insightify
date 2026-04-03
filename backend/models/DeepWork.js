const mongoose = require('mongoose');

const deepWorkSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  durationMinutes: { type: Number, required: true },
  ambientNoise: { type: String }, // optional, e.g. 'rain', 'cafe'
  completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DeepWork', deepWorkSchema);
