const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    uid:             { type: String, required: true, unique: true },
    email:           { type: String, required: true },
    displayName:     { type: String, default: '' },
    photoURL:        { type: String, default: '' },
    // GitHub – set when user clicks "Connect GitHub" (data fetched with the server's GITHUB_TOKEN)
    githubUsername:  { type: String, default: '' },
    githubConnected: { type: Boolean, default: false },
    // Location – set from browser geolocation or manual entry
    city:            { type: String, default: '' },
    lat:             { type: Number, default: null },
    lon:             { type: Number, default: null },
    // Spotify Integration
    spotifyAccessToken:  { type: String, default: '' },
    spotifyRefreshToken: { type: String, default: '' },
    spotifyTokenExpiry:  { type: Date,   default: null },
    lastLogin:       { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    // Never send OAuth secrets to the browser, whichever route returns the user
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.spotifyAccessToken;
        delete ret.spotifyRefreshToken;
        delete ret.githubToken; // legacy field still present on old documents
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
