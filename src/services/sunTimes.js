const axios = require('axios');
const fs = require('fs');
const path = require('path');
const configManager = require('./configManager');

const SUN_TIMES_FILE = path.join(configManager.getDataDir(), 'config', 'sun-times.json');

async function fetchSunTimes(date = null) {
  const settings = configManager.loadSettings();
  const { latitude, longitude, timezone } = settings.location;
  
  // Use provided date or today
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const url = `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${targetDate}&formatted=0&tzid=${timezone}`;
  
  try {
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data.status !== 'OK') {
      throw new Error(`API returned status: ${response.data.status}`);
    }
    
    const { sunrise, sunset, solar_noon, day_length } = response.data.results;
    
    const sunTimes = {
      date: targetDate,
      sunrise: sunrise,
      sunset: sunset,
      solarNoon: solar_noon,
      dayLength: day_length,
      fetchedAt: new Date().toISOString()
    };
    
    // Cache the results
    saveSunTimesCache(sunTimes);
    
    console.log(`Fetched sun times for ${targetDate}: sunrise=${sunrise}, sunset=${sunset}`);
    
    return sunTimes;
  } catch (error) {
    console.error('Error fetching sun times:', error.message);
    
    // Try to return cached data if available
    const cached = loadSunTimesCache();
    if (cached && cached.date === targetDate) {
      console.log('Using cached sun times');
      return cached;
    }
    
    throw error;
  }
}

function loadSunTimesCache() {
  try {
    if (fs.existsSync(SUN_TIMES_FILE)) {
      const data = fs.readFileSync(SUN_TIMES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading sun times cache:', error.message);
  }
  return null;
}

function saveSunTimesCache(sunTimes) {
  try {
    const dir = path.dirname(SUN_TIMES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SUN_TIMES_FILE, JSON.stringify(sunTimes, null, 2));
  } catch (error) {
    console.error('Error saving sun times cache:', error.message);
  }
}

async function getEventTime(eventType = null) {
  const settings = configManager.loadSettings();
  const type = eventType || settings.capture.eventType;
  
  const today = new Date().toISOString().split('T')[0];
  
  // Check cache first
  let sunTimes = loadSunTimesCache();
  
  // Fetch if no cache or cache is for different date
  if (!sunTimes || sunTimes.date !== today) {
    sunTimes = await fetchSunTimes(today);
  }
  
  const eventTimeStr = type === 'sunrise' ? sunTimes.sunrise : sunTimes.sunset;
  return new Date(eventTimeStr);
}

function getCaptureWindow(eventTime, offsetMinutes) {
  const start = new Date(eventTime.getTime() - offsetMinutes * 60 * 1000);
  const end = new Date(eventTime.getTime() + offsetMinutes * 60 * 1000);
  
  return { start, end, eventTime };
}

async function getTodaySunTimes() {
  const today = new Date().toISOString().split('T')[0];
  
  // Check cache first
  let sunTimes = loadSunTimesCache();
  
  if (!sunTimes || sunTimes.date !== today) {
    sunTimes = await fetchSunTimes(today);
  }
  
  return sunTimes;
}

module.exports = {
  fetchSunTimes,
  getEventTime,
  getCaptureWindow,
  getTodaySunTimes,
  loadSunTimesCache
};
