# Multi-stage build for StudyBuddy Mobile App
# This Dockerfile is primarily for CI/CD builds and testing
# For development, use Expo CLI directly (npm start)

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Stage 2: Development server (optional)
FROM node:20-alpine AS dev
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build arguments for environment variables
ARG EXPO_PUBLIC_API_BASE_URL
ENV EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL

# Expose Expo dev server ports
EXPOSE 8081 19000 19001 19002

# Start Expo dev server
CMD ["npx", "expo", "start", "--host", "tunnel"]

