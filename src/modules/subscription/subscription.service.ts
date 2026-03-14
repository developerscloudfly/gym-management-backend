import mongoose from 'mongoose';
import { Request } from 'express';
import { SubscriptionPlan } from './subscriptionPlan.model';
import { MemberSubscription } from './memberSubscription.model';
import { ApiError } from '../../utils/apiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/pagination';
import {
  CreatePlanInput,
  UpdatePlanInput,
  AssignSubscriptionInput,
  CancelSubscriptionInput,
} from './subscription.validation';

// ─── Subscription Plans ───────────────────────────────────────────────────────

export const createPlan = async (
  gymId: string,
  data: CreatePlanInput,
  actorId: mongoose.Types.ObjectId
) => {
  return SubscriptionPlan.create({
    ...data,
    gymId: new mongoose.Types.ObjectId(gymId),
    createdBy: actorId,
    updatedBy: actorId,
  });
};

export const getPlans = async (gymId: string, req: Request) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const filter: Record<string, unknown> = { gymId: new mongoose.Types.ObjectId(gymId) };

  // Members only see active plans; admins can see all
  if (req.user?.role === 'member') filter.isActive = true;

  const [plans, total] = await Promise.all([
    SubscriptionPlan.find(filter).sort({ price: 1 }).skip(skip).limit(limit),
    SubscriptionPlan.countDocuments(filter),
  ]);

  return { plans, meta: buildPaginationMeta(total, { page, limit, skip }) };
};

export const updatePlan = async (
  gymId: string,
  planId: string,
  data: UpdatePlanInput,
  actorId: mongoose.Types.ObjectId
) => {
  const plan = await SubscriptionPlan.findOneAndUpdate(
    { _id: planId, gymId: new mongoose.Types.ObjectId(gymId) },
    { ...data, updatedBy: actorId },
    { new: true, runValidators: true }
  );
  if (!plan) throw ApiError.notFound('Plan not found');
  return plan;
};

export const deactivatePlan = async (
  gymId: string,
  planId: string,
  actorId: mongoose.Types.ObjectId
) => {
  const plan = await SubscriptionPlan.findOneAndUpdate(
    { _id: planId, gymId: new mongoose.Types.ObjectId(gymId) },
    { isActive: false, updatedBy: actorId }
  );
  if (!plan) throw ApiError.notFound('Plan not found');
};

// ─── Member Subscriptions ─────────────────────────────────────────────────────

export const assignSubscription = async (
  gymId: string,
  data: AssignSubscriptionInput,
  actorId: mongoose.Types.ObjectId
) => {
  const gymObjectId = new mongoose.Types.ObjectId(gymId);

  const plan = await SubscriptionPlan.findOne({
    _id: data.planId,
    gymId: gymObjectId,
    isActive: true,
  });
  if (!plan) throw ApiError.notFound('Subscription plan not found or inactive');

  // Cancel any currently active subscription for this member
  await MemberSubscription.updateMany(
    { memberId: data.memberId, gymId: gymObjectId, status: 'active' },
    { status: 'cancelled', cancelledAt: new Date(), updatedBy: actorId }
  );

  const startDate = new Date(data.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.durationInDays);

  return MemberSubscription.create({
    memberId: new mongoose.Types.ObjectId(data.memberId),
    gymId: gymObjectId,
    planId: plan._id,
    startDate,
    endDate,
    autoRenew: data.autoRenew,
    status: 'active',
    createdBy: actorId,
    updatedBy: actorId,
  });
};

export const getMemberSubscriptions = async (gymId: string, memberId: string, req: Request) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const filter: Record<string, unknown> = {
    gymId: new mongoose.Types.ObjectId(gymId),
    memberId: new mongoose.Types.ObjectId(memberId),
  };

  const [subscriptions, total] = await Promise.all([
    MemberSubscription.find(filter)
      .populate('planId', 'name durationInDays price currency')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    MemberSubscription.countDocuments(filter),
  ]);

  return { subscriptions, meta: buildPaginationMeta(total, { page, limit, skip }) };
};

export const getActiveSubscription = async (gymId: string, memberId: string) => {
  return MemberSubscription.findOne({
    gymId: new mongoose.Types.ObjectId(gymId),
    memberId: new mongoose.Types.ObjectId(memberId),
    status: 'active',
  }).populate('planId', 'name durationInDays price currency features');
};

export const cancelSubscription = async (
  subscriptionId: string,
  data: CancelSubscriptionInput,
  actorId: mongoose.Types.ObjectId
) => {
  const sub = await MemberSubscription.findByIdAndUpdate(
    subscriptionId,
    {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: data.cancelReason,
      updatedBy: actorId,
    },
    { new: true }
  );
  if (!sub) throw ApiError.notFound('Subscription not found');
  return sub;
};
