# Use official Puppeteer image with Chrome already installed and configured
FROM ghcr.io/puppeteer/puppeteer:21.5.0

# Set working directory inside container
WORKDIR /usr/src/app

# Set environment variables for puppeteer and port
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PORT=3000

# Copy package files with correct permissions
COPY --chown=pptruser:pptruser package*.json ./

# Install dependencies as pptruser
RUN npm install --omit=dev

# Copy project files
COPY --chown=pptruser:pptruser . .

# Expose server port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
