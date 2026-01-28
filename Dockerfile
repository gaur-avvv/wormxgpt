FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build for production
RUN npm run build

EXPOSE 3000

# Set environment variable at runtime
ENV NODE_ENV=production

CMD ["npm", "start"]
