import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Types } from 'mongoose';
import { Payment } from './payment.model';
import { MemberSubscription } from '../subscription/memberSubscription.model';
import { ApiError } from '../../utils/apiError';
import { env } from '../../config/env';
import { PaginationOptions, buildPaginationMeta } from '../../utils/pagination';
import { RecordPaymentInput, CreateOrderInput, VerifyPaymentInput } from './payment.validation';
import { sendPaymentReceiptEmail } from '../../services/email.service';
import { createNotification } from '../notification/notification.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateInvoiceNumber = (): string => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${ts}-${rand}`;
};

const getRazorpayInstance = (): Razorpay => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw ApiError.internal('Razorpay credentials not configured');
  }
  return new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
};

// ─── Service Functions ────────────────────────────────────────────────────────

export const recordManualPayment = async (
  gymId: string,
  data: RecordPaymentInput,
  userId: string
) => {
  const payment = await Payment.create({
    gymId: new Types.ObjectId(gymId),
    memberId: new Types.ObjectId(data.memberId),
    subscriptionId: data.subscriptionId ? new Types.ObjectId(data.subscriptionId) : undefined,
    amount: data.amount,
    currency: data.currency ?? 'INR',
    method: data.method,
    status: 'completed',
    invoiceNumber: generateInvoiceNumber(),
    notes: data.notes,
    paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
    createdBy: new Types.ObjectId(userId),
    updatedBy: new Types.ObjectId(userId),
  });

  // Notify member
  await createNotification({
    userId: new Types.ObjectId(data.memberId),
    gymId: new Types.ObjectId(gymId),
    title: 'Payment Recorded',
    body: `Your payment of ${data.currency ?? 'INR'} ${data.amount} has been recorded. Invoice: ${payment.invoiceNumber}`,
    type: 'payment',
  });

  return payment;
};

export const createRazorpayOrder = async (
  gymId: string,
  memberId: string,
  data: CreateOrderInput,
  userId: string
) => {
  const subscription = await MemberSubscription.findOne({
    _id: new Types.ObjectId(data.subscriptionId),
    gymId: new Types.ObjectId(gymId),
    memberId: new Types.ObjectId(memberId),
  }).populate('planId');

  if (!subscription) throw ApiError.notFound('Subscription not found');

  const plan = subscription.planId as unknown as { price: number; name: string };
  const amountInPaise = Math.round(plan.price * 100);

  const razorpay = getRazorpayInstance();
  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: data.currency ?? 'INR',
    receipt: generateInvoiceNumber(),
  });

  // Create a pending payment record
  const payment = await Payment.create({
    gymId: new Types.ObjectId(gymId),
    memberId: new Types.ObjectId(memberId),
    subscriptionId: new Types.ObjectId(data.subscriptionId),
    amount: plan.price,
    currency: data.currency ?? 'INR',
    method: 'razorpay',
    status: 'pending',
    razorpayOrderId: order.id,
    invoiceNumber: order.receipt as string,
    createdBy: new Types.ObjectId(userId),
    updatedBy: new Types.ObjectId(userId),
  });

  return { order, payment };
};

export const verifyRazorpayPayment = async (
  gymId: string,
  data: VerifyPaymentInput,
  userId: string
) => {
  if (!env.RAZORPAY_KEY_SECRET) throw ApiError.internal('Razorpay not configured');

  // Verify signature
  const body = `${data.razorpayOrderId}|${data.razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== data.razorpaySignature) {
    throw ApiError.badRequest('Invalid payment signature');
  }

  const payment = await Payment.findOne({
    gymId: new Types.ObjectId(gymId),
    razorpayOrderId: data.razorpayOrderId,
    status: 'pending',
  });

  if (!payment) throw ApiError.notFound('Payment record not found');

  payment.razorpayPaymentId = data.razorpayPaymentId;
  payment.razorpaySignature = data.razorpaySignature;
  payment.status = 'completed';
  payment.paidAt = new Date();
  payment.updatedBy = new Types.ObjectId(userId) as unknown as Types.ObjectId;
  await payment.save();

  // Send receipt email (fire-and-forget)
  sendPaymentReceiptEmail(payment).catch(() => undefined);

  // Notify member
  await createNotification({
    userId: payment.memberId,
    gymId: payment.gymId,
    title: 'Payment Successful',
    body: `Payment of ${payment.currency} ${payment.amount} confirmed. Invoice: ${payment.invoiceNumber}`,
    type: 'payment',
  });

  return payment;
};

export const handleRazorpayWebhook = async (
  rawBody: string,
  signature: string
) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return;

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) throw ApiError.badRequest('Invalid webhook signature');

  const event = JSON.parse(rawBody) as { event: string; payload: { payment: { entity: { order_id: string; status: string } } } };

  if (event.event === 'payment.failed') {
    const orderId = event.payload.payment.entity.order_id;
    await Payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      { status: 'failed' }
    );
  }
};

export const getPayments = async (
  gymId: string,
  opts: PaginationOptions,
  filters: { status?: string; memberId?: string; from?: string; to?: string }
) => {
  const query: Record<string, unknown> = { gymId: new Types.ObjectId(gymId), isActive: true };

  if (filters.status) query.status = filters.status;
  if (filters.memberId) query.memberId = new Types.ObjectId(filters.memberId);
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = new Date(filters.from);
    if (filters.to) range.$lte = new Date(filters.to);
    query.paidAt = range;
  }

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate('memberId', 'name email')
      .populate('subscriptionId')
      .sort({ createdAt: -1 })
      .skip(opts.skip)
      .limit(opts.limit),
    Payment.countDocuments(query),
  ]);

  return { payments, meta: buildPaginationMeta(total, opts) };
};

export const getPaymentById = async (gymId: string, paymentId: string) => {
  const payment = await Payment.findOne({
    _id: new Types.ObjectId(paymentId),
    gymId: new Types.ObjectId(gymId),
    isActive: true,
  })
    .populate('memberId', 'name email')
    .populate('subscriptionId');

  if (!payment) throw ApiError.notFound('Payment not found');
  return payment;
};
