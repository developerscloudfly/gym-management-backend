import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, belongsToGym } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  recordPaymentSchema,
  createOrderSchema,
  verifyPaymentSchema,
} from './payment.validation';
import * as paymentController from './payment.controller';

const router = Router({ mergeParams: true });

// Webhook — no auth, raw body needed (mounted separately in app.ts)
// router.post('/webhook', paymentController.razorpayWebhook); // see app.ts

router.use(authenticate, belongsToGym);

// Admin/staff record a manual payment
router.post(
  '/',
  authorize('gym_admin', 'staff'),
  validate(recordPaymentSchema),
  paymentController.recordPayment
);

// Admin lists all payments
router.get(
  '/',
  authorize('gym_admin', 'staff'),
  paymentController.getPayments
);

router.get(
  '/:paymentId',
  authorize('gym_admin', 'staff'),
  paymentController.getPaymentById
);

// Member initiates Razorpay online payment
router.post(
  '/create-order',
  authorize('member'),
  validate(createOrderSchema),
  paymentController.createOrder
);

// Member verifies Razorpay payment
router.post(
  '/verify',
  authorize('member'),
  validate(verifyPaymentSchema),
  paymentController.verifyPayment
);

export default router;
