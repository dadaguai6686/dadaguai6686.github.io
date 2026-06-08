# Dockerfile - Production Setup
FROM node:22-bookworm-slim

# Set working directory
WORKDIR /usr/src/app

# Copy dependency configuration files
COPY --chown=node:node package*.json ./

# Install dependencies (only production libs to minimize size)
RUN npm ci --omit=dev

# Copy codebase
COPY --chown=node:node . .

# Create uploads folder in case it is not mounted
RUN mkdir -p uploads && chown -R node:node uploads

# Expose server port
EXPOSE 3000

# Set Node environment to production
ENV NODE_ENV=production
ENV PORT=3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start application
CMD ["node", "server.js"]
