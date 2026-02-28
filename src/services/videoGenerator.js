const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const configManager = require('./configManager');
const logger = require('./logger');

async function generateVideo(date) {
  const settings = configManager.loadSettings();
  const captureDir = configManager.getCapturesDir(date);
  const videosDir = configManager.getVideosDir();

  // Ensure videos directory exists
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  // Get all images for the date
  const images = fs.readdirSync(captureDir)
    .filter(f => f.endsWith('.jpg'))
    .sort();

  if (images.length === 0) {
    throw new Error(`No images found for date ${date}`);
  }

  logger.log(`Processing ${images.length} images for video (${date})`);

  // Create a temporary file list for ffmpeg concat demuxer
  const listFile = path.join(videosDir, `${date}-filelist.txt`);
  const frameDuration = 1 / 10; // 10 fps — each frame shown for 0.1s
  const listContent = images
    .map(f => `file '${path.join(captureDir, f)}'\nduration ${frameDuration}`)
    .join('\n');
  // Repeat last frame to avoid ffmpeg cutting it short
  const lastImage = images[images.length - 1];
  const fullList = listContent + `\nfile '${path.join(captureDir, lastImage)}'\n`;
  fs.writeFileSync(listFile, fullList);

  const outputPath = path.join(videosDir, `${date}.mp4`);
  const resizeWidth = settings.gif.resizeWidth || 800;

  // Build ffmpeg arguments
  const args = [
    '-y',                              // Overwrite output
    '-f', 'concat',                    // Concat demuxer
    '-safe', '0',                      // Allow absolute paths
    '-i', listFile,                    // Input file list
    '-vf', `scale=${resizeWidth}:-2`,  // Resize (height divisible by 2)
    '-c:v', 'libx264',                // H.264 codec
    '-pix_fmt', 'yuv420p',            // Pixel format for compatibility
    '-preset', 'medium',               // Encoding speed/quality tradeoff
    '-crf', '23',                      // Quality (lower = better, 23 is default)
    '-movflags', '+faststart',         // Enable streaming playback
    outputPath
  ];

  return new Promise((resolve, reject) => {
    const proc = execFile('ffmpeg', args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      // Clean up temp file list
      try { fs.unlinkSync(listFile); } catch (e) { /* ignore */ }

      if (error) {
        logger.error('ffmpeg error:', error.message);
        logger.error('ffmpeg stderr:', stderr);
        reject(new Error(`Video generation failed: ${error.message}`));
        return;
      }

      const stats = fs.statSync(outputPath);
      logger.log(`Video generated: ${outputPath} (${Math.round(stats.size / 1024)} KB)`);
      resolve(outputPath);
    });
  });
}

function getVideos() {
  const videosDir = configManager.getVideosDir();

  if (!fs.existsSync(videosDir)) {
    return [];
  }

  return fs.readdirSync(videosDir)
    .filter(f => f.endsWith('.mp4'))
    .sort()
    .reverse()
    .map(filename => {
      const filepath = path.join(videosDir, filename);
      const stats = fs.statSync(filepath);
      const date = filename.replace('.mp4', '');

      return {
        filename,
        path: `/videos/${filename}`,
        date,
        size: stats.size,
        sizeFormatted: formatSize(stats.size),
        createdAt: stats.birthtime.toISOString()
      };
    });
}

function getVideoForDate(date) {
  const videosDir = configManager.getVideosDir();
  const filename = `${date}.mp4`;
  const filepath = path.join(videosDir, filename);

  if (fs.existsSync(filepath)) {
    const stats = fs.statSync(filepath);
    return {
      filename,
      path: `/videos/${filename}`,
      date,
      size: stats.size,
      sizeFormatted: formatSize(stats.size),
      createdAt: stats.birthtime.toISOString()
    };
  }

  return null;
}

function deleteVideo(filename) {
  const videosDir = configManager.getVideosDir();
  const filepath = path.join(videosDir, filename);

  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return true;
  }
  return false;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

module.exports = {
  generateVideo,
  getVideos,
  getVideoForDate,
  deleteVideo
};
