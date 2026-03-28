const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    articles: [
      {
        title:       String,
        description: String,
        url:         String,
        source:      String,
        author:      String,
        publishedAt: Date,
        urlToImage:  String,
        category:    { type: String, default: 'technology' },
      },
    ],
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('News', newsSchema);
