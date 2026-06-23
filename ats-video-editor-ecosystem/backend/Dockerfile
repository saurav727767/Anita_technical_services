# Use official Node.js base image
FROM node:18-bullseye-slim

# Install system dependencies including FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package configurations
COPY package*.json ./

# Install packages
RUN npm install --production

# Copy remaining server code
COPY . .

# Expose backend port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
