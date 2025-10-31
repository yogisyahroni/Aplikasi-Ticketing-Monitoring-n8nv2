import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export class WebSocketServer {
  private io: SocketIOServer;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Authenticate user using adapter
        const user = await db.getUserById(decoded.userId);
        if (!user || !user.is_active) {
          return next(new Error('Authentication error: User not found or inactive'));
        }
        socket.userId = user.id;
        socket.userRole = user.role;
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected via WebSocket`);

      // Join user to their role-based room
      socket.join(`role:${socket.userRole}`);
      socket.join(`user:${socket.userId}`);

      // Handle joining specific rooms
      socket.on('join-room', (room: string) => {
        socket.join(room);
        console.log(`User ${socket.userId} joined room: ${room}`);
      });

      socket.on('leave-room', (room: string) => {
        socket.leave(room);
        console.log(`User ${socket.userId} left room: ${room}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'Connected to real-time updates',
        userId: socket.userId,
        role: socket.userRole
      });
    });
  }

  // Broadcast methods for different events
  public broadcastTicketUpdate(ticket: any) {
    this.io.emit('ticket:updated', {
      type: 'ticket_updated',
      data: ticket,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastTicketCreated(ticket: any) {
    this.io.emit('ticket:created', {
      type: 'ticket_created',
      data: ticket,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastBroadcastLogUpdate(log: any) {
    this.io.emit('broadcast:updated', {
      type: 'broadcast_updated',
      data: log,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastUpdate(type: string, data: any) {
    this.io.emit('update', {
      type,
      data,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastDashboardUpdate(summary: any) {
    this.io.emit('dashboard:updated', {
      type: 'dashboard_updated',
      data: summary,
      timestamp: new Date().toISOString()
    });
  }

  public notifyUser(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    });
  }

  public notifyRole(role: string, notification: any) {
    this.io.to(`role:${role}`).emit('notification', {
      type: 'role_notification',
      data: notification,
      timestamp: new Date().toISOString()
    });
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.io.sockets.sockets.size;
  }

  // Get server instance for external use
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Export singleton instance
let socketServer: WebSocketServer | null = null;

export const initializeWebSocket = (server: HTTPServer): WebSocketServer => {
  if (!socketServer) {
    socketServer = new WebSocketServer(server);
  }
  return socketServer;
};

export const getWebSocketServer = (): WebSocketServer | null => {
  return socketServer;
};
