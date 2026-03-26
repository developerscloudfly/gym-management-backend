import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import * as analyticsController from './analytics.controller';

// ─── Gym-scoped analytics (/api/v1/gyms/:gymId/analytics) ────────────────────
const gymRouter = Router({ mergeParams: true });

gymRouter.use(authenticate, belongsToGym);

/**
 * @swagger
 * /gyms/{gymId}/analytics/gym-admin-dashboard:
 *   get:
 *     summary: Gym admin dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard data including KPIs, expiring memberships, failed payments, inactive members, overloaded trainers, today's activity, member insights, revenue stats, today's classes, and trainer stats
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         kpis:
 *                           type: object
 *                           properties:
 *                             activeMembers: { type: integer }
 *                             todayCheckIns: { type: integer }
 *                             dailyRevenue: { type: number }
 *                             monthlyRevenue: { type: number }
 *                             activeSubscriptions: { type: integer }
 *                             classesToday: { type: integer }
 */
gymRouter.get(
  '/gym-admin-dashboard',
  authorize('gym_admin', 'super_admin'),
  analyticsController.getGymAdminDashboard
);

/**
 * @swagger
 * /gyms/{gymId}/analytics/trainer-dashboard/{trainerId}:
 *   get:
 *     summary: Trainer dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: trainerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trainer dashboard with KPIs, today's schedule, assigned members, missed workouts, unassigned plans, and member progress
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         kpis:
 *                           type: object
 *                           properties:
 *                             assignedMembers: { type: integer }
 *                             todaySessionsCompleted: { type: integer }
 *                             todaySessionsUpcoming: { type: integer }
 *                             pendingAssignments: { type: integer }
 */
gymRouter.get(
  '/trainer-dashboard/:trainerId',
  authorize('trainer', 'gym_admin', 'super_admin'),
  analyticsController.getTrainerDashboard
);

/**
 * @swagger
 * /gyms/{gymId}/analytics/staff-dashboard:
 *   get:
 *     summary: Staff dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Staff dashboard with KPIs, alerts, recent check-ins, available classes, pending payments, and activity feed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         kpis:
 *                           type: object
 *                           properties:
 *                             todayCheckIns: { type: integer }
 *                             newMembersToday: { type: integer }
 *                             activeMembersPresent: { type: integer }
 *                             pendingPaymentsCount: { type: integer }
 */
gymRouter.get(
  '/staff-dashboard',
  authorize('staff', 'gym_admin', 'super_admin'),
  analyticsController.getStaffDashboard
);

/**
 * @swagger
 * /gyms/{gymId}/analytics/revenue:
 *   get:
 *     summary: Revenue analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (ISO string). Defaults to 3 months ago.
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (ISO string). Defaults to today.
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, month]
 *           default: month
 *     responses:
 *       200:
 *         description: Revenue summary and chart data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalRevenue: { type: number }
 *                             avgMonthlyRevenue: { type: number }
 *                             growth: { type: number }
 *                         chart:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               label: { type: string }
 *                               revenue: { type: number }
 */
gymRouter.get('/revenue', authorize('gym_admin'), analyticsController.getRevenueAnalytics);

/**
 * @swagger
 * /gyms/{gymId}/analytics/members:
 *   get:
 *     summary: Member analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Member analytics including totals, churn rate, attendance by day, and membership distribution
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalMembers: { type: integer }
 *                         activeMembers: { type: integer }
 *                         newMembersThisMonth: { type: integer }
 *                         churnRate: { type: number }
 *                         attendanceByDay:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               day: { type: string }
 *                               count: { type: integer }
 *                         membershipDistribution:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               planName: { type: string }
 *                               count: { type: integer }
 */
gymRouter.get('/members', authorize('gym_admin'), analyticsController.getMemberAnalytics);

// Backward-compatible alias
gymRouter.get('/dashboard', authorize('gym_admin'), analyticsController.getGymAdminDashboard);

// ─── Super admin platform analytics (/api/v1/analytics) ──────────────────────
const platformRouter = Router();

platformRouter.use(authenticate);

/**
 * @swagger
 * /analytics/super-admin/dashboard:
 *   get:
 *     summary: Super admin dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform-wide KPIs, expiring gym subscriptions, failed payments, high-churn gyms, rapid growth gyms, recent activity, revenue by gym, monthly revenue, payment stats, AI insights, and system stats
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         kpis:
 *                           type: object
 *                           properties:
 *                             totalGyms: { type: integer }
 *                             activeGyms: { type: integer }
 *                             totalMembers: { type: integer }
 *                             mrr: { type: number }
 *                             churnRate: { type: number }
 *                             aiUsageCount: { type: integer }
 */
platformRouter.get(
  '/super-admin/dashboard',
  authorize('super_admin'),
  analyticsController.getSuperAdminDashboard
);
// Backward-compatible alias
platformRouter.get(
  '/platform',
  authorize('super_admin'),
  analyticsController.getPlatformAnalytics
);

// ─── Member personal progress (/api/v1/me/analytics) ─────────────────────────
const meRouter = Router();

meRouter.use(authenticate);

/**
 * @swagger
 * /me/analytics/dashboard:
 *   get:
 *     summary: Member dashboard
 *     tags: [Me]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member dashboard with KPIs, active subscription, recent attendance, workout plan, diet plan, upcoming classes, and notifications
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         kpis:
 *                           type: object
 *                           properties:
 *                             checkInsThisMonth: { type: integer }
 *                             checkInsLast30Days: { type: integer }
 *                             daysUntilExpiry: { type: integer, nullable: true }
 *                             hasActiveSubscription: { type: boolean }
 *                             upcomingClassesCount: { type: integer }
 *                             unreadNotifications: { type: integer }
 */
meRouter.get('/dashboard', analyticsController.getMemberDashboard);

/**
 * @swagger
 * /me/analytics/progress:
 *   get:
 *     summary: Member personal progress analytics
 *     tags: [Me]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Body metrics trend, workout plans, attendance breakdown, and subscription history
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
meRouter.get('/progress', analyticsController.getMyProgressAnalytics);

export {
  gymRouter as gymAnalyticsRoutes,
  platformRouter as platformAnalyticsRoutes,
  meRouter as meAnalyticsRoutes,
};
