const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const GIFEncoder = require('gif-encoder-2');
const { createCanvas, loadImage } = require('canvas');
const configManager = require('./configManager');
const logger = require('./logger');

async function generateGif(date, eventType) {
  const settings = configManager.loadSettings();
  const captureDir = configManager.getCapturesDir(date);
  const gifsDir = configManager.getGifsDir();
  
  // Ensure GIFs directory exists
  if (!fs.existsSync(gifsDir)) {
    fs.mkdirSync(gifsDir, { recursive: true });
  }
  
  // Get all images for the date
  const images = fs.readdirSync(captureDir)
    .filter(f => f.endsWith('.jpg'))
    .sort()
    .map(f => path.join(captureDir, f));
  
  if (images.length === 0) {
    throw new Error(`No images found for date ${date}`);
  }
  
  logger.log(`Processing ${images.length} images for GIF`);
  
  // Determine output dimensions from first image
  const firstImageMeta = await sharp(images[0]).metadata();
  const aspectRatio = firstImageMeta.height / firstImageMeta.width;
  const width = settings.gif.resizeWidth;
  const height = Math.round(width * aspectRatio);
  
  // Create GIF encoder
  const encoder = new GIFEncoder(width, height, 'neuquant', true);
  const outputPath = path.join(gifsDir, `${date}-${eventType}.gif`);
  const writeStream = fs.createWriteStream(outputPath);
  
  encoder.createReadStream().pipe(writeStream);
  
  encoder.start();
  encoder.setDelay(settings.gif.frameDelayMs);
  encoder.setQuality(10); // 1-30, lower is better quality but slower
  
  // Create canvas for frame rendering
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Process each image
  for (let i = 0; i < images.length; i++) {
    const imagePath = images[i];
    
    try {
      // Resize image with sharp
      const resizedBuffer = await sharp(imagePath)
        .resize(width, height, { fit: 'cover' })
        .toFormat('png')
        .toBuffer();
      
      // Load into canvas
      const img = await loadImage(resizedBuffer);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Add frame to GIF
      encoder.addFrame(ctx);
      
      if ((i + 1) % 10 === 0) {
        logger.log(`Processed ${i + 1}/${images.length} frames`);
      }
    } catch (error) {
      logger.error(`Error processing image ${imagePath}:`, error.message);
      // Continue with other images
    }
  }
  
  encoder.finish();
  
  // Wait for write stream to finish
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
  
  const stats = fs.statSync(outputPath);
  logger.log(`GIF generated: ${outputPath} (${Math.round(stats.size / 1024)} KB)`);
  
  return outputPath;
}

function getGifs() {
  const gifsDir = configManager.getGifsDir();
  
  if (!fs.existsSync(gifsDir)) {
    return [];
  }
  
  return fs.readdirSync(gifsDir)
    .filter(f => f.endsWith('.gif'))
    .sort()
    .reverse()
    .map(filename => {
      const filepath = path.join(gifsDir, filename);
      const stats = fs.statSync(filepath);
      
      // Parse filename: YYYY-MM-DD-eventType.gif
      const parts = filename.replace('.gif', '').split('-');
      const eventType = parts.pop();
      const date = parts.join('-');
      
      return {
        filename,
        path: `/gifs/${filename}`,
        date,
        eventType,
        size: stats.size,
        sizeFormatted: `${Math.round(stats.size / 1024)} KB`,
        createdAt: stats.birthtime.toISOString()
      };
    });
}

function deleteGif(filename) {
  const gifsDir = configManager.getGifsDir();
  const filepath = path.join(gifsDir, filename);
  
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return true;
  }
  return false;
}

module.exports = {
  generateGif,
  getGifs,
  deleteGif
};
