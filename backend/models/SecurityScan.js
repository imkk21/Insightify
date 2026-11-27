const mongoose = require('mongoose');

// Latest dependency-vulnerability scan per user (see services/securityService.js)
const securityScanSchema = new mongoose.Schema(
  {
    uid:       { type: String, required: true, unique: true },
    username:  String,
    scannedAt: Date,
    repos:     Array,
    findings:  Array,
    totals:    Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model('SecurityScan', securityScanSchema);
