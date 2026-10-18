# ==========================================
# SpotiQuiz — Multi-stage Production Dockerfile
# Optimized for Google Cloud Run & Container Registry
# ==========================================

# 1. Builder Stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm install

# Copy source code and build production artifacts
COPY . .
RUN npm run build

# 2. Production Runner Stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
# Install only production dependencies (no dev dependencies in final image)
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled frontend and bundled server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Cloud Run listens on PORT (default 8080)
EXPOSE 8080

# Start server directly with Node.js
CMD ["node", "dist-server/index.js"]
