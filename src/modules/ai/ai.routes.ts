import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { aiLimiter } from '../../middleware/rateLimiter.middleware';
import {
  generateWorkoutSchema,
  generateDietSchema,
  chatSchema,
  scanFoodSchema,
} from './ai.validation';
import * as aiController from './ai.controller';

// ─── Gym-scoped AI routes (/api/v1/gyms/:gymId/ai) ──────────────────────────
const gymRouter = Router({ mergeParams: true });

gymRouter.use(authenticate, belongsToGym, aiLimiter);

// Trainer/admin generates AI plans for a member
gymRouter.post(
  '/generate-workout',
  authorize('gym_admin', 'trainer'),
  validate(generateWorkoutSchema),
  aiController.generateWorkout
);
gymRouter.post(
  '/generate-diet',
  authorize('gym_admin', 'trainer'),
  validate(generateDietSchema),
  aiController.generateDiet
);

// Admin-only analytics
gymRouter.get(
  '/churn-prediction',
  authorize('gym_admin'),
  aiController.getChurnPrediction
);
gymRouter.get(
  '/crowd-prediction',
  authorize('gym_admin', 'trainer', 'staff'),
  aiController.getCrowdPrediction
);

// Per-member progress insights (admin/trainer can view any member's)
gymRouter.get(
  '/progress/:memberId',
  authorize('gym_admin', 'trainer'),
  aiController.getProgressInsights
);

// ─── Member self-service AI routes (/api/v1/ai) ──────────────────────────────
const memberRouter = Router();

memberRouter.use(authenticate, aiLimiter);

// Fitness chatbot
memberRouter.post('/chat', validate(chatSchema), aiController.chat);
memberRouter.get('/chat/history', aiController.getChatHistory);
memberRouter.delete('/chat/history', aiController.clearChatHistory);

// Food scanner
memberRouter.post('/scan-food', validate(scanFoodSchema), aiController.scanFood);

// Member's own progress insights
memberRouter.get('/progress-insights', aiController.getMyProgressInsights);

export { gymRouter as gymAiRoutes, memberRouter as aiRoutes };
