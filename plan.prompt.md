## Plan: Node.js Webcam GIF Capture Application (Dockerized)

Build a single Express.js application in a Docker container that captures images from a local camera around sunrise OR sunset (Valencia, Spain), auto-generates GIF animations per session, and provides a web dashboard for configuration, live preview, and control. All configuration and data persisted via volume mount.

### Steps

1. **Initialize project structure** — Create Node.js project with dependencies (express, sharp, gif-encoder-2, canvas, node-cron, axios); set up folders: `src/services/`, `src/routes/`, `public/`. Add npm scripts for start.

2. **Create configuration manager** — `src/services/configManager.js` managing `/app/data/config/settings.json` with: camera URL, event type, capture interval, duration offset, location (Valencia), GIF settings. Auto-create defaults on first run.

3. **Create camera service** — `src/services/camera.js` to fetch JPEG from `http://192.168.1.72/capture`, save timestamped images to `/app/data/captures/{date}/`, include retry logic.

4. **Create sun times service** — `src/services/sunTimes.js` fetching from `api.sunrise-sunset.org` with Valencia coords and `Europe/Madrid` timezone, cache in `/app/data/config/sun-times.json`.

5. **Implement scheduler service** — `src/services/scheduler.js` using node-cron to refresh sun times daily, schedule capture windows (`eventTime ± offset`), capture at interval, trigger GIF generation on session end.

6. **Create GIF generator service** — `src/services/gifGenerator.js` compiling images into GIF with sharp and gif-encoder-2, saving to `/app/data/gifs/{date}-{event}.gif`.

7. **Build REST API** — `src/routes/api.js` with endpoints for config, status, preview, GIFs list, captures list, manual start/stop, and GIF regeneration.

8. **Build web dashboard** — `public/index.html` with vanilla HTML/CSS/JS: config form, status panel, camera test button, manual controls, GIF gallery.

9. **Create Express server entry point** — `src/index.js` on port 3000, serve API, static files, and data directories, start scheduler on boot.

10. **Create Dockerfile** — `node:20-alpine` base, install native deps (cairo, pango, libjpeg, giflib), non-root user, expose port 3000.

11. **Create docker-compose.yml** — `network_mode: host`, volume `./data:/app/data`, `TZ=Europe/Madrid`, `restart: unless-stopped`.

12. **Add .dockerignore and README** — Exclude build artifacts, document usage.
