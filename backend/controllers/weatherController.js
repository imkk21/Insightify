const Weather = require('../models/Weather');
const User = require('../models/User');
const { fetchWeatherData } = require('../services/weatherService');

/** GET /api/weather  – supports ?lat=&lon= or ?city= or uses stored user location */
const getWeather = async (req, res) => {
  try {
    const uid = req.user.uid;
    const cached = await Weather.findOne({ uid });
    const THIRTY_MIN = 30 * 60 * 1000;
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < THIRTY_MIN) {
      return res.json(cached);
    }

    const user = await User.findOne({ uid });
    // Priority: query params > stored user lat/lon > stored city > default
    const lat  = req.query.lat  ? parseFloat(req.query.lat)  : user?.lat  || null;
    const lon  = req.query.lon  ? parseFloat(req.query.lon)  : user?.lon  || null;
    const city = req.query.city || user?.city || process.env.DEFAULT_CITY || 'Mumbai';

    const data = await fetchWeatherData({ city, lat, lon });

    // Save coordinates back to user profile if we got them from query
    if (req.query.lat && req.query.lon && user) {
      await User.findOneAndUpdate(
        { uid },
        { lat: parseFloat(req.query.lat), lon: parseFloat(req.query.lon), city: data.city }
      );
    }

    const weather = await Weather.findOneAndUpdate(
      { uid }, { uid, ...data }, { upsert: true, new: true }
    );
    res.json(weather);
  } catch (err) {
    console.error('getWeather error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/** POST /api/weather/sync */
const syncWeather = async (req, res) => {
  try {
    const uid = req.user.uid;
    const user = await User.findOne({ uid });
    const lat  = req.body.lat != null ? req.body.lat : user?.lat  || null;
    const lon  = req.body.lon != null ? req.body.lon : user?.lon  || null;
    const city = req.body.city || user?.city || process.env.DEFAULT_CITY || 'Mumbai';

    const data = await fetchWeatherData({ city, lat, lon });

    if (req.body.lat != null) {
      await User.findOneAndUpdate({ uid }, { lat: req.body.lat, lon: req.body.lon, city: data.city });
    }

    const weather = await Weather.findOneAndUpdate(
      { uid }, { uid, ...data }, { upsert: true, new: true }
    );
    res.json({ message: 'Weather synced', weather });
  } catch (err) {
    console.error('syncWeather error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getWeather, syncWeather };
