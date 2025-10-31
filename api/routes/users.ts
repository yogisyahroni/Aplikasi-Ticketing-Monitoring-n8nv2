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

    // Use adapter method with filters
    const filters = {
      role,
      search,
      limit,
      offset
    };

    const users = await db.getUsers(filters);

    // For pagination, we need to get total count separately
    // This is a simplified approach - in production, you'd want the adapter to return both data and count
    const totalFilters = { role, search };
    const allUsers = await db.getUsers(totalFilters);
    const total = allUsers.length;

    res.json({
      users: users,
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

    const user = await db.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: user
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
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create new user using adapter
    const userData = { full_name, email, password_hash, role };
    const newUser = await db.createUser(userData);

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
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
    const existingUser = await db.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email already exists (if email is being updated)
    if (updates.email && updates.email !== existingUser.email) {
      const emailUser = await db.getUserByEmail(updates.email);
      if (emailUser && emailUser.id !== userId) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update user using adapter
    const updatedUser = await db.updateUser(userId, updates);

    res.json({
      message: 'User updated successfully',
      user: updatedUser
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

    const deletedUser = await db.deleteUser(userId);

    if (!deletedUser) {
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
    const agents = await db.getUsers({ role: 'agent', is_active: true });

    res.json({
      agents: agents
    });

  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
