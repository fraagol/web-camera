const cron = require('node-cron');
const configManager = require('./configManager');
const camera = require('./camera');
const sunTimes = require('./sunTimes');
const gifGenerator = require('./gifGenerator');

// State
let state = {
  status: 'idle', // 'idle', 'waiting', 'capturing', 'generating'
  captureInterval: null,
  sessionTimeout: null,
  nextCaptureWindow: null,
  captureCount: 0,
  maxCaptures: null,
  currentSessionDate: null,
  lastError: null
};

// Scheduled cron jobs
let sunTimesRefreshJob = null;
let captureWindowJob = null;

function getState() {
  return { ...state };
}

async function initialize() {
  console.log('Initializing scheduler...');
  
  // Refresh sun times daily at 00:05
  sunTimesRefreshJob = cron.schedule('5 0 * * *', async () => {
    console.log('Daily sun times refresh triggered');
    try {
      await sunTimes.fetchSunTimes();
      await scheduleNextCaptureWindow();
    } catch (error) {
      console.error('Error in daily sun times refresh:', error.message);
      state.lastError = error.message;
    }
  }, {
    timezone: 'Europe/Madrid'
  });
  
  // Initial setup
  try {
    await sunTimes.fetchSunTimes();
  } catch (error) {
    console.error('Initial sun times fetch failed:', error.message);
  }
  
  await scheduleNextCaptureWindow();
  
  console.log('Scheduler initialized');
}

async function scheduleNextCaptureWindow() {
  const settings = configManager.loadSettings();
  
  if (!settings.capture.enabled) {
    state.status = 'idle';
    state.nextCaptureWindow = null;
    console.log('Capture is disabled');
    return;
  }
  
  try {
    const eventTime = await sunTimes.getEventTime();
    const { start, end } = sunTimes.getCaptureWindow(eventTime, settings.capture.offsetMinutes);
    const now = new Date();
    
    state.nextCaptureWindow = {
      eventType: settings.capture.eventType,
      eventTime: eventTime.toISOString(),
      start: start.toISOString(),
      end: end.toISOString()
    };
    
    // If we're currently within the capture window, start capturing
    if (now >= start && now <= end) {
      console.log('Currently within capture window, starting capture');
      await startCaptureSession(end);
      return;
    }
    
    // If the window has passed for today, we'll capture tomorrow
    if (now > end) {
      console.log('Today\'s capture window has passed, will capture tomorrow');
      state.status = 'waiting';
      return;
    }
    
    // Schedule the capture to start at window start time
    const msUntilStart = start.getTime() - now.getTime();
    console.log(`Scheduling capture to start in ${Math.round(msUntilStart / 1000 / 60)} minutes`);
    
    state.status = 'waiting';
    
    // Clear any existing timeout
    if (state.sessionTimeout) {
      clearTimeout(state.sessionTimeout);
    }
    
    state.sessionTimeout = setTimeout(async () => {
      const endTime = new Date(state.nextCaptureWindow.end);
      await startCaptureSession(endTime);
    }, msUntilStart);
    
  } catch (error) {
    console.error('Error scheduling capture window:', error.message);
    state.lastError = error.message;
    state.status = 'idle';
  }
}

async function startCaptureSession(endTime) {
  const settings = configManager.loadSettings();
  
  state.status = 'capturing';
  state.captureCount = 0;
  state.currentSessionDate = new Date().toISOString().split('T')[0];
  state.lastError = null;
  
  console.log(`Starting capture session until ${endTime.toISOString()}`);
  
  // Capture immediately
  await captureImage();
  
  // Set up interval for captures
  state.captureInterval = setInterval(async () => {
    await captureImage();
  }, settings.capture.intervalSeconds * 1000);
  
  // Schedule end of session
  const msUntilEnd = endTime.getTime() - Date.now();
  state.sessionTimeout = setTimeout(async () => {
    await endCaptureSession();
  }, msUntilEnd);
}

async function captureImage() {
  try {
    const result = await camera.captureAndSave();
    state.captureCount++;
    console.log(`Capture #${state.captureCount}: ${result.filename}`);
  } catch (error) {
    console.error('Error capturing image:', error.message);
    state.lastError = error.message;
  }
}

async function endCaptureSession() {
  console.log('Ending capture session');
  
  // Stop capture interval
  if (state.captureInterval) {
    clearInterval(state.captureInterval);
    state.captureInterval = null;
  }
  
  const sessionDate = state.currentSessionDate;
  const captureCount = state.captureCount;
  
  // Generate GIF if we have captures
  if (captureCount > 0) {
    state.status = 'generating';
    console.log(`Generating GIF from ${captureCount} images`);
    
    try {
      const settings = configManager.loadSettings();
      const gifPath = await gifGenerator.generateGif(sessionDate, settings.capture.eventType);
      console.log(`GIF generated: ${gifPath}`);
    } catch (error) {
      console.error('Error generating GIF:', error.message);
      state.lastError = error.message;
    }
  }
  
  state.status = 'idle';
  state.captureCount = 0;
  state.currentSessionDate = null;
  
  // Schedule next capture window
  await scheduleNextCaptureWindow();
}

async function manualStart(options = {}) {
  if (state.status === 'capturing') {
    return { success: false, message: 'Already capturing' };
  }
  
  const settings = configManager.loadSettings();
  
  // Use provided options or defaults from settings
  const intervalSeconds = options.intervalSeconds || settings.capture.intervalSeconds;
  const maxCaptures = options.maxCaptures || null; // null = unlimited
  
  // Clear any scheduled capture
  if (state.sessionTimeout) {
    clearTimeout(state.sessionTimeout);
    state.sessionTimeout = null;
  }
  
  state.status = 'capturing';
  state.captureCount = 0;
  state.maxCaptures = maxCaptures;
  state.currentSessionDate = new Date().toISOString().split('T')[0];
  state.lastError = null;
  
  console.log(`Manual capture session started (interval: ${intervalSeconds}s, max: ${maxCaptures || 'unlimited'})`);
  
  // Capture immediately
  await captureImage();
  
  // Check if we've reached max captures
  if (maxCaptures && state.captureCount >= maxCaptures) {
    await endCaptureSession();
    return { success: true, message: `Capture session completed (${state.captureCount} images)` };
  }
  
  // Set up interval
  state.captureInterval = setInterval(async () => {
    await captureImage();
    
    // Check if we've reached max captures
    if (state.maxCaptures && state.captureCount >= state.maxCaptures) {
      await endCaptureSession();
    }
  }, intervalSeconds * 1000);
  
  return { success: true, message: 'Capture session started' };
}

async function manualStop() {
  if (state.status !== 'capturing') {
    return { success: false, message: 'Not currently capturing' };
  }
  
  console.log('Manual stop requested');
  await endCaptureSession();
  
  return { success: true, message: 'Capture session stopped and GIF generated' };
}

function shutdown() {
  console.log('Shutting down scheduler...');
  
  if (sunTimesRefreshJob) {
    sunTimesRefreshJob.stop();
  }
  
  if (captureWindowJob) {
    captureWindowJob.stop();
  }
  
  if (state.captureInterval) {
    clearInterval(state.captureInterval);
  }
  
  if (state.sessionTimeout) {
    clearTimeout(state.sessionTimeout);
  }
}

async function reschedule() {
  // Stop current capture if running
  if (state.captureInterval) {
    clearInterval(state.captureInterval);
    state.captureInterval = null;
  }
  
  if (state.sessionTimeout) {
    clearTimeout(state.sessionTimeout);
    state.sessionTimeout = null;
  }
  
  state.status = 'idle';
  await scheduleNextCaptureWindow();
  
  return { success: true, message: 'Rescheduled capture window' };
}

module.exports = {
  initialize,
  getState,
  manualStart,
  manualStop,
  shutdown,
  reschedule
};
