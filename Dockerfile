# Dockerfile - Production Setup
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency configuration files
COPY package*.json ./

# Install dependencies (only production libs to minimize size)
RUN npm ci --only=production

# Copy codebase
COPY . .

# Create uploads folder in case it is not mounted
RUN mkdir -p uploads

# Expose server port
EXPOSE 3000

# Set Node environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Start application
CMD ["node", "server.js"]
