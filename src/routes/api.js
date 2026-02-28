const express = require('express');
const router = express.Router();
const configManager = require('../services/configManager');
const camera = require('../services/camera');
const sunTimes = require('../services/sunTimes');
const scheduler = require('../services/scheduler');
const gifGenerator = require('../services/gifGenerator');
const videoGenerator = require('../services/videoGenerator');

// ============ Configuration ============

// Get current configuration
router.get('/config', (req, res) => {
  try {
    const settings = configManager.loadSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update configuration
router.post('/config', async (req, res) => {
  try {
    const updated = configManager.updateSettings(req.body);
    
    // Reschedule if capture settings changed
    await scheduler.reschedule();
    
    res.json({ success: true, settings: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Status ============

// Get current status
router.get('/status', async (req, res) => {
  try {
    const state = scheduler.getState();
    const settings = configManager.loadSettings();
    
    let sunTimesData = null;
    try {
      sunTimesData = await sunTimes.getTodaySunTimes();
    } catch (error) {
      // Sun times might not be available yet
    }
    
    res.json({
      state,
      settings: {
        eventType: settings.capture.eventType,
        intervalSeconds: settings.capture.intervalSeconds,
        offsetMinutes: settings.capture.offsetMinutes,
        enabled: settings.capture.enabled
      },
      sunTimes: sunTimesData,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Camera ============

// Test camera connection
router.get('/preview', async (req, res) => {
  try {
    const imageBuffer = await camera.getPreview();
    res.set('Content-Type', 'image/jpeg');
    res.send(imageBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test camera connection (returns JSON)
router.get('/camera/test', async (req, res) => {
  try {
    const result = await camera.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Capture Control ============

// Start manual capture
router.post('/capture/start', async (req, res) => {
  try {
    const options = {
      intervalSeconds: req.body.intervalSeconds ? parseInt(req.body.intervalSeconds) : null,
      maxCaptures: req.body.maxCaptures ? parseInt(req.body.maxCaptures) : null
    };
    const result = await scheduler.manualStart(options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop manual capture
router.post('/capture/stop', async (req, res) => {
  try {
    const result = await scheduler.manualStop();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Captures ============

// Get all capture dates
router.get('/captures', (req, res) => {
  try {
    const dates = camera.getAllCaptureDates();
    res.json(dates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get captures for a specific date
router.get('/captures/:date', (req, res) => {
  try {
    const captures = camera.getCaptures(req.params.date);
    res.json(captures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GIFs ============

// Get all GIFs
router.get('/gifs', (req, res) => {
  try {
    const gifs = gifGenerator.getGifs();
    res.json(gifs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate GIF for a specific date
router.post('/gif/generate/:date', async (req, res) => {
  try {
    const settings = configManager.loadSettings();
    const eventType = req.body.eventType || settings.capture.eventType;
    
    const gifPath = await gifGenerator.generateGif(req.params.date, eventType);
    res.json({ success: true, path: gifPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a GIF
router.delete('/gif/:filename', (req, res) => {
  try {
    const deleted = gifGenerator.deleteGif(req.params.filename);
    res.json({ success: deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Videos ============

// Get all videos
router.get('/videos', (req, res) => {
  try {
    const videos = videoGenerator.getVideos();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get video for a specific date
router.get('/video/:date', (req, res) => {
  try {
    const video = videoGenerator.getVideoForDate(req.params.date);
    res.json({ exists: !!video, video });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate video for a specific date
router.post('/video/generate/:date', async (req, res) => {
  try {
    const videoPath = await videoGenerator.generateVideo(req.params.date);
    res.json({ success: true, path: videoPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a video
router.delete('/video/:filename', (req, res) => {
  try {
    const deleted = videoGenerator.deleteVideo(req.params.filename);
    res.json({ success: deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Sun Times ============

// Get sun times
router.get('/sun-times', async (req, res) => {
  try {
    const data = await sunTimes.getTodaySunTimes();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force refresh sun times
router.post('/sun-times/refresh', async (req, res) => {
  try {
    const data = await sunTimes.fetchSunTimes();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
