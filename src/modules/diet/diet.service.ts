import mongoose from 'mongoose';
import { Request } from 'express';
import { DietPlan } from './diet.model';
import { ApiError } from '../../utils/apiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/pagination';
import { CreateDietPlanInput, UpdateDietPlanInput, AssignDietPlanInput } from './diet.validation';

export const createDietPlan = async (
  gymId: string,
  data: CreateDietPlanInput,
  actorId: mongoose.Types.ObjectId
) => {
  return DietPlan.create({
    ...data,
    gymId: new mongoose.Types.ObjectId(gymId),
    trainerId: actorId,
    memberId: data.memberId ? new mongoose.Types.ObjectId(data.memberId) : undefined,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    createdBy: actorId,
    updatedBy: actorId,
  });
};

export const getDietPlans = async (gymId: string, req: Request) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const filter: Record<string, unknown> = { gymId: new mongoose.Types.ObjectId(gymId) };

  if (req.query.memberId) filter.memberId = new mongoose.Types.ObjectId(req.query.memberId as string);
  if (req.query.isTemplate !== undefined) filter.isTemplate = req.query.isTemplate === 'true';
  if (req.query.status) filter.status = req.query.status;

  const [plans, total] = await Promise.all([
    DietPlan.find(filter)
      .populate('trainerId', 'firstName lastName')
      .populate('memberId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DietPlan.countDocuments(filter),
  ]);

  return { plans, meta: buildPaginationMeta(total, { page, limit, skip }) };
};

export const getDietPlanById = async (gymId: string, planId: string) => {
  const plan = await DietPlan.findOne({
    _id: planId,
    gymId: new mongoose.Types.ObjectId(gymId),
  })
    .populate('trainerId', 'firstName lastName')
    .populate('memberId', 'firstName lastName');

  if (!plan) throw ApiError.notFound('Diet plan not found');
  return plan;
};

export const getMyDietPlans = async (memberId: string, gymId: string) => {
  return DietPlan.find({
    memberId: new mongoose.Types.ObjectId(memberId),
    gymId: new mongoose.Types.ObjectId(gymId),
    status: 'active',
  })
    .populate('trainerId', 'firstName lastName')
    .sort({ createdAt: -1 });
};

export const updateDietPlan = async (
  gymId: string,
  planId: string,
  data: UpdateDietPlanInput,
  actorId: mongoose.Types.ObjectId
) => {
  const update: Record<string, unknown> = { ...data, updatedBy: actorId };
  if (data.memberId) update.memberId = new mongoose.Types.ObjectId(data.memberId);
  if (data.startDate) update.startDate = new Date(data.startDate);
  if (data.endDate) update.endDate = new Date(data.endDate);

  const plan = await DietPlan.findOneAndUpdate(
    { _id: planId, gymId: new mongoose.Types.ObjectId(gymId) },
    update,
    { new: true, runValidators: true }
  );

  if (!plan) throw ApiError.notFound('Diet plan not found');
  return plan;
};

export const assignDietPlan = async (
  gymId: string,
  planId: string,
  data: AssignDietPlanInput,
  actorId: mongoose.Types.ObjectId
) => {
  await DietPlan.updateMany(
    {
      gymId: new mongoose.Types.ObjectId(gymId),
      memberId: new mongoose.Types.ObjectId(data.memberId),
      status: 'active',
    },
    { status: 'archived', updatedBy: actorId }
  );

  const plan = await DietPlan.findOneAndUpdate(
    { _id: planId, gymId: new mongoose.Types.ObjectId(gymId) },
    {
      memberId: new mongoose.Types.ObjectId(data.memberId),
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      status: 'active',
      updatedBy: actorId,
    },
    { new: true }
  );

  if (!plan) throw ApiError.notFound('Diet plan not found');
  return plan;
};

export const deleteDietPlan = async (
  gymId: string,
  planId: string,
  actorId: mongoose.Types.ObjectId
) => {
  const plan = await DietPlan.findOneAndUpdate(
    { _id: planId, gymId: new mongoose.Types.ObjectId(gymId) },
    { status: 'archived', updatedBy: actorId }
  );
  if (!plan) throw ApiError.notFound('Diet plan not found');
};
