/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import ticketsRoutes from './routes/tickets.js'
import broadcastLogsRoutes from './routes/broadcast-logs.js'
import usersRoutes from './routes/users.js'
import dashboardRoutes from './routes/dashboard.js'
import n8nRoutes from './routes/n8n.js'
import syncRoutes from './routes/sync.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/tickets', ticketsRoutes)
app.use('/api/broadcast-logs', broadcastLogsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/n8n', n8nRoutes)
app.use('/api/sync', syncRoutes)

// n8n Integration Routes (with API key authentication)
app.use('/api/v1', n8nRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
