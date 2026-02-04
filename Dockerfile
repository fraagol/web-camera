# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (canvas, sharp)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies for native modules
RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    fontconfig \
    ttf-dejavu

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY package*.json ./
COPY src ./src
COPY public ./public

# Create data directory
RUN mkdir -p /app/data && chown -R node:node /app

# Use non-root user
USER node

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/status || exit 1

# Start application
CMD ["node", "src/index.js"]
