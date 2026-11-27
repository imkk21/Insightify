const mongoose = require('mongoose');

const githubStatsSchema = new mongoose.Schema(
  {
    uid:          { type: String, required: true, unique: true }, // one doc per user
    username:     String,
    totalRepos:   Number,
    totalStars:   Number,
    totalForks:   Number,
    followers:    Number,
    following:    Number,
    languages:    { type: Map, of: Number },
    topRepos: [
      {
        name:        String,
        description: String,
        stars:       Number,
        forks:       Number,
        language:    String,
        url:         String,
        updatedAt:   Date,
      },
    ],
    weeklyCommits:  { type: Number, default: 0 },
    productivityScore: { type: Number, default: 0 },
    recentCommits: [
      {
        repo:    String,
        message: String,
        sha:     String,
        date:    Date,
        url:     String,
      },
    ],
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GithubStats', githubStatsSchema);
