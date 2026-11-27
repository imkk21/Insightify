const mongoose = require('mongoose');

// Audit log of everything Autopilot did (or tried) on the user's behalf; also caches AI explanations.
const autopilotActionSchema = new mongoose.Schema(
  {
    uid:     { type: String, required: true },
    type:    { type: String, enum: ['fix-pr', 'explain', 'incident'], required: true },
    repo:    String,
    path:    String,
    status:  { type: String, enum: ['ok', 'failed'], default: 'ok' },
    key:     String, // explain cache key: hash of the planned upgrades
    payload: Object,
    result:  Object,
  },
  { timestamps: true }
);

autopilotActionSchema.index({ uid: 1, createdAt: -1 });

module.exports = mongoose.model('AutopilotAction', autopilotActionSchema);
