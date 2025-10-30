import express from 'express';
import db from '../config/database.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';
import { validateRequest, createTicketSchema, updateTicketSchema, commentSchema } from '../middleware/validation.js';
import { getWebSocketServer } from '../websocket/socketServer.js';

const router = express.Router();

// Get all tickets with pagination and filtering
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const assigned_to = req.query.assigned_to as string;
    const search = req.query.search as string;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND t.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (priority) {
      paramCount++;
      whereClause += ` AND t.priority = $${paramCount}`;
      queryParams.push(priority);
    }

    if (assigned_to) {
      paramCount++;
      whereClause += ` AND t.assigned_to_user_id = $${paramCount}`;
      queryParams.push(assigned_to);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (t.subject ILIKE $${paramCount} OR t.description ILIKE $${paramCount} OR t.tracking_number ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // For agents, only show tickets assigned to them
    if (req.user?.role === 'agent') {
      paramCount++;
      whereClause += ` AND t.assigned_to_user_id = $${paramCount}`;
      queryParams.push(req.user.id);
    }

    const query = `
      SELECT 
        t.*,
        u.full_name as assigned_to_name,
        (SELECT COUNT(*) FROM ticket_comments tc WHERE tc.ticket_id = t.id) as comment_count
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tickets t
      ${whereClause}
    `;
    
    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      tickets: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single ticket by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const ticketId = req.params.id;

    const query = `
      SELECT 
        t.*,
        u.full_name as assigned_to_name,
        u.email as assigned_to_email
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      WHERE t.id = $1
    `;

    const result = await db.query(query, [ticketId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    // For agents, only allow access to their assigned tickets
    if (req.user?.role === 'agent' && ticket.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get ticket comments
    const commentsQuery = `
      SELECT 
        tc.*,
        u.full_name as user_name
      FROM ticket_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.ticket_id = $1
      ORDER BY tc.created_at ASC
    `;

    const commentsResult = await db.query(commentsQuery, [ticketId]);

    res.json({
      ticket,
      comments: commentsResult.rows
    });

  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new ticket
router.post('/', authenticateToken, validateRequest(createTicketSchema), async (req: AuthRequest, res) => {
  try {
    const { tracking_number, customer_phone, subject, description, priority } = req.body;

    const query = `
      INSERT INTO tickets (tracking_number, customer_phone, subject, description, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [tracking_number, customer_phone, subject, description, priority]);
    const ticket = result.rows[0];

    // Broadcast ticket creation via WebSocket
    const socketServer = getWebSocketServer();
    if (socketServer) {
      socketServer.broadcastTicketCreated(ticket);
    }

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });

  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update ticket
router.put('/:id', authenticateToken, validateRequest(updateTicketSchema), async (req: AuthRequest, res) => {
  try {
    const ticketId = req.params.id;
    const updates = req.body;

    // Check if ticket exists
    const checkResult = await db.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = checkResult.rows[0];

    // For agents, only allow updating their assigned tickets
    if (req.user?.role === 'agent' && ticket.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update query dynamically
    const updateFields = Object.keys(updates);
    const updateValues = Object.values(updates);
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    // Add closed_at timestamp if status is being changed to closed
    let additionalSet = '';
    if (updates.status === 'closed' && ticket.status !== 'closed') {
      additionalSet = ', closed_at = CURRENT_TIMESTAMP';
    } else if (updates.status && updates.status !== 'closed' && ticket.status === 'closed') {
      additionalSet = ', closed_at = NULL';
    }

    const query = `
      UPDATE tickets 
      SET ${setClause}${additionalSet}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [ticketId, ...updateValues]);
    const updatedTicket = result.rows[0];

    // Broadcast ticket update via WebSocket
    const socketServer = getWebSocketServer();
    if (socketServer) {
      socketServer.broadcastTicketUpdate(updatedTicket);
    }

    res.json({
      message: 'Ticket updated successfully',
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to ticket
router.post('/:id/comments', authenticateToken, validateRequest(commentSchema), async (req: AuthRequest, res) => {
  try {
    const ticketId = req.params.id;
    const { comment_text, is_internal_note } = req.body;

    // Check if ticket exists
    const ticketResult = await db.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // For agents, only allow commenting on their assigned tickets
    if (req.user?.role === 'agent' && ticket.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = `
      INSERT INTO ticket_comments (ticket_id, user_id, comment_text, is_internal_note)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [ticketId, req.user?.id, comment_text, is_internal_note]);

    res.status(201).json({
      message: 'Comment added successfully',
      comment: result.rows[0]
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete ticket (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const ticketId = req.params.id;

    const result = await db.query('DELETE FROM tickets WHERE id = $1 RETURNING *', [ticketId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });

  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
