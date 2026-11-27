const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    roomCode:  { type: String, required: true, index: true },
    title:     { type: String, required: true, maxlength: 60 },
    metric:    { type: String, enum: ['contributions', 'activeDays', 'streak'], required: true },
    target:    { type: Number, required: true },
    startDate: { type: String, required: true }, // YYYY-MM-DD, compared with GithubStats.calendar dates
    endDate:   { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Challenge', challengeSchema);
