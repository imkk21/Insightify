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

// Self-Healing Index Protocol: Drop all bad legacy unique indexes (user_1, etc.)
setTimeout(async () => {
  try {
    const indexes = await Insight.collection.indexes();
    for (const idx of indexes) {
      if (idx.unique && idx.name !== '_id_') {
        await Insight.collection.dropIndex(idx.name);
        console.log(`[DB] Dropped legacy unique index on insights: ${idx.name}`);
      }
    }
  } catch { /* already gone */ }
}, 3000);

module.exports = Insight;
