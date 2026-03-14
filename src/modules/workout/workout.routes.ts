import { Router } from 'express';
import * as workoutController from './workout.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  assignWorkoutPlanSchema,
} from './workout.validation';

const router = Router({ mergeParams: true });

router.use(authenticate, belongsToGym);

router
  .route('/')
  .post(authorize('trainer', 'gym_admin'), validate(createWorkoutPlanSchema), workoutController.createWorkoutPlan)
  .get(authorize('trainer', 'gym_admin'), workoutController.getWorkoutPlans);

router
  .route('/:id')
  .get(workoutController.getWorkoutPlanById)
  .put(authorize('trainer', 'gym_admin'), validate(updateWorkoutPlanSchema), workoutController.updateWorkoutPlan)
  .delete(authorize('trainer', 'gym_admin'), workoutController.deleteWorkoutPlan);

router.post(
  '/:id/assign',
  authorize('trainer', 'gym_admin'),
  validate(assignWorkoutPlanSchema),
  workoutController.assignWorkoutPlan
);

export default router;
