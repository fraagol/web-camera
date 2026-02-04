# Webcam GIF Capture

Automated sunrise/sunset timelapse generator. Captures images from a local webcam around sunrise or sunset times and generates GIF animations.

## Features

- 📷 Automatic image capture at configurable intervals
- 🌅 Scheduled capture based on sunrise/sunset times (Valencia, Spain)
- 🎬 Automatic GIF generation after each capture session
- 🖥️ Web dashboard for configuration and monitoring
- 🐳 Docker-ready with persistent storage

## Quick Start

### Using Docker (Recommended)

```bash
# Build and start the container
docker compose up -d

# View logs
docker compose logs -f

# Stop the container
docker compose down
```

The application will be available at `http://localhost:3000`

### Without Docker

```bash
# Install dependencies
npm install

# Start the application
npm start
```

## Configuration

All configuration is done via the web dashboard at `http://localhost:3000`:

| Setting | Description | Default |
|---------|-------------|---------|
| Camera URL | REST endpoint that returns JPEG | `http://192.168.1.72/capture` |
| Event Type | `sunrise` or `sunset` | `sunrise` |
| Capture Interval | Seconds between captures | `15` |
| Offset | Minutes before/after event to capture | `30` |
| GIF Frame Delay | Milliseconds between GIF frames | `100` |
| GIF Width | Output GIF width in pixels | `800` |
| Enabled | Enable/disable scheduled captures | `true` |

## Data Structure

All data is persisted in the `./data` directory:

```
data/
├── config/
│   ├── settings.json      # Application configuration
│   └── sun-times.json     # Cached sun times
├── captures/
│   └── YYYY-MM-DD/        # Daily capture folders
│       ├── HH-mm-ss.jpg
│       └── ...
└── gifs/
    └── YYYY-MM-DD-sunrise.gif
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get current configuration |
| POST | `/api/config` | Update configuration |
| GET | `/api/status` | Get current status and scheduler state |
| GET | `/api/preview` | Get live camera image |
| GET | `/api/camera/test` | Test camera connection |
| POST | `/api/capture/start` | Start manual capture session |
| POST | `/api/capture/stop` | Stop capture and generate GIF |
| GET | `/api/captures` | List all capture dates |
| GET | `/api/captures/:date` | List captures for a date |
| GET | `/api/gifs` | List all generated GIFs |
| POST | `/api/gif/generate/:date` | Regenerate GIF for a date |
| DELETE | `/api/gif/:filename` | Delete a GIF |
| GET | `/api/sun-times` | Get today's sun times |
| POST | `/api/sun-times/refresh` | Force refresh sun times |

## How It Works

1. **Daily Scheduling**: At 00:05 each day, the app fetches sunrise/sunset times from the [Sunrise-Sunset API](https://sunrise-sunset.org/api)

2. **Capture Window**: Based on the configured event type (sunrise/sunset) and offset, a capture window is scheduled

3. **Image Capture**: During the capture window, images are taken at the configured interval

4. **GIF Generation**: When the capture window ends, all images are compiled into an animated GIF

## Network Configuration

The Docker container uses `network_mode: host` to allow direct access to cameras on the local network. This means:

- The app binds directly to port 3000 on the host
- No port mapping needed in docker-compose
- Camera at `192.168.1.72` is directly accessible

## Location

The app is configured for **Valencia, Spain** (39.4699, -0.3763). The location is hardcoded but can be changed in the configuration file at `data/config/settings.json`.

## Timezone

The container is configured to use `Europe/Madrid` timezone. Sun times are calculated for this timezone.

## License

MIT
