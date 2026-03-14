import { Router } from 'express';
import * as gymController from './gym.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createGymSchema, updateGymSchema } from './gym.validation';

const router = Router();

router.use(authenticate);

router.post('/', authorize('super_admin'), validate(createGymSchema), gymController.createGym);
router.get('/', authorize('super_admin'), gymController.getAllGyms);
router.get('/:id', authorize('super_admin', 'gym_admin'), gymController.getGymById);
router.put('/:id', authorize('super_admin', 'gym_admin'), validate(updateGymSchema), gymController.updateGym);
router.delete('/:id', authorize('super_admin'), gymController.deactivateGym);

export default router;
