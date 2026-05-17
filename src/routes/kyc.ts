import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import * as kycService from '../services/kycService.js';

export const kycRouter: Router = Router();

const kycInputSchema = z.object({
  fullName: z.string().min(2).max(120),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  nationality: z.string().length(2, 'ISO 3166-1 alpha-2 code'),
  documentType: z.enum(['passport', 'id_card', 'driver_license']),
  documentNumber: z.string().min(4).max(40),
});

const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().max(500).optional(),
});

kycRouter.post('/profile', requireAuth, validateBody(kycInputSchema), async (req, res, next) => {
  try {
    const profile = await kycService.submitProfile(req.user!.sub, req.body);
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

kycRouter.get('/profile/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await kycService.getOwnProfile(req.user!.sub);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

kycRouter.get('/review/queue', requireAuth, requireRole('admin', 'reviewer'), async (_req, res, next) => {
  try {
    const list = await kycService.listForReview();
    res.json({ items: list, count: list.length });
  } catch (err) {
    next(err);
  }
});

kycRouter.post(
  '/review/:id/decide',
  requireAuth,
  requireRole('admin', 'reviewer'),
  validateBody(decisionSchema),
  async (req, res, next) => {
    try {
      const profile = await kycService.decide(req.params.id!, req.user!.sub, req.body.decision, req.body.reason);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);
