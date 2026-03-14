import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createClassSchema, updateClassSchema, enrollSchema } from './class.validation';
import * as classController from './class.controller';

const router = Router({ mergeParams: true });

router.use(authenticate, belongsToGym);

// All gym members can view classes
router.get('/', classController.getClasses);
router.get('/:classId', classController.getClassById);

// Enrollment — members self-enroll; admins can enroll others
router.post('/:classId/enroll', validate(enrollSchema), classController.enrollMember);
router.delete('/:classId/enroll', classController.unenrollMember);

// Class management — gym_admin and trainer
router.post(
  '/',
  authorize('gym_admin', 'trainer'),
  validate(createClassSchema),
  classController.createClass
);
router.patch(
  '/:classId',
  authorize('gym_admin', 'trainer'),
  validate(updateClassSchema),
  classController.updateClass
);
router.patch(
  '/:classId/cancel',
  authorize('gym_admin', 'trainer'),
  classController.cancelClass
);

export default router;
