import { Router } from 'express';
import * as dietController from './diet.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createDietPlanSchema, updateDietPlanSchema, assignDietPlanSchema } from './diet.validation';

const router = Router({ mergeParams: true });

router.use(authenticate, belongsToGym);

router
  .route('/')
  .post(authorize('trainer', 'gym_admin'), validate(createDietPlanSchema), dietController.createDietPlan)
  .get(authorize('trainer', 'gym_admin'), dietController.getDietPlans);

router
  .route('/:id')
  .get(dietController.getDietPlanById)
  .put(authorize('trainer', 'gym_admin'), validate(updateDietPlanSchema), dietController.updateDietPlan)
  .delete(authorize('trainer', 'gym_admin'), dietController.deleteDietPlan);

router.post(
  '/:id/assign',
  authorize('trainer', 'gym_admin'),
  validate(assignDietPlanSchema),
  dietController.assignDietPlan
);

export default router;
