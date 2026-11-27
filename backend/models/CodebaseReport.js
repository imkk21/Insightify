const mongoose = require('mongoose');

// Cached Codebase X-ray analysis, one per user + repo (see services/codebaseService.js)
const codebaseReportSchema = new mongoose.Schema(
  {
    uid:         { type: String, required: true },
    repo:        { type: String, required: true },
    owner:       String,
    branch:      String,
    generatedAt: Date,
    url:         String,
    description: String,
    language:    String,
    stars:       Number,
    totals:      Object,
    contributors: Array,
    hotspots:    Array,
    files:       Array,
    knowledge:   Array,
    silos:       Array,
    coupling:    Array,
    structure:   Array,
    tour:        Object, // { content, model, stack, generatedAt }, filled lazily
  },
  { timestamps: true }
);
codebaseReportSchema.index({ uid: 1, repo: 1 }, { unique: true });

module.exports = mongoose.model('CodebaseReport', codebaseReportSchema);
