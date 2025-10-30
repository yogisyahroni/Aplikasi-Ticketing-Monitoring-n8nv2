# Multi-stage build for Dashboard Monitoring Broadcast & Ticketing Logistik v2.0

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend
RUN pnpm run build

# Stage 2: Production runtime
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./dist

# Copy backend source code
COPY api ./api
COPY database ./database
COPY scripts ./scripts

# Copy configuration files
COPY nodemon.json tsconfig.json ./
COPY .env.example ./.env

# Install tsx for TypeScript execution
RUN pnpm add tsx

# Create necessary directories and set permissions
RUN mkdir -p /app/logs /app/uploads /app/data
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3001 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["pnpm", "run", "server:dev"]