const axios = require('axios');
const fs = require('fs');
const path = require('path');
const configManager = require('./configManager');
const logger = require('./logger');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchImage(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      logger.error(`Camera fetch attempt ${attempt}/${retries} failed:`, error.message);
      
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS);
      } else {
        throw new Error(`Failed to fetch image after ${retries} attempts: ${error.message}`);
      }
    }
  }
}

async function captureAndSave() {
  const settings = configManager.loadSettings();
  const now = new Date();
  
  // Format date as YYYY-MM-DD
  const dateStr = now.toISOString().split('T')[0];
  
  // Format time as HH-mm-ss
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  const captureDir = configManager.getCapturesDir(dateStr);
  
  // Ensure capture directory exists
  if (!fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir, { recursive: true });
  }
  
  const filename = `${timeStr}.jpg`;
  const filepath = path.join(captureDir, filename);
  
  const imageBuffer = await fetchImage(settings.camera.url);
  fs.writeFileSync(filepath, imageBuffer);
  
  logger.log(`Captured image: ${filepath}`);
  
  return {
    path: filepath,
    filename,
    date: dateStr,
    time: timeStr,
    size: imageBuffer.length
  };
}

async function testConnection() {
  const settings = configManager.loadSettings();
  
  try {
    const imageBuffer = await fetchImage(settings.camera.url, 1);
    return {
      success: true,
      size: imageBuffer.length,
      url: settings.camera.url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url: settings.camera.url
    };
  }
}

async function getPreview() {
  const settings = configManager.loadSettings();
  const imageBuffer = await fetchImage(settings.camera.url, 1);
  return imageBuffer;
}

function getCaptures(date) {
  const captureDir = configManager.getCapturesDir(date);
  
  if (!fs.existsSync(captureDir)) {
    return [];
  }
  
  const files = fs.readdirSync(captureDir)
    .filter(f => f.endsWith('.jpg'))
    .sort();
  
  return files.map(filename => ({
    filename,
    path: `/captures/${date}/${filename}`,
    time: filename.replace('.jpg', '').replace(/-/g, ':')
  }));
}

function getAllCaptureDates() {
  const capturesDir = configManager.getCapturesDir();
  
  if (!fs.existsSync(capturesDir)) {
    return [];
  }
  
  return fs.readdirSync(capturesDir)
    .filter(f => {
      const fullPath = path.join(capturesDir, f);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort()
    .reverse();
}

module.exports = {
  fetchImage,
  captureAndSave,
  testConnection,
  getPreview,
  getCaptures,
  getAllCaptureDates
};
