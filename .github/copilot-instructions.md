# Copilot Instructions for Webcam GIF Capture

## Project Overview

This is a Node.js application that automatically captures images from a webcam around sunrise or sunset times and generates animated GIF timelapses. It runs as a Docker container with a web dashboard for configuration and monitoring.

## Technology Stack

- **Runtime**: Node.js 20 (Alpine-based Docker image)
- **Framework**: Express.js for REST API and static file serving
- **Scheduling**: node-cron for daily scheduling
- **Image Processing**: sharp for resizing, canvas and gif-encoder-2 for GIF generation
- **HTTP Client**: axios for camera and API requests
- **Container**: Docker with multi-stage build

## Project Structure

```
src/
├── index.js              # Express server entry point
├── routes/
│   └── api.js            # REST API endpoints
└── services/
    ├── camera.js         # Camera capture with retry logic
    ├── configManager.js  # Settings persistence (JSON files)
    ├── gifGenerator.js   # GIF creation from captured images
    ├── scheduler.js      # Capture scheduling state machine
    └── sunTimes.js       # Sunrise/sunset API integration
public/
└── index.html            # Web dashboard (vanilla HTML/JS)
data/
├── config/               # Persisted settings and sun times cache
├── captures/             # Daily folders with JPG images
└── gifs/                 # Generated GIF animations
```

## Key Concepts

### Scheduler State Machine

The scheduler has four states:
- `idle` - Capture disabled or not scheduled
- `waiting` - Waiting for next capture window
- `capturing` - Actively capturing images at intervals
- `generating` - Creating GIF from captured images

### Capture Window

A capture window is defined by:
- **Event type**: sunrise or sunset
- **Offset**: Minutes before/after the event (default: 30)
- The window spans from `event - offset` to `event + offset`

### Configuration

Settings are stored in `data/config/settings.json` with these sections:
- `camera.url` - REST endpoint returning JPEG image
- `capture` - Event type, interval, offset, enabled flag
- `location` - Coordinates and timezone for sun times
- `gif` - Frame delay and resize width

## Coding Conventions

- Use CommonJS (`require`/`module.exports`), not ES modules
- Async/await for all asynchronous operations
- Console logging for status and errors (no external logger)
- Dates formatted as `YYYY-MM-DD`, times as `HH-mm-ss`
- All paths use `path.join()` for cross-platform compatibility
- Environment variables: `PORT`, `DATA_DIR`, `TZ`, `NODE_ENV`

## API Design

- All API routes prefixed with `/api`
- JSON request/response bodies
- Static files served from `/public`
- Captures served from `/captures/:date/:filename`
- GIFs served from `/gifs/:filename`

## Docker Considerations

- Multi-stage build to minimize image size
- Native dependencies (canvas, sharp) require Alpine packages
- Data directory mounted as volume for persistence
- Runs as non-root `node` user
- Timezone set via `TZ` environment variable

## Common Tasks

### Adding a new API endpoint
Add route in `src/routes/api.js`, import required services

### Modifying capture behavior
Edit `src/services/scheduler.js` state machine

### Changing GIF output
Edit `src/services/gifGenerator.js`, adjust sharp/gif-encoder options

### Adding new configuration options
1. Add default in `configManager.js` `DEFAULT_SETTINGS`
2. Update dashboard form in `public/index.html`
3. Use in relevant service via `configManager.loadSettings()`

## Testing Notes

- Camera URL can point to any HTTP endpoint returning JPEG
- Use `host.docker.internal` to access host machine from container
- Manual capture can be triggered via API: `POST /api/capture/start`
- Sun times API: https://api.sunrise-sunset.org/json
