import mongoose from 'mongoose';
import { Request } from 'express';
import { User } from '../user/user.model';
import { ApiError } from '../../utils/apiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/pagination';
import { CreateTrainerInput, UpdateTrainerInput } from './trainer.validation';

const createGymUser = async (
  gymId: string,
  role: 'trainer' | 'staff',
  data: { firstName: string; lastName: string; email: string; password: string; phone?: string },
  actorId: mongoose.Types.ObjectId
) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw ApiError.conflict('Email is already registered');

  const user = await User.create({
    ...data,
    role,
    gymId: new mongoose.Types.ObjectId(gymId),
    createdBy: actorId,
    updatedBy: actorId,
  });

  const result = user.toObject() as unknown as Record<string, unknown>;
  delete result.password;
  return result;
};

const getGymUsers = async (gymId: string, role: 'trainer' | 'staff', req: Request) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const filter: Record<string, unknown> = {
    gymId: new mongoose.Types.ObjectId(gymId),
    role,
  };

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  if (req.query.search) {
    const s = req.query.search as string;
    filter.$or = [
      { firstName: { $regex: s, $options: 'i' } },
      { lastName: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).select('-password -refreshToken').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, meta: buildPaginationMeta(total, { page, limit, skip }) };
};

const updateGymUser = async (
  gymId: string,
  userId: string,
  role: 'trainer' | 'staff',
  data: UpdateTrainerInput,
  actorId: mongoose.Types.ObjectId
) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, gymId: new mongoose.Types.ObjectId(gymId), role },
    { ...data, updatedBy: actorId },
    { new: true, runValidators: true }
  ).select('-password -refreshToken');

  if (!user) throw ApiError.notFound(`${role.charAt(0).toUpperCase() + role.slice(1)} not found`);
  return user;
};

const deactivateGymUser = async (
  gymId: string,
  userId: string,
  role: 'trainer' | 'staff',
  actorId: mongoose.Types.ObjectId
) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, gymId: new mongoose.Types.ObjectId(gymId), role },
    { isActive: false, updatedBy: actorId }
  );
  if (!user) throw ApiError.notFound(`${role.charAt(0).toUpperCase() + role.slice(1)} not found`);
};

const getGymUserById = async (gymId: string, userId: string, role: 'trainer' | 'staff') => {
  const user = await User.findOne({
    _id: userId,
    gymId: new mongoose.Types.ObjectId(gymId),
    role,
  }).select('-password -refreshToken');
  if (!user) throw ApiError.notFound(`${role.charAt(0).toUpperCase() + role.slice(1)} not found`);
  return user;
};

// ─── Trainer specific exports ─────────────────────────────────────────────────

export const createTrainer = (
  gymId: string,
  data: CreateTrainerInput,
  actorId: mongoose.Types.ObjectId
) => createGymUser(gymId, 'trainer', data, actorId);

export const getTrainers = (gymId: string, req: Request) =>
  getGymUsers(gymId, 'trainer', req);

export const getTrainerById = (gymId: string, trainerId: string) =>
  getGymUserById(gymId, trainerId, 'trainer');

export const updateTrainer = (
  gymId: string,
  trainerId: string,
  data: UpdateTrainerInput,
  actorId: mongoose.Types.ObjectId
) => updateGymUser(gymId, trainerId, 'trainer', data, actorId);

export const deactivateTrainer = (
  gymId: string,
  trainerId: string,
  actorId: mongoose.Types.ObjectId
) => deactivateGymUser(gymId, trainerId, 'trainer', actorId);

// ─── Staff specific exports ───────────────────────────────────────────────────

export const createStaff = (
  gymId: string,
  data: CreateTrainerInput,
  actorId: mongoose.Types.ObjectId
) => createGymUser(gymId, 'staff', data, actorId);

export const getStaff = (gymId: string, req: Request) =>
  getGymUsers(gymId, 'staff', req);

export const getStaffById = (gymId: string, staffId: string) =>
  getGymUserById(gymId, staffId, 'staff');

export const updateStaff = (
  gymId: string,
  staffId: string,
  data: UpdateTrainerInput,
  actorId: mongoose.Types.ObjectId
) => updateGymUser(gymId, staffId, 'staff', data, actorId);

export const deactivateStaff = (
  gymId: string,
  staffId: string,
  actorId: mongoose.Types.ObjectId
) => deactivateGymUser(gymId, staffId, 'staff', actorId);
