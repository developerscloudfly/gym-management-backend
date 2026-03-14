import mongoose from 'mongoose';
import { Request } from 'express';
import { User } from '../user/user.model';
import { MemberProfile } from './memberProfile.model';
import { ApiError } from '../../utils/apiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/pagination';
import {
  CreateMemberInput,
  UpdateMemberInput,
  UpdateMemberProfileInput,
  AddBodyMetricInput,
} from './member.validation';

export const createMember = async (
  gymId: string,
  data: CreateMemberInput,
  actorId: mongoose.Types.ObjectId
) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw ApiError.conflict('Email is already registered');

  const gymObjectId = new mongoose.Types.ObjectId(gymId);

  const user = await User.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: data.password,
    phone: data.phone,
    role: 'member',
    gymId: gymObjectId,
    createdBy: actorId,
    updatedBy: actorId,
  });

  // Create the associated profile
  await MemberProfile.create({
    userId: user._id,
    gymId: gymObjectId,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    gender: data.gender,
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    fitnessGoal: data.fitnessGoal,
    experienceLevel: data.experienceLevel,
    createdBy: actorId,
    updatedBy: actorId,
  });

  const result = user.toObject() as unknown as Record<string, unknown>;
  delete result.password;
  return result;
};

export const getMembers = async (gymId: string, req: Request) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const filter: Record<string, unknown> = {
    gymId: new mongoose.Types.ObjectId(gymId),
    role: 'member',
  };

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  if (req.query.search) {
    const search = req.query.search as string;
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [members, total] = await Promise.all([
    User.find(filter).select('-password -refreshToken').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { members, meta: buildPaginationMeta(total, { page, limit, skip }) };
};

export const getMemberById = async (gymId: string, memberId: string) => {
  const member = await User.findOne({
    _id: memberId,
    gymId: new mongoose.Types.ObjectId(gymId),
    role: 'member',
  }).select('-password -refreshToken');

  if (!member) throw ApiError.notFound('Member not found');

  const profile = await MemberProfile.findOne({ userId: memberId });

  return { member, profile };
};

export const updateMember = async (
  gymId: string,
  memberId: string,
  data: UpdateMemberInput,
  actorId: mongoose.Types.ObjectId
) => {
  const member = await User.findOneAndUpdate(
    { _id: memberId, gymId: new mongoose.Types.ObjectId(gymId), role: 'member' },
    { ...data, updatedBy: actorId },
    { new: true, runValidators: true }
  ).select('-password -refreshToken');

  if (!member) throw ApiError.notFound('Member not found');
  return member;
};

export const deactivateMember = async (
  gymId: string,
  memberId: string,
  actorId: mongoose.Types.ObjectId
) => {
  const member = await User.findOneAndUpdate(
    { _id: memberId, gymId: new mongoose.Types.ObjectId(gymId), role: 'member' },
    { isActive: false, updatedBy: actorId }
  );

  if (!member) throw ApiError.notFound('Member not found');
};

export const getMemberProfile = async (userId: string) => {
  const profile = await MemberProfile.findOne({ userId }).populate(
    'userId',
    'firstName lastName email phone avatar'
  );
  if (!profile) throw ApiError.notFound('Profile not found');
  return profile;
};

export const updateMemberProfile = async (
  userId: string,
  data: UpdateMemberProfileInput,
  actorId: mongoose.Types.ObjectId
) => {
  const update: Record<string, unknown> = { updatedBy: actorId };

  if (data.dateOfBirth) update.dateOfBirth = new Date(data.dateOfBirth);
  if (data.gender) update.gender = data.gender;
  if (data.heightCm !== undefined) update.heightCm = data.heightCm;
  if (data.weightKg !== undefined) update.weightKg = data.weightKg;
  if (data.fitnessGoal) update.fitnessGoal = data.fitnessGoal;
  if (data.experienceLevel) update.experienceLevel = data.experienceLevel;
  if (data.dietaryPreference) update.dietaryPreference = data.dietaryPreference;
  if (data.medicalConditions) update.medicalConditions = data.medicalConditions;
  if (data.injuries) update.injuries = data.injuries;
  if (data.emergencyContact) update.emergencyContact = data.emergencyContact;

  const profile = await MemberProfile.findOneAndUpdate({ userId }, update, {
    new: true,
    runValidators: true,
  });

  if (!profile) throw ApiError.notFound('Profile not found');
  return profile;
};

export const addBodyMetric = async (
  userId: string,
  data: AddBodyMetricInput,
  actorId: mongoose.Types.ObjectId
) => {
  const metric = {
    date: new Date(data.date),
    weightKg: data.weightKg,
    bodyFatPct: data.bodyFatPct,
    muscleMassKg: data.muscleMassKg,
    bmi: data.bmi,
    chest: data.chest,
    waist: data.waist,
    hips: data.hips,
    biceps: data.biceps,
    thighs: data.thighs,
    notes: data.notes,
  };

  const profile = await MemberProfile.findOneAndUpdate(
    { userId },
    {
      $push: { bodyMetricsHistory: { $each: [metric], $sort: { date: -1 } } },
      updatedBy: actorId,
    },
    { new: true }
  );

  if (!profile) throw ApiError.notFound('Profile not found');
  return profile;
};
