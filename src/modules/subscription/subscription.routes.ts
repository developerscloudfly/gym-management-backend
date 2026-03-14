import { Router } from 'express';
import * as subscriptionController from './subscription.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createPlanSchema,
  updatePlanSchema,
  assignSubscriptionSchema,
  cancelSubscriptionSchema,
} from './subscription.validation';

const router = Router({ mergeParams: true });

router.use(authenticate, belongsToGym);

// Plans (public to gym members, write restricted to admin)
router
  .route('/plans')
  .get(subscriptionController.getPlans)
  .post(authorize('gym_admin'), validate(createPlanSchema), subscriptionController.createPlan);

router
  .route('/plans/:planId')
  .put(authorize('gym_admin'), validate(updatePlanSchema), subscriptionController.updatePlan)
  .delete(authorize('gym_admin'), subscriptionController.deactivatePlan);

// Member subscriptions
router.post(
  '/subscriptions',
  authorize('gym_admin', 'staff'),
  validate(assignSubscriptionSchema),
  subscriptionController.assignSubscription
);

router.get(
  '/members/:memberId/subscriptions',
  authorize('gym_admin', 'staff'),
  subscriptionController.getMemberSubscriptions
);

router.put(
  '/subscriptions/:subscriptionId/cancel',
  authorize('gym_admin', 'staff'),
  validate(cancelSubscriptionSchema),
  subscriptionController.cancelSubscription
);

export default router;
