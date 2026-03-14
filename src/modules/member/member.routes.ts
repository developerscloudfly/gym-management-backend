import { Router } from 'express';
import * as memberController from './member.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createMemberSchema, updateMemberSchema } from './member.validation';

const router = Router({ mergeParams: true }); // mergeParams to access :gymId

router.use(authenticate);
router.use(belongsToGym);

// Gym-scoped member management (staff / admin)
router.post(
  '/',
  authorize('gym_admin', 'staff'),
  validate(createMemberSchema),
  memberController.createMember
);
router.get('/', authorize('gym_admin', 'staff', 'trainer'), memberController.getMembers);
router.get('/:id', authorize('gym_admin', 'staff', 'trainer'), memberController.getMemberById);
router.put(
  '/:id',
  authorize('gym_admin', 'staff'),
  validate(updateMemberSchema),
  memberController.updateMember
);
router.delete('/:id', authorize('gym_admin'), memberController.deactivateMember);

export default router;
