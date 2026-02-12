# Use official Node.js image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (copying package files first for caching)
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD [ "node", "server.js" ]
