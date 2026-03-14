import { Router } from 'express';
import * as memberController from './member.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { updateMemberProfileSchema, addBodyMetricSchema } from './member.validation';

const router = Router();

router.use(authenticate);
router.use(authorize('member'));

router.get('/profile', memberController.getMyProfile);
router.put('/profile', validate(updateMemberProfileSchema), memberController.updateMyProfile);
router.post('/body-metrics', validate(addBodyMetricSchema), memberController.addBodyMetric);

export default router;
