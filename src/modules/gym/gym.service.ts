import crypto from 'crypto';
import mongoose from 'mongoose';
import { Gym, IGym } from './gym.model';
import { User } from '../user/user.model';
import { ApiError } from '../../utils/apiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/pagination';
import { Request } from 'express';
import { CreateGymInput, UpdateGymInput } from './gym.validation';
import { sendGymAdminInviteEmail } from '../../services/email.service';

const generateTempPassword = (): string => {
  // 12-char password: random base64 + ensure it meets validation rules
  const random = crypto.randomBytes(6).toString('base64').slice(0, 10);
  return `T${random}1a`; // Guarantees uppercase (T), lowercase (a), number (1)
};

export const createGym = async (
  data: CreateGymInput,
  actorId: mongoose.Types.ObjectId
): Promise<{ gym: IGym; owner: InstanceType<typeof User> }> => {
  const { owner: ownerData, ...gymData } = data;

  // Check if admin email is already taken
  const existing = await User.findOne({ email: ownerData.email });
  if (existing) {
    throw ApiError.conflict('Owner email is already registered');
  }

  // Auto-generate temporary password
  const tempPassword = generateTempPassword();

  // Create gym admin user with temp password
  const owner = await User.create({
    firstName: ownerData.firstName,
    lastName: ownerData.lastName,
    email: ownerData.email,
    phone: ownerData.phone || undefined,
    password: tempPassword,
    role: 'gym_admin',
    mustChangePassword: true,
    createdBy: actorId,
    updatedBy: actorId,
  });

  // Create gym linked to the new admin
  const gym = await Gym.create({
    ...gymData,
    ownerId: owner._id,
    createdBy: actorId,
    updatedBy: actorId,
  });

  // Link admin back to the gym
  owner.gymId = gym._id as mongoose.Types.ObjectId;
  await owner.save();

  // Send invite email with credentials (fire-and-forget)
  sendGymAdminInviteEmail(
    owner.email,
    `${owner.firstName} ${owner.lastName}`,
    gymData.name,
    tempPassword
  ).catch(() => undefined);

  return { gym, owner };
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
