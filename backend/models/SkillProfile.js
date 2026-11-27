const mongoose = require('mongoose');

// Cached "Proof of skill" result per user (see services/skillsService.js). Evidence comes from public repos only.
const skillProfileSchema = new mongoose.Schema(
  {
    uid:          { type: String, required: true, unique: true },
    username:     String,
    generatedAt:  Date,
    stats:        Object,
    summary:      String,
    summaryModel: String,
    categories:   Array,
    gaps:         Array,
    impact:       Object,
    matches:      Array,
    matchedAt:    Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('SkillProfile', skillProfileSchema);
