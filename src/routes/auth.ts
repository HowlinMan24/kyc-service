import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import * as authService from '../services/authService.js';

export const authRouter: Router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

authRouter.post('/register', validateBody(credentialsSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body.email, req.body.password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', validateBody(credentialsSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
