import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import * as analyticsController from './analytics.controller';

// ─── Gym-scoped analytics (/api/v1/gyms/:gymId/analytics) ────────────────────
const gymRouter = Router({ mergeParams: true });

gymRouter.use(authenticate, belongsToGym);

gymRouter.get('/dashboard', authorize('gym_admin'), analyticsController.getGymDashboard);
gymRouter.get('/revenue', authorize('gym_admin'), analyticsController.getRevenueAnalytics);
gymRouter.get('/members', authorize('gym_admin'), analyticsController.getMemberAnalytics);

// ─── Super admin platform analytics (/api/v1/analytics) ──────────────────────
const platformRouter = Router();

platformRouter.use(authenticate);
platformRouter.get('/platform', authorize('super_admin'), analyticsController.getPlatformAnalytics);

// ─── Member personal progress (/api/v1/me/analytics) ─────────────────────────
const meRouter = Router();

meRouter.use(authenticate);
meRouter.get('/progress', analyticsController.getMyProgressAnalytics);

export { gymRouter as gymAnalyticsRoutes, platformRouter as platformAnalyticsRoutes, meRouter as meAnalyticsRoutes };
