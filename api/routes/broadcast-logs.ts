import express from 'express';
import db from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validateRequest, createBroadcastLogSchema } from '../middleware/validation.js';
import { getWebSocketServer } from '../websocket/socketServer.js';

const router = express.Router();

// Get all broadcast logs with pagination and filtering
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const status = req.query.status as string;
    const tracking_number = req.query.tracking_number as string;
    const phone = req.query.phone as string;
    const date_from = req.query.date_from as string;
    const date_to = req.query.date_to as string;

    // Build filters object for adapter
    const filters: any = {
      status,
      tracking_number,
      phone,
      date_from,
      date_to,
      limit,
      offset
    };

    // Get broadcast logs using adapter
    const broadcast_logs = await db.getBroadcastLogs(filters);

    // Get total count for pagination
    const totalFilters = { ...filters };
    delete totalFilters.limit;
    delete totalFilters.offset;
    const allLogs = await db.getBroadcastLogs(totalFilters);
    const total = allLogs.length;

    res.json({
      broadcast_logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get broadcast logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single broadcast log by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const logId = req.params.id;

    const result = await db.getBroadcastLogById(logId);

    if (!result) {
      return res.status(404).json({ error: 'Broadcast log not found' });
    }

    res.json({
      broadcast_log: result
    });

  } catch (error) {
    console.error('Get broadcast log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get broadcast statistics
router.get('/stats/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const date_from = req.query.date_from as string || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const date_to = req.query.date_to as string || new Date().toISOString();

    let stats = {
      total_broadcasts: 0,
      successful_broadcasts: 0,
      failed_broadcasts: 0,
      pending_broadcasts: 0,
      success_rate: 0
    };

    try {
      if (db.getDatabaseType() !== 'supabase') {
        const query = `
          SELECT 
            COUNT(*) as total_broadcasts,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_broadcasts,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_broadcasts,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_broadcasts,
            ROUND(
              (COUNT(CASE WHEN status = 'success' THEN 1 END)::decimal / NULLIF(COUNT(*), 0)) * 100, 
              2
            ) as success_rate
          FROM broadcast_logs
          WHERE broadcast_at >= $1 AND broadcast_at <= $2
        `;

        const result = await db.query(query, [date_from, date_to]);
        stats = result.rows[0] || stats;
      }
    } catch (error) {
      console.warn('Could not fetch broadcast statistics:', error);
    }

    // Get hourly statistics for the last 24 hours
    let hourly_stats = [];
    try {
      if (db.getDatabaseType() !== 'supabase') {
        const hourlyQuery = `
          SELECT 
            DATE_TRUNC('hour', broadcast_at) as hour,
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
          FROM broadcast_logs
          WHERE broadcast_at >= NOW() - INTERVAL '24 hours'
          GROUP BY DATE_TRUNC('hour', broadcast_at)
          ORDER BY hour DESC
        `;

        const hourlyResult = await db.query(hourlyQuery);
        hourly_stats = hourlyResult.rows || [];
      }
    } catch (error) {
      console.warn('Could not fetch hourly statistics:', error);
    }

    res.json({
      summary: stats,
      hourly_stats
    });

  } catch (error) {
    console.error('Get broadcast stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new broadcast log (for n8n integration)
router.post('/', validateRequest(createBroadcastLogSchema), async (req, res) => {
  try {
    const { 
      tracking_number, 
      consignee_name, 
      consignee_phone, 
      message, 
      status = 'pending',
      response_message,
      broadcast_at = new Date().toISOString()
    } = req.body;

    const logData = {
      tracking_number,
      consignee_name,
      consignee_phone,
      message,
      status,
      response_message,
      broadcast_at
    };

    const result = await db.createBroadcastLog(logData);
    // Broadcast via WebSocket
    const socketServer = getWebSocketServer();
    if (socketServer) {
      socketServer.broadcastUpdate('broadcast_created', result);
    }

    res.status(201).json({
      message: 'Broadcast log created successfully',
      broadcast_log: result
    });

  } catch (error) {
    console.error('Create broadcast log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update broadcast log status (for n8n integration)
router.put('/:id/status', async (req, res) => {
  try {
    const logId = req.params.id;
    const { status, response_message } = req.body;

    if (!['pending', 'success', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates = {
      status,
      response_message,
      updated_at: new Date().toISOString()
    };

    const result = await db.updateBroadcastLog(logId, updates);

    if (!result) {
      return res.status(404).json({ error: 'Broadcast log not found' });
    }

    // Broadcast via WebSocket
    const socketServer = getWebSocketServer();
    if (socketServer) {
      socketServer.broadcastUpdate('broadcast_updated', result);
    }

    res.json({
      message: 'Broadcast log updated successfully',
      broadcast_log: result
    });

  } catch (error) {
    console.error('Update broadcast log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
