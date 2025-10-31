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
    const assigned_to_user_id = req.query.assigned_to_user_id as string;
    const search = req.query.search as string;

    // Build filters object for adapter
    const filters: any = {
      status,
      priority,
      assigned_to_user_id,
      search,
      limit,
      offset
    };

    // For agents, only show tickets assigned to them
    if (req.user?.role === 'agent') {
      filters.assigned_to_user_id = req.user.id;
    }

    const tickets = await db.getTickets(filters);

    // Get total count for pagination
    const totalFilters = { ...filters };
    delete totalFilters.limit;
    delete totalFilters.offset;
    const allTickets = await db.getTickets(totalFilters);
    const total = allTickets.length;

    res.json({
      tickets: tickets,
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

    const ticket = await db.getTicketById(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // For agents, only allow access to their assigned tickets
    if (req.user?.role === 'agent' && ticket.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get ticket comments - we'll need to implement this in adapter later
    // For now, use direct query as fallback
    let comments = [];
    try {
      if (db.getDatabaseType() !== 'supabase') {
        const commentsResult = await db.query(`
          SELECT 
            tc.*,
            u.full_name as user_name
          FROM ticket_comments tc
          LEFT JOIN users u ON tc.user_id = u.id
          WHERE tc.ticket_id = $1
          ORDER BY tc.created_at ASC
        `, [ticketId]);
        comments = commentsResult.rows || [];
      }
    } catch (error) {
      console.warn('Could not fetch comments:', error);
      comments = [];
    }

    res.json({
      ticket,
      comments
    });

  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new ticket
router.post('/', authenticateToken, validateRequest(createTicketSchema), async (req: AuthRequest, res) => {
  try {
    const { tracking_number, customer_phone, title, description, priority } = req.body;

    const ticketData = {
      tracking_number,
      customer_phone,
      title,
      description,
      priority
    };

    const ticket = await db.createTicket(ticketData);

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
    const existingTicket = await db.getTicketById(ticketId);
    if (!existingTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // For agents, only allow updating their assigned tickets
    if (req.user?.role === 'agent' && existingTicket.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Handle closed_at timestamp logic
    if (updates.status === 'closed' && existingTicket.status !== 'closed') {
      updates.closed_at = new Date().toISOString();
    } else if (updates.status && updates.status !== 'closed' && existingTicket.status === 'closed') {
      updates.closed_at = null;
    }

    const updatedTicket = await db.updateTicket(ticketId, updates);

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
    const ticket = await db.getTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // For agents, only allow commenting on their assigned tickets
    if (req.user?.role === 'agent' && ticket.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // For now, use direct query for comments as we haven't implemented comment adapter methods yet
    let comment = null;
    try {
      if (db.getDatabaseType() !== 'supabase') {
        const result = await db.query(`
          INSERT INTO ticket_comments (ticket_id, user_id, comment_text, is_internal_note)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [ticketId, req.user?.id, comment_text, is_internal_note]);
        comment = result.rows[0];
      } else {
        // For Supabase, we'd need to implement comment methods in adapter
        throw new Error('Comment creation not yet implemented for Supabase');
      }
    } catch (error) {
      console.error('Comment creation error:', error);
      return res.status(500).json({ error: 'Could not create comment' });
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment
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

    const deletedTicket = await db.deleteTicket(ticketId);

    if (!deletedTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });

  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
