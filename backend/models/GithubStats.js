const mongoose = require('mongoose');

const githubStatsSchema = new mongoose.Schema(
  {
    uid:          { type: String, required: true },  // NOT unique — each user has their own doc
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

// Only a regular (non-unique) index on uid for fast lookups
githubStatsSchema.index({ uid: 1 });

const GithubStats = mongoose.model('GithubStats', githubStatsSchema);

// Drop ALL bad legacy unique indexes on startup (fire-and-forget)
setTimeout(async () => {
  try {
    const indexes = await GithubStats.collection.indexes();
    for (const idx of indexes) {
      // Drop any unique index that isn't _id
      if (idx.unique && idx.name !== '_id_') {
        await GithubStats.collection.dropIndex(idx.name);
        console.log(`[DB] Dropped bad unique index on githubstats: ${idx.name}`);
      }
    }
  } catch { /* silent — collection may not exist yet */ }
}, 2000);

module.exports = GithubStats;
