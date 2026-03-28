const axios = require('axios');

const OW_BASE = 'https://api.openweathermap.org/data/2.5';
const WIND_DIRS = ['N','NE','E','SE','S','SW','W','NW'];
const degToDir = (deg) => WIND_DIRS[Math.round((deg || 0) / 45) % 8];

/**
 * Fetch weather by city name OR by lat/lon coordinates.
 */
const fetchWeatherData = async ({ city, lat, lon }) => {
  const key = process.env.OPENWEATHER_API_KEY;
  
  // Build query params: prefer coordinates if available
  const locationParams = (lat != null && lon != null)
    ? { lat, lon }
    : { q: city || process.env.DEFAULT_CITY || 'Mumbai' };

  const params = { ...locationParams, appid: key, units: 'metric' };

  const [currentRes, forecastRes] = await Promise.all([
    axios.get(`${OW_BASE}/weather`, { params }),
    axios.get(`${OW_BASE}/forecast`, { params }),
  ]);

  const c = currentRes.data;
  const current = {
    temp:        Math.round(c.main.temp),
    feelsLike:   Math.round(c.main.feels_like),
    humidity:    c.main.humidity,
    windSpeed:   Math.round((c.wind.speed || 0) * 3.6),
    windDir:     degToDir(c.wind.deg),
    pressure:    c.main.pressure,
    visibility:  Math.round((c.visibility || 0) / 1000),
    description: c.weather[0].description,
    icon:        c.weather[0].icon,
    sunrise:     new Date(c.sys.sunrise * 1000),
    sunset:      new Date(c.sys.sunset * 1000),
  };

  const seen = new Set();
  const forecast = forecastRes.data.list
    .filter((item) => {
      const date = item.dt_txt.split(' ')[0];
      if (!seen.has(date) && item.dt_txt.includes('12:00')) {
        seen.add(date); return true;
      }
      return false;
    })
    .slice(0, 5)
    .map((item) => ({
      date:        new Date(item.dt * 1000),
      tempMax:     Math.round(item.main.temp_max),
      tempMin:     Math.round(item.main.temp_min),
      description: item.weather[0].description,
      icon:        item.weather[0].icon,
      humidity:    item.main.humidity,
      windSpeed:   Math.round((item.wind.speed || 0) * 3.6),
    }));

  return {
    city:    c.name,
    country: c.sys.country,
    lat:     c.coord.lat,
    lon:     c.coord.lon,
    current,
    forecast,
    fetchedAt: new Date(),
  };
};

module.exports = { fetchWeatherData };
