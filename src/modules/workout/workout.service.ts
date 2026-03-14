import mongoose from 'mongoose';
import { Request } from 'express';
import { WorkoutPlan } from './workout.model';
import { ApiError } from '../../utils/apiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/pagination';
import {
  CreateWorkoutPlanInput,
  UpdateWorkoutPlanInput,
  AssignWorkoutPlanInput,
} from './workout.validation';

export const createWorkoutPlan = async (
  gymId: string,
  data: CreateWorkoutPlanInput,
  actorId: mongoose.Types.ObjectId
) => {
  return WorkoutPlan.create({
    ...data,
    gymId: new mongoose.Types.ObjectId(gymId),
    trainerId: actorId,
    memberId: data.memberId ? new mongoose.Types.ObjectId(data.memberId) : undefined,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    createdBy: actorId,
    updatedBy: actorId,
  });
};

export const getWorkoutPlans = async (gymId: string, req: Request) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const filter: Record<string, unknown> = { gymId: new mongoose.Types.ObjectId(gymId) };

  if (req.query.memberId) filter.memberId = new mongoose.Types.ObjectId(req.query.memberId as string);
  if (req.query.isTemplate !== undefined) filter.isTemplate = req.query.isTemplate === 'true';
  if (req.query.status) filter.status = req.query.status;

  const [plans, total] = await Promise.all([
    WorkoutPlan.find(filter)
      .populate('trainerId', 'firstName lastName')
      .populate('memberId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WorkoutPlan.countDocuments(filter),
  ]);

  return { plans, meta: buildPaginationMeta(total, { page, limit, skip }) };
};

export const getWorkoutPlanById = async (gymId: string, planId: string) => {
  const plan = await WorkoutPlan.findOne({
    _id: planId,
    gymId: new mongoose.Types.ObjectId(gymId),
  })
    .populate('trainerId', 'firstName lastName')
    .populate('memberId', 'firstName lastName');

  if (!plan) throw ApiError.notFound('Workout plan not found');
  return plan;
};

export const getMyWorkoutPlans = async (memberId: string, gymId: string) => {
  return WorkoutPlan.find({
    memberId: new mongoose.Types.ObjectId(memberId),
    gymId: new mongoose.Types.ObjectId(gymId),
    status: 'active',
  })
    .populate('trainerId', 'firstName lastName')
    .sort({ createdAt: -1 });
};

export const updateWorkoutPlan = async (
  gymId: string,
  planId: string,
  data: UpdateWorkoutPlanInput,
  actorId: mongoose.Types.ObjectId
) => {
  const update: Record<string, unknown> = { ...data, updatedBy: actorId };
  if (data.memberId) update.memberId = new mongoose.Types.ObjectId(data.memberId);
  if (data.startDate) update.startDate = new Date(data.startDate);

  const plan = await WorkoutPlan.findOneAndUpdate(
    { _id: planId, gymId: new mongoose.Types.ObjectId(gymId) },
    update,
    { new: true, runValidators: true }
  );

  if (!plan) throw ApiError.notFound('Workout plan not found');
  return plan;
};

export const assignWorkoutPlan = async (
  gymId: string,
  planId: string,
  data: AssignWorkoutPlanInput,
  actorId: mongoose.Types.ObjectId
) => {
  // Mark previous active plan as archived for this member
  await WorkoutPlan.updateMany(
    {
      gymId: new mongoose.Types.ObjectId(gymId),
      memberId: new mongoose.Types.ObjectId(data.memberId),
      status: 'active',
    },
    { status: 'archived', updatedBy: actorId }
  );

  const plan = await WorkoutPlan.findOneAndUpdate(
    { _id: planId, gymId: new mongoose.Types.ObjectId(gymId) },
    {
      memberId: new mongoose.Types.ObjectId(data.memberId),
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      status: 'active',
      updatedBy: actorId,
    },
    { new: true }
  );

  if (!plan) throw ApiError.notFound('Workout plan not found');
  return plan;
};

export const deleteWorkoutPlan = async (
  gymId: string,
  planId: string,
  actorId: mongoose.Types.ObjectId
) => {
  const plan = await WorkoutPlan.findOneAndUpdate(
    { _id: planId, gymId: new mongoose.Types.ObjectId(gymId) },
    { status: 'archived', updatedBy: actorId }
  );
  if (!plan) throw ApiError.notFound('Workout plan not found');
};
