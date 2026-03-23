import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { corsOptions } from './config/cors';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requirePasswordChanged } from './middleware/auth.middleware';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import gymRoutes from './modules/gym/gym.routes';
import memberRoutes from './modules/member/member.routes';
import meRoutes from './modules/member/me.routes';
import trainerRoutes from './modules/trainer/trainer.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import workoutRoutes from './modules/workout/workout.routes';
import dietRoutes from './modules/diet/diet.routes';
import classRoutes from './modules/class/class.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import paymentRoutes from './modules/payment/payment.routes';
import notificationRoutes from './modules/notification/notification.routes';
import { razorpayWebhook } from './modules/payment/payment.controller';
import { gymAiRoutes, aiRoutes } from './modules/ai/ai.routes';
import { gymAnalyticsRoutes, platformAnalyticsRoutes, meAnalyticsRoutes } from './modules/analytics/analytics.routes';

const app: Application = express();

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Logging ─────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);

// ─── Force Password Change ──────────────────────────────────────────────────
// All routes below require the user to have changed their temporary password
app.use(requirePasswordChanged);

app.use('/api/v1/gyms', gymRoutes);
app.use('/api/v1/gyms/:gymId/members', memberRoutes);
app.use('/api/v1/gyms/:gymId', trainerRoutes);
app.use('/api/v1/gyms/:gymId', subscriptionRoutes);
app.use('/api/v1/gyms/:gymId/workout-plans', workoutRoutes);
app.use('/api/v1/gyms/:gymId/diet-plans', dietRoutes);
app.use('/api/v1/gyms/:gymId/classes', classRoutes);
app.use('/api/v1/gyms/:gymId/attendance', attendanceRoutes);
app.use('/api/v1/gyms/:gymId/payments', paymentRoutes);
app.use('/api/v1/me/notifications', notificationRoutes);
app.post('/api/v1/payments/webhook', razorpayWebhook);
app.use('/api/v1/gyms/:gymId/ai', gymAiRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/gyms/:gymId/analytics', gymAnalyticsRoutes);
app.use('/api/v1/analytics', platformAnalyticsRoutes);
app.use('/api/v1/me/analytics', meAnalyticsRoutes);
app.use('/api/v1/me', meRoutes);

// ─── 404 & Error Handlers ────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
