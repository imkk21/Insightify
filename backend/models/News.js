const mongoose = require('mongoose');

// One shared document (_id 'global'): headlines are the same for every user.
const newsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'global' },
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
