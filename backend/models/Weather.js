const mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema(
  {
    uid:  { type: String, required: true, index: true },
    city: String,
    country: String,
    current: {
      temp:       Number,
      feelsLike:  Number,
      humidity:   Number,
      windSpeed:  Number,
      windDir:    String,
      pressure:   Number,
      visibility: Number,
      description: String,
      icon:       String,
      sunrise:    Date,
      sunset:     Date,
    },
    forecast: [
      {
        date:        Date,
        tempMax:     Number,
        tempMin:     Number,
        description: String,
        icon:        String,
        humidity:    Number,
        windSpeed:   Number,
      },
    ],
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Weather = mongoose.model('Weather', weatherSchema);

// Self-Healing Index Protocol: Drop all bad legacy unique indexes (USER_1, etc.)
setTimeout(async () => {
  try {
    const indexes = await Weather.collection.indexes();
    for (const idx of indexes) {
      if (idx.unique && idx.name !== '_id_') {
        await Weather.collection.dropIndex(idx.name);
        console.log(`[DB] Dropped legacy unique index on weather: ${idx.name}`);
      }
    }
  } catch { /* silent */ }
}, 3000);

module.exports = Weather;
