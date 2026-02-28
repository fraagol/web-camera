const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const CONFIG_DIR = path.join(DATA_DIR, 'config');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  camera: {
    url: 'http://192.168.1.72/capture'
  },
  capture: {
    eventType: 'sunrise', // 'sunrise' or 'sunset'
    intervalSeconds: 15,  // seconds between captures
    offsetMinutes: 30,    // minutes before/after event
    enabled: true
  },
  location: {
    latitude: 39.4699,
    longitude: -0.3763,
    timezone: 'Europe/Madrid',
    name: 'Valencia, Spain'
  },
  gif: {
    frameDelayMs: 100,    // delay between frames in GIF
    resizeWidth: 800      // resize images to this width (maintains aspect ratio)
  }
};

function ensureDirectories() {
  const dirs = [
    CONFIG_DIR,
    path.join(DATA_DIR, 'captures'),
    path.join(DATA_DIR, 'gifs'),
    path.join(DATA_DIR, 'videos')
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function loadSettings() {
  ensureDirectories();
  
  if (!fs.existsSync(SETTINGS_FILE)) {
    saveSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }
  
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const settings = JSON.parse(data);
    // Merge with defaults to ensure all keys exist
    return mergeDeep(DEFAULT_SETTINGS, settings);
  } catch (error) {
    logger.error('Error loading settings, using defaults:', error.message);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  ensureDirectories();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function updateSettings(updates) {
  const current = loadSettings();
  const updated = mergeDeep(current, updates);
  saveSettings(updated);
  return updated;
}

function mergeDeep(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

function getDataDir() {
  return DATA_DIR;
}

function getCapturesDir(date = null) {
  const baseDir = path.join(DATA_DIR, 'captures');
  if (date) {
    return path.join(baseDir, date);
  }
  return baseDir;
}

function getGifsDir() {
  return path.join(DATA_DIR, 'gifs');
}

function getVideosDir() {
  return path.join(DATA_DIR, 'videos');
}

module.exports = {
  loadSettings,
  saveSettings,
  updateSettings,
  getDataDir,
  getCapturesDir,
  getGifsDir,
  getVideosDir,
  ensureDirectories,
  DEFAULT_SETTINGS
};
