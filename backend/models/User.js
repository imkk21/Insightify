const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    uid:             { type: String, required: true, unique: true },
    email:           { type: String, required: true },
    displayName:     { type: String, default: '' },
    photoURL:        { type: String, default: '' },
    // GitHub OAuth – set when user clicks "Connect GitHub"
    githubUsername:  { type: String, default: '' },
    githubToken:     { type: String, default: '' },  // user's personal OAuth token
    githubConnected: { type: Boolean, default: false },
    // Location – set from browser geolocation or manual entry
    city:            { type: String, default: '' },
    lat:             { type: Number, default: null },
    lon:             { type: Number, default: null },
    // Spotify Integration
    spotifyAccessToken:  { type: String, default: '' },
    spotifyRefreshToken: { type: String, default: '' },
    spotifyTokenExpiry:   { type: Date,   default: null },
    lastLogin:       { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
