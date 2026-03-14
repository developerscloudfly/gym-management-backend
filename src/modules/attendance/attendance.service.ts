import { Types } from 'mongoose';
import { Attendance } from './attendance.model';
import { GymClass } from '../class/class.model';
import { ApiError } from '../../utils/apiError';
import { PaginationOptions, buildPaginationMeta } from '../../utils/pagination';
import { CheckInInput, MarkClassAttendanceInput } from './attendance.validation';

export const checkIn = async (gymId: string, data: CheckInInput, userId: string) => {
  if (data.type === 'class') {
    if (!data.classId) throw ApiError.badRequest('classId is required for class attendance');

    const gymClass = await GymClass.findOne({
      _id: new Types.ObjectId(data.classId),
      gymId: new Types.ObjectId(gymId),
      isActive: true,
    });
    if (!gymClass) throw ApiError.notFound('Class not found');
  }

  const attendance = await Attendance.create({
    gymId: new Types.ObjectId(gymId),
    memberId: new Types.ObjectId(data.memberId),
    type: data.type,
    classId: data.classId ? new Types.ObjectId(data.classId) : undefined,
    checkInTime: data.checkInTime ? new Date(data.checkInTime) : new Date(),
    status: data.status ?? 'present',
    notes: data.notes,
    markedBy: new Types.ObjectId(userId),
    createdBy: new Types.ObjectId(userId),
    updatedBy: new Types.ObjectId(userId),
  });

  return attendance;
};

export const checkOut = async (
  gymId: string,
  attendanceId: string,
  checkOutTime: string | undefined,
  userId: string
) => {
  const attendance = await Attendance.findOne({
    _id: new Types.ObjectId(attendanceId),
    gymId: new Types.ObjectId(gymId),
    isActive: true,
  });

  if (!attendance) throw ApiError.notFound('Attendance record not found');
  if (attendance.checkOutTime) throw ApiError.badRequest('Already checked out');

  attendance.checkOutTime = checkOutTime ? new Date(checkOutTime) : new Date();
  attendance.updatedBy = new Types.ObjectId(userId) as unknown as Types.ObjectId;
  await attendance.save();
  return attendance;
};

export const markClassAttendance = async (
  gymId: string,
  classId: string,
  data: MarkClassAttendanceInput,
  userId: string
) => {
  const gymClass = await GymClass.findOne({
    _id: new Types.ObjectId(classId),
    gymId: new Types.ObjectId(gymId),
    isActive: true,
  });
  if (!gymClass) throw ApiError.notFound('Class not found');

  const docs = data.attendances.map((a) => ({
    gymId: new Types.ObjectId(gymId),
    memberId: new Types.ObjectId(a.memberId),
    type: 'class' as const,
    classId: new Types.ObjectId(classId),
    checkInTime: new Date(),
    status: a.status,
    notes: a.notes,
    markedBy: new Types.ObjectId(userId),
    createdBy: new Types.ObjectId(userId),
    updatedBy: new Types.ObjectId(userId),
  }));

  const records = await Attendance.insertMany(docs);
  return records;
};

export const getMemberAttendance = async (
  gymId: string,
  memberId: string,
  opts: PaginationOptions,
  filters: { type?: string; from?: string; to?: string }
) => {
  const query: Record<string, unknown> = {
    gymId: new Types.ObjectId(gymId),
    memberId: new Types.ObjectId(memberId),
    isActive: true,
  };

  if (filters.type) query.type = filters.type;

  if (filters.from || filters.to) {
    const dateRange: Record<string, Date> = {};
    if (filters.from) dateRange.$gte = new Date(filters.from);
    if (filters.to) dateRange.$lte = new Date(filters.to);
    query.checkInTime = dateRange;
  }

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .populate('classId', 'name startTime')
      .sort({ checkInTime: -1 })
      .skip(opts.skip)
      .limit(opts.limit),
    Attendance.countDocuments(query),
  ]);

  return { records, meta: buildPaginationMeta(total, opts) };
};

export const getGymAttendance = async (
  gymId: string,
  opts: PaginationOptions,
  filters: { type?: string; memberId?: string; classId?: string; from?: string; to?: string }
) => {
  const query: Record<string, unknown> = {
    gymId: new Types.ObjectId(gymId),
    isActive: true,
  };

  if (filters.type) query.type = filters.type;
  if (filters.memberId) query.memberId = new Types.ObjectId(filters.memberId);
  if (filters.classId) query.classId = new Types.ObjectId(filters.classId);

  if (filters.from || filters.to) {
    const dateRange: Record<string, Date> = {};
    if (filters.from) dateRange.$gte = new Date(filters.from);
    if (filters.to) dateRange.$lte = new Date(filters.to);
    query.checkInTime = dateRange;
  }

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .populate('memberId', 'name email')
      .populate('classId', 'name startTime')
      .sort({ checkInTime: -1 })
      .skip(opts.skip)
      .limit(opts.limit),
    Attendance.countDocuments(query),
  ]);

  return { records, meta: buildPaginationMeta(total, opts) };
};

export const getAttendanceSummary = async (gymId: string, memberId: string) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [total, last30Days, byType] = await Promise.all([
    Attendance.countDocuments({ gymId: new Types.ObjectId(gymId), memberId: new Types.ObjectId(memberId), isActive: true }),
    Attendance.countDocuments({
      gymId: new Types.ObjectId(gymId),
      memberId: new Types.ObjectId(memberId),
      checkInTime: { $gte: thirtyDaysAgo },
      isActive: true,
    }),
    Attendance.aggregate([
      {
        $match: {
          gymId: new Types.ObjectId(gymId),
          memberId: new Types.ObjectId(memberId),
          isActive: true,
        },
      },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
  ]);

  return { total, last30Days, byType };
};
