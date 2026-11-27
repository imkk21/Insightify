const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema(
  {
    uid:     { type: String, required: true },   // NOT unique – many insights per user
    content: { type: String, required: true },
    prompt:  String,
    model:   String,
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

insightSchema.index({ uid: 1, createdAt: -1 });

module.exports = mongoose.model('Insight', insightSchema);
