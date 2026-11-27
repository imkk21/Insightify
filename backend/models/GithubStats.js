const mongoose = require('mongoose');

// Snapshot of githubService.fetchGithubData() for one user. Nested parts are stored as-is.
const githubStatsSchema = new mongoose.Schema(
  {
    uid:                   { type: String, required: true, unique: true }, // one doc per user
    username:              String,
    profile:               Object,
    totals:                Object,
    weeklyContributions:   Number,
    lastWeekContributions: Number,
    streak:                Object,
    calendar:              Array,
    languages:             Array,
    topRepos:              Array,
    recentCommits:         Array,
    pullRequests:          Array,
    fetchedAt:             { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GithubStats', githubStatsSchema);
