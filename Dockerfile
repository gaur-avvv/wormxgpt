FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build for production
RUN npm run build

# Use lightweight server for production
RUN npm install -g serve

EXPOSE 3000

# Set environment variable at runtime
ENV NODE_ENV=production

CMD ["serve", "-s", "dist", "-l", "3000"]
