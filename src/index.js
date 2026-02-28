const express = require('express');
const path = require('path');
const configManager = require('./services/configManager');
const scheduler = require('./services/scheduler');
const apiRoutes = require('./routes/api');
const logger = require('./services/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Serve static files (dashboard)
app.use(express.static(path.join(__dirname, '../public')));

// Serve captures
app.use('/captures', express.static(configManager.getCapturesDir()));

// Serve GIFs
app.use('/gifs', express.static(configManager.getGifsDir()));

// Serve videos
app.use('/videos', express.static(configManager.getVideosDir()));

// Ensure data directories exist
configManager.ensureDirectories();

// Initialize scheduler
scheduler.initialize().catch(error => {
  logger.error('Failed to initialize scheduler:', error.message);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.log('SIGTERM received, shutting down...');
  scheduler.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.log('SIGINT received, shutting down...');
  scheduler.shutdown();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.log(`Webcam GIF Capture server running on port ${PORT}`);
  logger.log(`Dashboard: http://localhost:${PORT}`);
});
