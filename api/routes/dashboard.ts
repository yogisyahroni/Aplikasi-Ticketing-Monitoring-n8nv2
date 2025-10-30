import express from 'express';
import db from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard summary statistics
router.get('/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Get ticket statistics
    const ticketStatsQuery = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tickets,
        COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold_tickets,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    // Get broadcast statistics
    const broadcastStatsQuery = `
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
      WHERE broadcast_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    // Get user statistics
    const userStatsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'agent' AND is_active = true THEN 1 END) as active_agents,
        COUNT(CASE WHEN role = 'admin' AND is_active = true THEN 1 END) as active_admins
      FROM users
    `;

    // Get recent activity
    const recentActivityQuery = `
      (
        SELECT 
          'ticket' as type,
          'Ticket ' || ticket_uid || ' created' as description,
          created_at as timestamp
        FROM tickets
        ORDER BY created_at DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 
          'broadcast' as type,
          'Broadcast to ' || consignee_phone || ' - ' || status as description,
          broadcast_at as timestamp
        FROM broadcast_logs
        ORDER BY broadcast_at DESC
        LIMIT 5
      )
      ORDER BY timestamp DESC
      LIMIT 10
    `;

    const [ticketStats, broadcastStats, userStats, recentActivity] = await Promise.all([
      db.query(ticketStatsQuery),
      db.query(broadcastStatsQuery),
      db.query(userStatsQuery),
      db.query(recentActivityQuery)
    ]);

    res.json({
      tickets: ticketStats.rows[0],
      broadcasts: broadcastStats.rows[0],
      users: userStats.rows[0],
      recent_activity: recentActivity.rows
    });

  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ticket trends (for charts)
router.get('/tickets/trends', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await db.query(query);

    res.json({
      trends: result.rows
    });

  } catch (error) {
    console.error('Get ticket trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get broadcast trends (for charts)
router.get('/broadcasts/trends', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const query = `
      SELECT 
        DATE(broadcast_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM broadcast_logs
      WHERE broadcast_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(broadcast_at)
      ORDER BY date DESC
    `;

    const result = await db.query(query);

    res.json({
      trends: result.rows
    });

  } catch (error) {
    console.error('Get broadcast trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agent performance statistics
router.get('/agents/performance', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        COUNT(t.id) as total_tickets,
        COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_tickets,
        COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tickets,
        ROUND(
          (COUNT(CASE WHEN t.status = 'closed' THEN 1 END)::decimal / NULLIF(COUNT(t.id), 0)) * 100, 
          2
        ) as resolution_rate,
        AVG(
          CASE 
            WHEN t.status = 'closed' AND t.closed_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (t.closed_at - t.created_at)) / 3600 
          END
        ) as avg_resolution_time_hours
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_to_user_id
      WHERE u.role = 'agent' AND u.is_active = true
      GROUP BY u.id, u.full_name, u.email
      ORDER BY total_tickets DESC
    `;

    const result = await db.query(query);

    res.json({
      agent_performance: result.rows
    });

  } catch (error) {
    console.error('Get agent performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get priority distribution
router.get('/tickets/priority-distribution', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const query = `
      SELECT 
        priority,
        COUNT(*) as count,
        ROUND((COUNT(*)::decimal / (SELECT COUNT(*) FROM tickets)) * 100, 2) as percentage
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY priority
      ORDER BY 
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `;

    const result = await db.query(query);

    res.json({
      priority_distribution: result.rows
    });

  } catch (error) {
    console.error('Get priority distribution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
