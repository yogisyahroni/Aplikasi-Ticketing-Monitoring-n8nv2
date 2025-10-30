import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};

// Login validation schema
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// Ticket creation schema
export const createTicketSchema = Joi.object({
  tracking_number: Joi.string().optional(),
  customer_phone: Joi.string().optional(),
  subject: Joi.string().min(5).max(255).required(),
  description: Joi.string().min(10).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium')
});

// Ticket update schema
export const updateTicketSchema = Joi.object({
  subject: Joi.string().min(5).max(255).optional(),
  description: Joi.string().min(10).optional(),
  status: Joi.string().valid('open', 'pending', 'on_hold', 'closed').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  assigned_to_user_id: Joi.string().uuid().optional().allow(null)
});

// Broadcast log schema
export const broadcastLogSchema = Joi.object({
  tracking_number: Joi.string().optional(),
  consignee_phone: Joi.string().optional(),
  status: Joi.string().valid('success', 'failed', 'pending').required(),
  message_content: Joi.string().optional(),
  error_message: Joi.string().optional()
});

// Create broadcast log schema
export const createBroadcastLogSchema = Joi.object({
  tracking_number: Joi.string().min(1).required(),
  consignee_name: Joi.string().min(1).required(),
  consignee_phone: Joi.string().min(1).required(),
  message: Joi.string().min(1).required(),
  status: Joi.string().valid('pending', 'success', 'failed').default('pending'),
  response_message: Joi.string().optional(),
  broadcast_at: Joi.string().optional()
});

// Comment schema
export const commentSchema = Joi.object({
  comment_text: Joi.string().min(1).required(),
  is_internal_note: Joi.boolean().default(true)
});

// User creation schema
export const createUserSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('agent', 'admin').required()
});

// User update schema
export const updateUserSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('agent', 'admin').optional(),
  is_active: Joi.boolean().optional()
});
