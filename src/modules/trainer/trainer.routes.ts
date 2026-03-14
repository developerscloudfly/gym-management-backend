import { Router } from 'express';
import * as trainerController from './trainer.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createTrainerSchema, updateTrainerSchema } from './trainer.validation';

const router = Router({ mergeParams: true });

router.use(authenticate, belongsToGym, authorize('gym_admin'));

// Trainer routes
router
  .route('/trainers')
  .post(validate(createTrainerSchema), trainerController.createTrainer)
  .get(trainerController.getTrainers);

router
  .route('/trainers/:id')
  .put(validate(updateTrainerSchema), trainerController.updateTrainer)
  .delete(trainerController.deactivateTrainer);

// Staff routes
router
  .route('/staff')
  .post(validate(createTrainerSchema), trainerController.createStaff)
  .get(trainerController.getStaff);

router
  .route('/staff/:id')
  .put(validate(updateTrainerSchema), trainerController.updateStaff)
  .delete(trainerController.deactivateStaff);

export default router;
