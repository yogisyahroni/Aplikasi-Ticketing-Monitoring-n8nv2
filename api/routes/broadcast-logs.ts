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

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    if (tracking_number) {
      paramCount++;
      whereClause += ` AND tracking_number ILIKE $${paramCount}`;
      queryParams.push(`%${tracking_number}%`);
    }

    if (phone) {
      paramCount++;
      whereClause += ` AND consignee_phone ILIKE $${paramCount}`;
      queryParams.push(`%${phone}%`);
    }

    if (date_from) {
      paramCount++;
      whereClause += ` AND broadcast_at >= $${paramCount}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      whereClause += ` AND broadcast_at <= $${paramCount}`;
      queryParams.push(date_to);
    }

    const query = `
      SELECT *
      FROM broadcast_logs
      ${whereClause}
      ORDER BY broadcast_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM broadcast_logs
      ${whereClause}
    `;
    
    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      broadcast_logs: result.rows,
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

    const result = await db.query('SELECT * FROM broadcast_logs WHERE id = $1', [logId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Broadcast log not found' });
    }

    res.json({
      broadcast_log: result.rows[0]
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

    // Get hourly statistics for the last 24 hours
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

    res.json({
      summary: result.rows[0],
      hourly_stats: hourlyResult.rows
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

    const query = `
      INSERT INTO broadcast_logs (
        tracking_number, consignee_name, consignee_phone, 
        message, status, response_message, broadcast_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await db.query(query, [
      tracking_number, consignee_name, consignee_phone,
      message, status, response_message, broadcast_at
    ]);

    const broadcastLog = result.rows[0];

    // Broadcast via WebSocket
    const socketServer = getWebSocketServer();
    if (socketServer) {
      socketServer.broadcastUpdate('broadcast_created', broadcastLog);
    }

    res.status(201).json({
      message: 'Broadcast log created successfully',
      broadcast_log: broadcastLog
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

    const query = `
      UPDATE broadcast_logs 
      SET status = $1, response_message = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(query, [status, response_message, logId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Broadcast log not found' });
    }

    const updatedLog = result.rows[0];

    // Broadcast via WebSocket
    const socketServer = getWebSocketServer();
    if (socketServer) {
      socketServer.broadcastUpdate('broadcast_updated', updatedLog);
    }

    res.json({
      message: 'Broadcast log updated successfully',
      broadcast_log: updatedLog
    });

  } catch (error) {
    console.error('Update broadcast log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
