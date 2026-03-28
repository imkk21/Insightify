const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema(
  {
    uid:     { type: String, required: true },   // NOT unique – many insights per user
    content: { type: String, required: true },
    prompt:  String,
    model:   { type: String, default: 'gemini-1.5-flash' },
    type:    { type: String, enum: ['weekly', 'custom'], default: 'weekly' },
    weekOf:  Date,
    dataSnapshot: {
      commits:   Number,
      repos:     Number,
      stars:     Number,
      city:      String,
      temp:      Number,
      newsCount: Number,
    },
  },
  { timestamps: true }
);

// Only index by uid (non-unique) for fast lookups
insightSchema.index({ uid: 1, createdAt: -1 });

const Insight = mongoose.model('Insight', insightSchema);

// Drop any legacy bad unique indexes on startup (fire-and-forget)
setTimeout(async () => {
  try {
    await Insight.collection.dropIndex('user_1');
    console.log('[DB] Dropped legacy index: insights.user_1');
  } catch { /* already gone */ }
  try {
    await Insight.collection.dropIndex('uid_1_weekOf_1');
  } catch { /* already gone */ }
}, 3000);

module.exports = Insight;
