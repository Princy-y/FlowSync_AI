# ─── Stage 1: Build the React/Vite frontend ──────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and install frontend deps
COPY package.json package-lock.json ./
RUN npm ci

# Accept the Gemini API key at build time so Vite can bake it into the bundle
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production Express server ──────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy backend files
COPY backend/package.json ./
RUN npm install --omit=dev

# Copy the Express server
COPY backend/server.js ./

# Copy the built frontend into /app/dist
# server.js looks for path.join(__dirname, 'dist') = /app/dist ✓
COPY --from=builder /app/dist ./dist

# Cloud Run injects PORT
ENV PORT=8080
EXPOSE 8080

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "server.js"]
