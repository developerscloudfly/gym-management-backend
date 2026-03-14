import { Types } from 'mongoose';
import { GymClass } from './class.model';
import { ApiError } from '../../utils/apiError';
import { PaginationOptions, buildPaginationMeta } from '../../utils/pagination';
import { CreateClassInput, UpdateClassInput } from './class.validation';

export const createClass = async (
  gymId: string,
  data: CreateClassInput,
  userId: string
) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (end <= start) {
    throw ApiError.badRequest('endTime must be after startTime');
  }

  const gymClass = await GymClass.create({
    gymId: new Types.ObjectId(gymId),
    trainerId: new Types.ObjectId(data.trainerId),
    name: data.name,
    description: data.description,
    category: data.category,
    startTime: start,
    endTime: end,
    capacity: data.capacity,
    location: data.location,
    recurrence: data.recurrence ?? 'none',
    createdBy: new Types.ObjectId(userId),
    updatedBy: new Types.ObjectId(userId),
  });

  return gymClass;
};

export const getClasses = async (
  gymId: string,
  opts: PaginationOptions,
  filters: { status?: string; trainerId?: string; category?: string }
) => {
  const query: Record<string, unknown> = { gymId: new Types.ObjectId(gymId), isActive: true };

  if (filters.status) query.status = filters.status;
  if (filters.trainerId) query.trainerId = new Types.ObjectId(filters.trainerId);
  if (filters.category) query.category = filters.category;

  const [classes, total] = await Promise.all([
    GymClass.find(query)
      .populate('trainerId', 'name email')
      .sort({ startTime: 1 })
      .skip(opts.skip)
      .limit(opts.limit),
    GymClass.countDocuments(query),
  ]);

  return { classes, meta: buildPaginationMeta(total, opts) };
};

export const getClassById = async (gymId: string, classId: string) => {
  const gymClass = await GymClass.findOne({
    _id: new Types.ObjectId(classId),
    gymId: new Types.ObjectId(gymId),
    isActive: true,
  }).populate('trainerId', 'name email').populate('enrolledMembers', 'name email');

  if (!gymClass) throw ApiError.notFound('Class not found');
  return gymClass;
};

export const updateClass = async (
  gymId: string,
  classId: string,
  data: UpdateClassInput,
  userId: string
) => {
  const gymClass = await GymClass.findOne({
    _id: new Types.ObjectId(classId),
    gymId: new Types.ObjectId(gymId),
    isActive: true,
  });

  if (!gymClass) throw ApiError.notFound('Class not found');

  if (gymClass.status === 'cancelled') {
    throw ApiError.badRequest('Cannot update a cancelled class');
  }

  const updates: Record<string, unknown> = { ...data, updatedBy: new Types.ObjectId(userId) };

  if (data.startTime) updates.startTime = new Date(data.startTime);
  if (data.endTime) updates.endTime = new Date(data.endTime);
  if (data.trainerId) updates.trainerId = new Types.ObjectId(data.trainerId);

  const start = updates.startTime instanceof Date ? updates.startTime : gymClass.startTime;
  const end = updates.endTime instanceof Date ? updates.endTime : gymClass.endTime;
  if (end <= start) throw ApiError.badRequest('endTime must be after startTime');

  Object.assign(gymClass, updates);
  await gymClass.save();
  return gymClass;
};

export const cancelClass = async (gymId: string, classId: string, userId: string) => {
  const gymClass = await GymClass.findOne({
    _id: new Types.ObjectId(classId),
    gymId: new Types.ObjectId(gymId),
    isActive: true,
  });

  if (!gymClass) throw ApiError.notFound('Class not found');
  if (gymClass.status === 'cancelled') throw ApiError.badRequest('Class is already cancelled');

  gymClass.status = 'cancelled';
  gymClass.updatedBy = new Types.ObjectId(userId) as unknown as Types.ObjectId;
  await gymClass.save();
  return gymClass;
};

export const enrollMember = async (
  gymId: string,
  classId: string,
  memberId: string,
  userId: string
) => {
  const gymClass = await GymClass.findOne({
    _id: new Types.ObjectId(classId),
    gymId: new Types.ObjectId(gymId),
    isActive: true,
  });

  if (!gymClass) throw ApiError.notFound('Class not found');
  if (gymClass.status !== 'scheduled') throw ApiError.badRequest('Class is not open for enrollment');
  if (gymClass.enrolledCount >= gymClass.capacity) throw ApiError.badRequest('Class is at full capacity');

  const memberObjId = new Types.ObjectId(memberId);
  const alreadyEnrolled = gymClass.enrolledMembers.some((id) => id.equals(memberObjId));
  if (alreadyEnrolled) throw ApiError.conflict('Member is already enrolled in this class');

  gymClass.enrolledMembers.push(memberObjId);
  gymClass.enrolledCount = gymClass.enrolledMembers.length;
  gymClass.updatedBy = new Types.ObjectId(userId) as unknown as Types.ObjectId;
  await gymClass.save();
  return gymClass;
};

export const unenrollMember = async (
  gymId: string,
  classId: string,
  memberId: string,
  userId: string
) => {
  const gymClass = await GymClass.findOne({
    _id: new Types.ObjectId(classId),
    gymId: new Types.ObjectId(gymId),
    isActive: true,
  });

  if (!gymClass) throw ApiError.notFound('Class not found');
  if (gymClass.status !== 'scheduled') throw ApiError.badRequest('Cannot unenroll from a non-scheduled class');

  const memberObjId = new Types.ObjectId(memberId);
  const idx = gymClass.enrolledMembers.findIndex((id) => id.equals(memberObjId));
  if (idx === -1) throw ApiError.badRequest('Member is not enrolled in this class');

  gymClass.enrolledMembers.splice(idx, 1);
  gymClass.enrolledCount = gymClass.enrolledMembers.length;
  gymClass.updatedBy = new Types.ObjectId(userId) as unknown as Types.ObjectId;
  await gymClass.save();
  return gymClass;
};
