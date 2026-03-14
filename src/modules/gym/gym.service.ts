import mongoose from 'mongoose';
import { Gym, IGym } from './gym.model';
import { User } from '../user/user.model';
import { ApiError } from '../../utils/apiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/pagination';
import { Request } from 'express';
import { CreateGymInput, UpdateGymInput } from './gym.validation';

export const createGym = async (
  data: CreateGymInput,
  ownerId: mongoose.Types.ObjectId,
  actorId: mongoose.Types.ObjectId
): Promise<IGym> => {
  const gym = await Gym.create({
    ...data,
    ownerId,
    createdBy: actorId,
    updatedBy: actorId,
  });

  // Update the owner's gymId
  await User.findByIdAndUpdate(ownerId, {
    gymId: gym._id,
    updatedBy: actorId,
  });

  return gym;
};

export const getAllGyms = async (req: Request) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const filter: Record<string, unknown> = {};

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const [gyms, total] = await Promise.all([
    Gym.find(filter)
      .populate('ownerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Gym.countDocuments(filter),
  ]);

  return { gyms, meta: buildPaginationMeta(total, { page, limit, skip }) };
};

export const getGymById = async (gymId: string): Promise<IGym> => {
  const gym = await Gym.findById(gymId).populate('ownerId', 'firstName lastName email');
  if (!gym) throw ApiError.notFound('Gym not found');
  return gym;
};

export const updateGym = async (
  gymId: string,
  data: UpdateGymInput,
  actorId: mongoose.Types.ObjectId
): Promise<IGym> => {
  const gym = await Gym.findByIdAndUpdate(
    gymId,
    { ...data, updatedBy: actorId },
    { new: true, runValidators: true }
  );
  if (!gym) throw ApiError.notFound('Gym not found');
  return gym;
};

export const deactivateGym = async (
  gymId: string,
  actorId: mongoose.Types.ObjectId
): Promise<void> => {
  const gym = await Gym.findByIdAndUpdate(gymId, {
    isActive: false,
    updatedBy: actorId,
  });
  if (!gym) throw ApiError.notFound('Gym not found');

  // Deactivate all users belonging to this gym
  await User.updateMany(
    { gymId: new mongoose.Types.ObjectId(gymId) },
    { isActive: false, updatedBy: actorId }
  );
};
