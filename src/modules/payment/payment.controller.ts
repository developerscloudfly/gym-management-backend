import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { p } from '../../utils/param';
import * as paymentService from './payment.service';

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const userId = req.user!._id.toString();
  const payment = await paymentService.recordManualPayment(gymId, req.body, userId);
  sendResponse({ res, statusCode: 201, message: 'Payment recorded successfully', data: payment });
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const memberId = req.user!._id.toString();
  const result = await paymentService.createRazorpayOrder(gymId, memberId, req.body, memberId);
  sendResponse({ res, statusCode: 201, message: 'Order created', data: result });
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const userId = req.user!._id.toString();
  const payment = await paymentService.verifyRazorpayPayment(gymId, req.body, userId);
  sendResponse({ res, statusCode: 200, message: 'Payment verified successfully', data: payment });
});

export const razorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = JSON.stringify(req.body);
  await paymentService.handleRazorpayWebhook(rawBody, signature);
  res.status(200).json({ received: true });
});

export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const opts = getPaginationOptions(req);
  const filters = {
    status: req.query.status as string | undefined,
    memberId: req.query.memberId as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  };
  const { payments, meta } = await paymentService.getPayments(gymId, opts, filters);
  sendResponse({ res, statusCode: 200, message: 'Payments retrieved', data: payments, meta });
});

export const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const gymId = p(req.params.gymId);
  const paymentId = p(req.params.paymentId);
  const payment = await paymentService.getPaymentById(gymId, paymentId);
  sendResponse({ res, statusCode: 200, message: 'Payment retrieved', data: payment });
});
