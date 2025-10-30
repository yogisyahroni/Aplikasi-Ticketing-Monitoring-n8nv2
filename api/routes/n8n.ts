import express from 'express';
import db from '../config/database.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { validateRequest, broadcastLogSchema, createTicketSchema } from '../middleware/validation.js';

const router = express.Router();

// n8n endpoint to create broadcast log
router.post('/broadcast-logs', authenticateApiKey, validateRequest(broadcastLogSchema), async (req, res) => {
  try {
    const { tracking_number, consignee_phone, status, message_content, error_message } = req.body;

    const query = `
      INSERT INTO broadcast_logs (tracking_number, consignee_phone, status, message_content, error_message, broadcast_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await db.query(query, [tracking_number, consignee_phone, status, message_content, error_message]);
    const broadcastLog = result.rows[0];

    // Update dashboard summary metrics
    await updateDashboardMetrics();

    res.status(201).json({
      success: true,
      message: 'Broadcast log created successfully',
      data: {
        id: broadcastLog.id,
        tracking_number: broadcastLog.tracking_number,
        status: broadcastLog.status,
        broadcast_at: broadcastLog.broadcast_at
      }
    });

  } catch (error) {
    console.error('n8n broadcast log creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create broadcast log' 
    });
  }
});

// n8n endpoint to create ticket (from customer service workflow)
router.post('/tickets', authenticateApiKey, validateRequest(createTicketSchema), async (req, res) => {
  try {
    const { tracking_number, customer_phone, subject, description, priority } = req.body;

    const query = `
      INSERT INTO tickets (tracking_number, customer_phone, subject, description, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [tracking_number, customer_phone, subject, description, priority || 'medium']);
    const ticket = result.rows[0];

    // Update dashboard summary metrics
    await updateDashboardMetrics();

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: {
        id: ticket.id,
        ticket_uid: ticket.ticket_uid,
        tracking_number: ticket.tracking_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        created_at: ticket.created_at
      }
    });

  } catch (error) {
    console.error('n8n ticket creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create ticket' 
    });
  }
});

// n8n endpoint to update ticket status
router.put('/tickets/:id/status', authenticateApiKey, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status, comment } = req.body;

    if (!status || !['open', 'pending', 'on_hold', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: open, pending, on_hold, closed'
      });
    }

    // Check if ticket exists
    const checkResult = await db.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Update ticket status
    let updateQuery = 'UPDATE tickets SET status = $1';
    const queryParams = [status, ticketId];
    
    if (status === 'closed') {
      updateQuery += ', closed_at = CURRENT_TIMESTAMP';
    } else if (checkResult.rows[0].status === 'closed') {
      updateQuery += ', closed_at = NULL';
    }
    
    updateQuery += ' WHERE id = $2 RETURNING *';

    const result = await db.query(updateQuery, queryParams);
    const ticket = result.rows[0];

    // Add system comment if provided
    if (comment) {
      await db.query(
        'INSERT INTO ticket_comments (ticket_id, comment_text, is_internal_note) VALUES ($1, $2, $3)',
        [ticketId, `[n8n] ${comment}`, true]
      );
    }

    // Update dashboard summary metrics
    await updateDashboardMetrics();

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        id: ticket.id,
        ticket_uid: ticket.ticket_uid,
        status: ticket.status,
        updated_at: ticket.updated_at
      }
    });

  } catch (error) {
    console.error('n8n ticket status update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update ticket status' 
    });
  }
});

// n8n endpoint to get ticket by tracking number
router.get('/tickets/tracking/:tracking_number', authenticateApiKey, async (req, res) => {
  try {
    const trackingNumber = req.params.tracking_number;

    const query = `
      SELECT 
        id, ticket_uid, tracking_number, customer_phone, subject, 
        description, status, priority, created_at, updated_at
      FROM tickets 
      WHERE tracking_number = $1
    `;

    const result = await db.query(query, [trackingNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('n8n get ticket error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get ticket' 
    });
  }
});

// n8n endpoint to get broadcast logs by tracking number
router.get('/broadcast-logs/tracking/:tracking_number', authenticateApiKey, async (req, res) => {
  try {
    const trackingNumber = req.params.tracking_number;

    const query = `
      SELECT *
      FROM broadcast_logs 
      WHERE tracking_number = $1
      ORDER BY broadcast_at DESC
    `;

    const result = await db.query(query, [trackingNumber]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('n8n get broadcast logs error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get broadcast logs' 
    });
  }
});

// Helper function to update dashboard metrics
async function updateDashboardMetrics() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Update ticket metrics
    const ticketMetrics = await db.query(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tickets,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets
      FROM tickets
      WHERE DATE(created_at) = $1
    `, [today]);

    const ticketData = ticketMetrics.rows[0];

    // Update broadcast metrics
    const broadcastMetrics = await db.query(`
      SELECT 
        COUNT(*) as total_broadcasts,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_broadcasts,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_broadcasts
      FROM broadcast_logs
      WHERE DATE(broadcast_at) = $1
    `, [today]);

    const broadcastData = broadcastMetrics.rows[0];

    // Upsert dashboard summary
    const metrics = [
      { name: 'total_tickets', value: parseInt(ticketData.total_tickets) },
      { name: 'open_tickets', value: parseInt(ticketData.open_tickets) },
      { name: 'pending_tickets', value: parseInt(ticketData.pending_tickets) },
      { name: 'closed_tickets', value: parseInt(ticketData.closed_tickets) },
      { name: 'total_broadcasts', value: parseInt(broadcastData.total_broadcasts) },
      { name: 'successful_broadcasts', value: parseInt(broadcastData.successful_broadcasts) },
      { name: 'failed_broadcasts', value: parseInt(broadcastData.failed_broadcasts) }
    ];

    for (const metric of metrics) {
      await db.query(`
        INSERT INTO dashboard_summary (metric_name, metric_value, metric_date)
        VALUES ($1, $2, $3)
        ON CONFLICT (metric_name, metric_date)
        DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = CURRENT_TIMESTAMP
      `, [metric.name, metric.value, today]);
    }

  } catch (error) {
    console.error('Error updating dashboard metrics:', error);
  }
}

export default router;
