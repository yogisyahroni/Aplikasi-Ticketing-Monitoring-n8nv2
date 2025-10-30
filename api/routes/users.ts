import express from 'express';
import bcrypt from 'bcrypt';
import db from '../config/database.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';
import { validateRequest, createUserSchema, updateUserSchema } from '../middleware/validation.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const role = req.query.role as string;
    const search = req.query.search as string;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      whereClause += ` AND role = $${paramCount}`;
      queryParams.push(role);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (full_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    const query = `
      SELECT 
        id, full_name, email, role, is_active, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;
    
    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      users: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single user by ID (admin only)
router.get('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;

    const result = await db.query(
      'SELECT id, full_name, email, role, is_active, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireRole(['admin']), validateRequest(createUserSchema), async (req: AuthRequest, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    // Check if email already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert new user
    const query = `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, email, role, is_active, created_at
    `;
    
    const result = await db.query(query, [full_name, email, password_hash, role]);

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), validateRequest(updateUserSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    // Check if user exists
    const checkResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email already exists (if email is being updated)
    if (updates.email) {
      const existingUser = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [updates.email, userId]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Build update query dynamically
    const updateFields = Object.keys(updates);
    const updateValues = Object.values(updates);
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const query = `
      UPDATE users 
      SET ${setClause}
      WHERE id = $1
      RETURNING id, full_name, email, role, is_active, created_at, updated_at
    `;

    const result = await db.query(query, [userId, ...updateValues]);

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agents list (for ticket assignment)
router.get('/agents/list', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      'SELECT id, full_name, email FROM users WHERE role = $1 AND is_active = true ORDER BY full_name',
      ['agent']
    );

    res.json({
      agents: result.rows
    });

  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
