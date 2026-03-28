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

module.exports = mongoose.model('Weather', weatherSchema);
