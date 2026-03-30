import { Types } from 'mongoose';
import { User } from '../user/user.model';
import { Gym } from '../gym/gym.model';
import { MemberSubscription } from '../subscription/memberSubscription.model';
import { Payment } from '../payment/payment.model';
import { Attendance } from '../attendance/attendance.model';
import { MemberProfile } from '../member/memberProfile.model';
import { WorkoutPlan } from '../workout/workout.model';
import { GymClass } from '../class/class.model';
import { DietPlan } from '../diet/diet.model';

const monthLabel = (year: number, month: number) => {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

// ─── Super Admin: Platform Analytics (legacy) ────────────────────────────────

export const getPlatformAnalytics = async () => {
  const [totalGyms, activeGyms, totalMembers, activeMembers, totalTrainers, recentPayments] =
    await Promise.all([
      Gym.countDocuments(),
      Gym.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'member' }),
      User.countDocuments({ role: 'member', isActive: true }),
      User.countDocuments({ role: 'trainer', isActive: true }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

  const totalRevenue = (recentPayments[0]?.totalRevenue as number) ?? 0;
  const totalPayments = (recentPayments[0]?.count as number) ?? 0;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const mrrData = await Payment.aggregate([
    { $match: { status: 'completed', paidAt: { $gte: startOfMonth } } },
    { $group: { _id: null, mrr: { $sum: '$amount' } } },
  ]);
  const mrr = (mrrData[0]?.mrr as number) ?? 0;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const gymGrowth = await Gym.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return {
    totals: { totalGyms, activeGyms, totalMembers, activeMembers, totalTrainers, totalRevenue, totalPayments, mrr },
    gymGrowth,
  };
};

// ─── Super Admin Dashboard ────────────────────────────────────────────────────

export const getSuperAdminDashboard = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalGyms,
    activeGyms,
    totalMembers,
    mrrData,
    recentGyms,
    recentPayments,
    failedPaymentData,
    monthlyRevenueData,
    paymentStatsData,
    expiringSoonSubs,
    highChurnData,
    rapidGrowthData,
    revenueByGymData,
    memberCountByGym,
  ] = await Promise.all([
    Gym.countDocuments(),
    Gym.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'member' }),
    Payment.aggregate([
      { $match: { status: 'completed', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, mrr: { $sum: '$amount' } } },
    ]),
    Gym.find({ createdAt: { $gte: thirtyDaysAgo } })
      .select('_id name createdAt')
      .sort({ createdAt: -1 })
      .limit(10),
    Payment.find({ status: 'completed' })
      .populate('gymId', 'name')
      .sort({ paidAt: -1 })
      .limit(10),
    Payment.aggregate([
      { $match: { status: 'failed' } },
      { $group: { _id: '$gymId', totalFailed: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalFailed: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'gyms', localField: '_id', foreignField: '_id', as: 'gym' } },
      { $unwind: '$gym' },
    ]),
    Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Payment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    MemberSubscription.aggregate([
      {
        $match: {
          status: 'active',
          endDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: '$gymId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'gyms', localField: '_id', foreignField: '_id', as: 'gym' } },
      { $unwind: '$gym' },
    ]),
    MemberSubscription.aggregate([
      {
        $match: {
          status: { $in: ['expired', 'cancelled'] },
          endDate: { $gte: thirtyDaysAgo },
        },
      },
      { $group: { _id: '$gymId', churned: { $sum: 1 } } },
      { $sort: { churned: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'gyms', localField: '_id', foreignField: '_id', as: 'gym' } },
      { $unwind: '$gym' },
    ]),
    User.aggregate([
      { $match: { role: 'member', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$gymId', newMembers: { $sum: 1 } } },
      { $sort: { newMembers: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'gyms', localField: '_id', foreignField: '_id', as: 'gym' } },
      { $unwind: '$gym' },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: '$gymId', revenue: { $sum: '$amount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'gyms', localField: '_id', foreignField: '_id', as: 'gym' } },
      { $unwind: '$gym' },
    ]),
    User.aggregate([
      { $match: { role: 'member', isActive: true } },
      { $group: { _id: '$gymId', memberCount: { $sum: 1 } } },
    ]),
  ]);

  const mrr = (mrrData[0]?.mrr as number) ?? 0;
  const memberCountMap = new Map(memberCountByGym.map((g) => [g._id.toString(), g.memberCount as number]));

  // Churn rate across platform
  const [expiredLastMonth, activeLastMonth] = await Promise.all([
    MemberSubscription.countDocuments({
      status: { $in: ['expired', 'cancelled'] },
      endDate: { $gte: startOfLastMonth, $lt: startOfMonth },
    }),
    MemberSubscription.countDocuments({
      status: 'active',
      startDate: { $lt: startOfMonth },
      endDate: { $gte: startOfLastMonth },
    }),
  ]);
  const churnRate = activeLastMonth > 0
    ? Math.round((expiredLastMonth / activeLastMonth) * 1000) / 10
    : 0;

  // Payment stats
  const paymentStatMap: Record<string, number> = {};
  for (const s of paymentStatsData) {
    paymentStatMap[s._id as string] = s.count as number;
  }
  const successful = paymentStatMap['completed'] ?? 0;
  const failed = paymentStatMap['failed'] ?? 0;
  const pending = paymentStatMap['pending'] ?? 0;
  const total = successful + failed + pending;
  const successRate = total > 0 ? Math.round((successful / total) * 1000) / 10 : 0;

  // Recent activity
  const recentActivity = [
    ...recentGyms.map((g) => ({
      id: g._id.toString(),
      type: 'gym_registered' as const,
      description: `New gym '${g.name}' registered`,
      timestamp: g.createdAt,
      gymName: g.name,
      amount: null,
    })),
    ...recentPayments.slice(0, 5).map((p) => ({
      id: p._id.toString(),
      type: 'payment_received' as const,
      description: `Subscription payment received from ${(p.gymId as unknown as { name: string })?.name ?? 'Unknown'}`,
      timestamp: p.paidAt ?? (p as unknown as { createdAt: Date }).createdAt,
      gymName: (p.gymId as unknown as { name: string })?.name ?? 'Unknown',
      amount: p.amount,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return {
    kpis: {
      totalGyms,
      activeGyms,
      totalMembers,
      mrr,
      churnRate,
      aiUsageCount: 0,
    },
    expiringSubscriptions: expiringSoonSubs.map((s) => ({
      gymId: s._id.toString(),
      gymName: s.gym.name,
      label: `${s.count} member subscriptions expiring within 7 days`,
      severity: (s.count as number) > 10 ? 'high' : (s.count as number) > 5 ? 'medium' : 'low',
      value: (s.count as number).toString(),
    })),
    failedPayments: failedPaymentData.map((f) => ({
      gymId: f._id.toString(),
      gymName: f.gym.name,
      label: `₹${f.totalFailed} failed`,
      severity: 'high',
      value: (f.totalFailed as number).toString(),
    })),
    highChurnGyms: highChurnData.map((g) => {
      const mc = memberCountMap.get(g._id.toString()) ?? 1;
      const rate = Math.round(((g.churned as number) / mc) * 1000) / 10;
      return {
        gymId: g._id.toString(),
        gymName: g.gym.name,
        label: `${rate}% churn rate`,
        severity: rate > 10 ? 'high' : rate > 5 ? 'medium' : 'low',
        value: rate.toString(),
      };
    }),
    rapidGrowthGyms: rapidGrowthData.map((g) => ({
      gymId: g._id.toString(),
      gymName: g.gym.name,
      label: `+${g.newMembers} new members this month`,
      severity: 'low',
      value: (g.newMembers as number).toString(),
    })),
    recentActivity,
    revenueByGym: revenueByGymData.map((g) => ({
      gymId: g._id.toString(),
      gymName: g.gym.name,
      revenue: g.revenue as number,
      memberCount: memberCountMap.get(g._id.toString()) ?? 0,
      growth: 0,
    })),
    monthlyRevenue: monthlyRevenueData.map((m) => ({
      month: monthLabel(m._id.year as number, m._id.month as number),
      revenue: m.revenue as number,
      gyms: activeGyms,
    })),
    paymentStats: { successful, failed, pending, successRate },
    aiInsights: [],
    systemStats: {
      apiResponseTime: 0,
      activeUsers: 0,
      errorRate: 0,
      uptime: 99.9,
    },
  };
};

// ─── Gym Admin Dashboard ──────────────────────────────────────────────────────

export const getGymAdminDashboard = async (gymId: string) => {
  const gymObjId = new Types.ObjectId(gymId);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const MAX_TRAINER_CAPACITY = 15;

  const [
    activeMembers,
    todayCheckIns,
    dailyRevenueData,
    monthlyRevenueData,
    activeSubscriptions,
    classesToday,
    expiringMembershipData,
    failedPaymentData,
    todayCheckInRecords,
    todayPayments,
    weeklyRevenueData,
    pendingPaymentsData,
    trainerData,
    todayClassRecords,
    trainerSessionStats,
  ] = await Promise.all([
    User.countDocuments({ gymId: gymObjId, role: 'member', isActive: true }),
    Attendance.countDocuments({
      gymId: gymObjId,
      checkInTime: { $gte: startOfToday, $lt: endOfToday },
      isActive: true,
    }),
    Payment.aggregate([
      { $match: { gymId: gymObjId, status: 'completed', paidAt: { $gte: startOfToday, $lt: endOfToday } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { gymId: gymObjId, status: 'completed', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    MemberSubscription.countDocuments({ gymId: gymObjId, status: 'active' }),
    GymClass.countDocuments({
      gymId: gymObjId,
      startTime: { $gte: startOfToday, $lt: endOfToday },
      isActive: true,
    }),
    MemberSubscription.find({
      gymId: gymObjId,
      status: 'active',
      endDate: { $gte: now, $lte: sevenDaysLater },
    })
      .populate('memberId', 'firstName lastName email phone')
      .sort({ endDate: 1 })
      .limit(10),
    Payment.find({ gymId: gymObjId, status: 'failed' })
      .populate('memberId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(10),
    Attendance.find({
      gymId: gymObjId,
      checkInTime: { $gte: startOfToday, $lt: endOfToday },
      isActive: true,
    })
      .populate('memberId', 'firstName lastName')
      .sort({ checkInTime: -1 })
      .limit(20),
    Payment.find({ gymId: gymObjId, status: 'completed', paidAt: { $gte: startOfToday, $lt: endOfToday } })
      .populate('memberId', 'firstName lastName')
      .sort({ paidAt: -1 })
      .limit(10),
    Payment.aggregate([
      {
        $match: {
          gymId: gymObjId,
          status: 'completed',
          paidAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: { $dayOfWeek: '$paidAt' }, revenue: { $sum: '$amount' } } },
    ]),
    Payment.find({ gymId: gymObjId, status: { $in: ['pending', 'failed'] } })
      .populate('memberId', 'firstName lastName')
      .sort({ createdAt: 1 })
      .limit(10),
    User.find({ gymId: gymObjId, role: 'trainer', isActive: true }).select('_id firstName lastName'),
    GymClass.find({
      gymId: gymObjId,
      startTime: { $gte: startOfToday, $lt: endOfToday },
      isActive: true,
    })
      .populate('trainerId', 'firstName lastName')
      .sort({ startTime: 1 })
      .limit(20),
    GymClass.aggregate([
      { $match: { gymId: gymObjId, startTime: { $gte: startOfMonth }, isActive: true } },
      {
        $group: {
          _id: '$trainerId',
          sessionsCompleted: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  // Inactive members: active subscribers with no check-in in 14 days
  const activeSubMemberIds = await MemberSubscription.find({
    gymId: gymObjId,
    status: 'active',
  }).distinct('memberId');

  const recentCheckInIds = await Attendance.find({
    gymId: gymObjId,
    checkInTime: { $gte: fourteenDaysAgo },
    isActive: true,
  }).distinct('memberId');

  const recentSet = new Set(recentCheckInIds.map((id) => id.toString()));
  const inactiveMemberIds = activeSubMemberIds
    .filter((id) => !recentSet.has(id.toString()))
    .slice(0, 10);
  const inactiveMembers = await User.find({ _id: { $in: inactiveMemberIds } }).select('firstName lastName email phone');

  // Trainer workload
  const trainerWorkloadData = await WorkoutPlan.aggregate([
    { $match: { gymId: gymObjId, status: 'active', trainerId: { $ne: null } } },
    { $group: { _id: '$trainerId', memberCount: { $sum: 1 } } },
  ]);
  const trainerWorkloadMap = new Map(
    trainerWorkloadData.map((t) => [t._id.toString(), t.memberCount as number])
  );
  const trainerSessionMap = new Map(
    trainerSessionStats.map((t) => [t._id.toString(), t.sessionsCompleted as number])
  );

  // Weekly revenue (MongoDB dayOfWeek: 1=Sun, 2=Mon ... 7=Sat)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyRevenueMap = new Map(
    weeklyRevenueData.map((d) => [(d._id as number) - 1, d.revenue as number])
  );
  const weeklyRevenue = [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => ({
    day: dayNames[dayIdx],
    revenue: weeklyRevenueMap.get(dayIdx) ?? 0,
  }));

  // Today activity
  const todayActivity = [
    ...todayCheckInRecords.map((a) => {
      const m = a.memberId as unknown as { firstName: string; lastName: string };
      return {
        id: a._id.toString(),
        type: 'check_in' as const,
        description: `${m.firstName} ${m.lastName} checked in`,
        timestamp: a.checkInTime,
        memberName: `${m.firstName} ${m.lastName}`,
        amount: null,
      };
    }),
    ...todayPayments.map((p) => {
      const m = p.memberId as unknown as { firstName: string; lastName: string };
      return {
        id: p._id.toString(),
        type: 'payment_received' as const,
        description: `Monthly fee paid by ${m.firstName} ${m.lastName}`,
        timestamp: p.paidAt ?? (p as unknown as { createdAt: Date }).createdAt,
        memberName: `${m.firstName} ${m.lastName}`,
        amount: p.amount,
      };
    }),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  const initials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  return {
    kpis: {
      activeMembers,
      todayCheckIns,
      dailyRevenue: (dailyRevenueData[0]?.total as number) ?? 0,
      monthlyRevenue: (monthlyRevenueData[0]?.total as number) ?? 0,
      activeSubscriptions,
      classesToday,
    },
    expiringMemberships: expiringMembershipData.map((s) => {
      const m = s.memberId as unknown as {
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
        email: string;
      };
      const daysLeft = Math.ceil((s.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        memberId: m._id.toString(),
        memberName: `${m.firstName} ${m.lastName}`,
        email: m.email ?? '',
        detail: `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        daysLeft,
        avatarInitials: initials(m.firstName, m.lastName),
      };
    }),
    failedPayments: failedPaymentData.map((p) => {
      const m = p.memberId as unknown as {
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
        email: string;
      };
      return {
        memberId: m._id.toString(),
        memberName: `${m.firstName} ${m.lastName}`,
        email: m.email ?? '',
        detail: `₹${p.amount} payment failed`,
      };
    }),
    inactiveMembers: inactiveMembers.map((m) => ({
      memberId: m._id.toString(),
      memberName: `${m.firstName} ${m.lastName}`,
      email: (m as unknown as { email?: string }).email ?? '',
      detail: 'No check-in for 14+ days',
    })),
    overloadedTrainers: trainerData
      .filter((t) => (trainerWorkloadMap.get(t._id.toString()) ?? 0) > MAX_TRAINER_CAPACITY)
      .map((t) => {
        const count = trainerWorkloadMap.get(t._id.toString()) ?? 0;
        return {
          memberId: t._id.toString(),
          memberName: `${t.firstName} ${t.lastName}`,
          email: '',
          detail: `${count}/${MAX_TRAINER_CAPACITY} members (over capacity)`,
        };
      }),
    todayActivity: todayActivity.map((a) => ({
      _id: a.id,
      type: a.type,
      memberName: a.memberName,
      message: a.description,
      timestamp: a.timestamp,
    })),
    memberInsights: inactiveMembers.slice(0, 5).map((m) => ({
      memberId: m._id.toString(),
      memberName: `${m.firstName} ${m.lastName}`,
      type: 'churn_risk' as const,
      insight: 'No gym visit in 14+ days. High churn probability.',
      severity: 'high' as const,
      lastSeen: null,
    })),
    revenueStats: {
      today: (dailyRevenueData[0]?.total as number) ?? 0,
      pendingPayments: pendingPaymentsData.filter((p) => p.status === 'pending').length,
      failedTransactions: pendingPaymentsData.filter((p) => p.status === 'failed').length,
      weeklyRevenue,
      pendingList: pendingPaymentsData.map((p) => {
        const m = p.memberId as unknown as {
          _id: Types.ObjectId;
          firstName: string;
          lastName: string;
        };
        return {
          memberId: m._id.toString(),
          memberName: `${m.firstName} ${m.lastName}`,
          amount: p.amount,
          dueDate: (p as unknown as { createdAt: Date }).createdAt,
        };
      }),
    },
    todayClasses: todayClassRecords.map((c) => {
      const trainer = c.trainerId as unknown as { firstName: string; lastName: string } | null;
      let status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' = 'upcoming';
      if (c.status === 'cancelled') status = 'cancelled';
      else if (c.status === 'completed') status = 'completed';
      else if (c.startTime <= now && c.endTime >= now) status = 'ongoing';
      else if (c.endTime < now) status = 'completed';
      return {
        classId: c._id.toString(),
        name: c.name,
        trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown',
        startTime: c.startTime.toISOString(),
        endTime: c.endTime.toISOString(),
        enrolled: c.enrolledCount,
        capacity: c.capacity,
        status,
        location: c.location ?? null,
      };
    }),
    trainerStats: trainerData.map((t) => {
      const activeCount = trainerWorkloadMap.get(t._id.toString()) ?? 0;
      const sessions = trainerSessionMap.get(t._id.toString()) ?? 0;
      let workloadStatus: 'normal' | 'high' | 'overloaded' = 'normal';
      if (activeCount > MAX_TRAINER_CAPACITY) workloadStatus = 'overloaded';
      else if (activeCount > MAX_TRAINER_CAPACITY * 0.8) workloadStatus = 'high';
      return {
        trainerId: t._id.toString(),
        trainerName: `${t.firstName} ${t.lastName}`,
        sessionsCompleted: sessions,
        activeMembers: activeCount,
        rating: 0,
        avatarInitials: initials(t.firstName, t.lastName),
        workloadStatus,
      };
    }),
  };
};

// ─── Trainer Dashboard ────────────────────────────────────────────────────────

export const getTrainerDashboard = async (gymId: string, trainerId: string) => {
  const gymObjId = new Types.ObjectId(gymId);
  const trainerObjId = new Types.ObjectId(trainerId);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Members assigned to this trainer via active workout plans
  const assignedPlans = await WorkoutPlan.find({
    gymId: gymObjId,
    trainerId: trainerObjId,
    status: 'active',
    memberId: { $ne: null },
  }).select('memberId');

  const assignedMemberIds = [...new Set(assignedPlans.map((p) => p.memberId!.toString()))];
  const assignedMemberObjIds = assignedMemberIds.map((id) => new Types.ObjectId(id));

  const [
    todayClasses,
    allGymMembers,
    weekAttendance,
    lastCheckIns,
    attendanceCounts,
    assignedMemberDocs,
    memberProfiles,
    activeDietPlans,
  ] = await Promise.all([
    GymClass.find({
      gymId: gymObjId,
      trainerId: trainerObjId,
      startTime: { $gte: startOfToday, $lt: endOfToday },
      isActive: true,
    }).sort({ startTime: 1 }),
    User.find({ gymId: gymObjId, role: 'member', isActive: true }).select('_id firstName lastName'),
    Attendance.find({
      gymId: gymObjId,
      memberId: { $in: assignedMemberObjIds },
      checkInTime: { $gte: startOfWeek },
      isActive: true,
    }).select('memberId checkInTime'),
    Attendance.aggregate([
      { $match: { gymId: gymObjId, memberId: { $in: assignedMemberObjIds }, isActive: true } },
      { $sort: { checkInTime: -1 } },
      { $group: { _id: '$memberId', lastCheckIn: { $first: '$checkInTime' } } },
    ]),
    Attendance.aggregate([
      {
        $match: {
          gymId: gymObjId,
          memberId: { $in: assignedMemberObjIds },
          checkInTime: { $gte: thirtyDaysAgo },
          isActive: true,
        },
      },
      { $group: { _id: '$memberId', count: { $sum: 1 } } },
    ]),
    User.find({ _id: { $in: assignedMemberObjIds } }).select('_id firstName lastName'),
    MemberProfile.find({ userId: { $in: assignedMemberObjIds }, gymId: gymObjId }).select('userId fitnessGoal'),
    DietPlan.find({ memberId: { $in: assignedMemberObjIds }, gymId: gymObjId, status: 'active' }).select('memberId'),
  ]);

  const membersWithPlan = new Set(assignedMemberIds);
  const unassignedPlanMembers = allGymMembers
    .filter((m) => !membersWithPlan.has(m._id.toString()))
    .slice(0, 10);

  const memberCheckInSet = new Set(weekAttendance.map((a) => a.memberId.toString()));
  const missedWorkoutMemberIds = assignedMemberIds.filter((id) => !memberCheckInSet.has(id));
  const missedMemberDocs = await User.find({
    _id: { $in: missedWorkoutMemberIds.slice(0, 10) },
  }).select('firstName lastName');

  const lastCheckInMap = new Map(
    lastCheckIns.map((a) => [a._id.toString(), a.lastCheckIn as Date])
  );
  const attendanceCountMap = new Map(
    attendanceCounts.map((a) => [a._id.toString(), a.count as number])
  );

  const sessionsToday = todayClasses.length;
  const completedSessions = todayClasses.filter((c) => c.status === 'completed').length;

  const profileGoalMap = new Map(
    memberProfiles.map((p) => [
      (p.userId as Types.ObjectId).toString(),
      p.fitnessGoal as string | undefined,
    ])
  );
  const dietPlanMemberSet = new Set(
    activeDietPlans.map((d) => (d.memberId as Types.ObjectId).toString())
  );

  return {
    kpis: {
      assignedMembers: assignedMemberIds.length,
      sessionsToday,
      completedSessions,
      pendingAssignments: unassignedPlanMembers.length,
    },
    missedWorkouts: missedMemberDocs.map((m) => ({
      memberId: m._id.toString(),
      memberName: `${m.firstName} ${m.lastName}`,
      detail: 'Missed workouts this week',
    })),
    pendingSessions: todayClasses
      .filter((c) => c.status === 'scheduled' && c.startTime < now)
      .map((c) => ({
        memberId: c._id.toString(),
        memberName: c.name,
        detail: 'Session not started – overdue',
      })),
    unassignedPlans: unassignedPlanMembers.map((m) => ({
      memberId: m._id.toString(),
      memberName: `${m.firstName} ${m.lastName}`,
      detail: 'No workout plan assigned',
    })),
    todaySchedule: todayClasses.map((c) => {
      let status: 'completed' | 'upcoming' | 'ongoing' | 'missed' = 'upcoming';
      if (c.status === 'completed') status = 'completed';
      else if (c.status === 'ongoing') status = 'ongoing';
      return {
        sessionId: c._id.toString(),
        memberName: c.name,
        time: c.startTime.toISOString(),
        endTime: c.endTime.toISOString(),
        type: c.category ?? 'general',
        status,
        location: c.location ?? null,
      };
    }),
    myMembers: assignedMemberDocs.map((m) => {
      const lastIn = lastCheckInMap.get(m._id.toString());
      const visits30d = attendanceCountMap.get(m._id.toString()) ?? 0;
      const rate = Math.min(100, Math.round((visits30d / 20) * 100));
      return {
        memberId: m._id.toString(),
        memberName: `${m.firstName} ${m.lastName}`,
        progressStatus: (rate >= 80 ? 'excellent' : rate >= 50 ? 'on_track' : 'needs_attention') as
          | 'on_track'
          | 'needs_attention'
          | 'excellent',
        lastActivity: lastIn?.toISOString() ?? null,
        goal: profileGoalMap.get(m._id.toString()) ?? null,
        workoutPlanAssigned: true,
        dietPlanAssigned: dietPlanMemberSet.has(m._id.toString()),
        attendanceRate: rate / 100,
      };
    }),
    memberProgress: assignedMemberDocs.map((m) => {
      const visits30d = attendanceCountMap.get(m._id.toString()) ?? 0;
      return {
        memberId: m._id.toString(),
        memberName: `${m.firstName} ${m.lastName}`,
        weightChange: 0,
        strengthImprovement: 0,
        attendanceRate: Math.min(1, visits30d / 20),
        weeklyAttendance: [{ week: 'Last 30d', sessions: visits30d }],
      };
    }),
  };
};

// ─── Staff Dashboard ──────────────────────────────────────────────────────────

export const getStaffDashboard = async (gymId: string) => {
  const gymObjId = new Types.ObjectId(gymId);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    todayCheckIns,
    newMembersToday,
    activeMembersPresent,
    pendingPaymentsCount,
    recentCheckInRecords,
    upcomingClasses,
    pendingPayments,
    expiringMemberships,
    failedPayments,
    todayNewMemberDocs,
  ] = await Promise.all([
    Attendance.countDocuments({
      gymId: gymObjId,
      checkInTime: { $gte: startOfToday, $lt: endOfToday },
      isActive: true,
    }),
    User.countDocuments({
      gymId: gymObjId,
      role: 'member',
      createdAt: { $gte: startOfToday, $lt: endOfToday },
    }),
    Attendance.countDocuments({
      gymId: gymObjId,
      checkInTime: { $gte: startOfToday, $lt: endOfToday },
      checkOutTime: { $exists: false },
      isActive: true,
    }),
    Payment.countDocuments({ gymId: gymObjId, status: { $in: ['pending', 'failed'] } }),
    Attendance.find({
      gymId: gymObjId,
      checkInTime: { $gte: startOfToday, $lt: endOfToday },
      isActive: true,
    })
      .populate('memberId', 'firstName lastName')
      .sort({ checkInTime: -1 })
      .limit(20),
    GymClass.find({
      gymId: gymObjId,
      startTime: { $gte: now },
      status: { $in: ['scheduled', 'ongoing'] },
      isActive: true,
    })
      .populate('trainerId', 'firstName lastName')
      .sort({ startTime: 1 })
      .limit(10),
    Payment.find({ gymId: gymObjId, status: { $in: ['pending', 'failed'] } })
      .populate('memberId', 'firstName lastName')
      .sort({ createdAt: 1 })
      .limit(10),
    MemberSubscription.find({
      gymId: gymObjId,
      status: 'active',
      endDate: { $gte: now, $lte: sevenDaysLater },
    })
      .populate('memberId', 'firstName lastName')
      .sort({ endDate: 1 })
      .limit(5),
    Payment.find({ gymId: gymObjId, status: 'failed' })
      .populate('memberId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5),
    User.find({
      gymId: gymObjId,
      role: 'member',
      createdAt: { $gte: startOfToday, $lt: endOfToday },
    })
      .select('_id firstName lastName')
      .limit(5),
  ]);

  // Lookup subscriptions for recent check-in members (membershipStatus + planName)
  const checkInMemberIds = [
    ...new Set(
      recentCheckInRecords.map((a) => {
        const m = a.memberId as unknown as { _id: Types.ObjectId };
        return m._id.toString();
      })
    ),
  ].map((id) => new Types.ObjectId(id));

  const memberSubscriptionMap = new Map<
    string,
    { status: string; planName: string }
  >();
  if (checkInMemberIds.length > 0) {
    const subs = await MemberSubscription.find({
      memberId: { $in: checkInMemberIds },
      gymId: gymObjId,
    })
      .sort({ endDate: -1 })
      .populate('planId', 'name');

    for (const sub of subs) {
      const mId = (sub.memberId as Types.ObjectId).toString();
      if (!memberSubscriptionMap.has(mId)) {
        const plan = sub.planId as unknown as { name: string } | null;
        let membershipStatus: string = sub.status;
        const daysLeft = Math.ceil((sub.endDate.getTime() - now.getTime()) / 86400000);
        if (sub.status === 'active' && daysLeft <= 7) membershipStatus = 'expiring_soon';
        memberSubscriptionMap.set(mId, { status: membershipStatus, planName: plan?.name ?? '' });
      }
    }
  }

  // Lookup plan names for pending payments
  const pendingSubIds = pendingPayments
    .map((p) => p.subscriptionId)
    .filter(Boolean) as Types.ObjectId[];
  const pendingSubMap = new Map<string, string>();
  if (pendingSubIds.length > 0) {
    const pSubs = await MemberSubscription.find({ _id: { $in: pendingSubIds } }).populate(
      'planId',
      'name'
    );
    for (const sub of pSubs) {
      const plan = sub.planId as unknown as { name: string } | null;
      pendingSubMap.set(sub._id.toString(), plan?.name ?? '');
    }
  }

  const alerts = [
    ...expiringMemberships.map((s) => {
      const m = s.memberId as unknown as {
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
      };
      const daysLeft = Math.ceil((s.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        memberId: m._id.toString(),
        memberName: `${m.firstName} ${m.lastName}`,
        alertType: 'expired_membership' as const,
        detail: `Membership expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        daysOverdue: 0,
      };
    }),
    ...failedPayments.map((p) => {
      const m = p.memberId as unknown as {
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
      };
      const daysAgo = Math.floor(
        (now.getTime() - (p as unknown as { createdAt: Date }).createdAt.getTime()) / 86400000
      );
      return {
        memberId: m._id.toString(),
        memberName: `${m.firstName} ${m.lastName}`,
        alertType: 'payment_pending' as const,
        detail: `Overdue payment of ₹${p.amount}`,
        daysOverdue: daysAgo,
      };
    }),
  ];

  const activityFeed = [
    ...recentCheckInRecords.slice(0, 5).map((a) => {
      const m = a.memberId as unknown as { firstName: string; lastName: string };
      return {
        _id: a._id.toString(),
        type: 'check_in' as const,
        memberName: `${m.firstName} ${m.lastName}`,
        message: `${m.firstName} ${m.lastName} checked in`,
        timestamp: a.checkInTime,
      };
    }),
    ...todayNewMemberDocs.map((m) => ({
      _id: m._id.toString(),
      type: 'registration' as const,
      memberName: `${m.firstName} ${m.lastName}`,
      message: `${m.firstName} ${m.lastName} joined as new member`,
      timestamp: now,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return {
    kpis: {
      todayCheckIns,
      newMembersToday,
      activeMembersPresent,
      pendingPaymentsCount,
    },
    alerts,
    recentCheckIns: recentCheckInRecords.map((a) => {
      const m = a.memberId as unknown as {
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
      };
      const sub = memberSubscriptionMap.get(m._id.toString());
      return {
        memberId: m._id.toString(),
        memberName: `${m.firstName} ${m.lastName}`,
        membershipStatus: sub?.status ?? 'unknown',
        checkedInAt: a.checkInTime.toISOString(),
        planName: sub?.planName ?? '',
      };
    }),
    availableClasses: upcomingClasses.map((c) => {
      const trainer = c.trainerId as unknown as { firstName: string; lastName: string } | null;
      return {
        classId: c._id.toString(),
        name: c.name,
        trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown',
        time: c.startTime.toISOString(),
        availableSlots: c.capacity - c.enrolledCount,
        totalCapacity: c.capacity,
      };
    }),
    pendingPayments: pendingPayments.map((p) => {
      const m = p.memberId as unknown as {
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
      };
      return {
        paymentId: p._id.toString(),
        memberName: `${m.firstName} ${m.lastName}`,
        amount: p.amount,
        planName: p.subscriptionId ? (pendingSubMap.get(p.subscriptionId.toString()) ?? '') : '',
        dueDate: (p as unknown as { createdAt: Date }).createdAt,
        status: p.status === 'failed' ? ('overdue' as const) : ('pending' as const),
      };
    }),
    activityFeed,
  };
};

// ─── Revenue Analytics ────────────────────────────────────────────────────────

export const getRevenueAnalytics = async (
  gymId: string,
  from: Date,
  to: Date,
  groupBy: 'day' | 'month'
) => {
  const gymObjId = new Types.ObjectId(gymId);
  const periodDiff = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodDiff);

  const [currentRevData, prevRevData, chartData] = await Promise.all([
    Payment.aggregate([
      { $match: { gymId: gymObjId, status: 'completed', paidAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          gymId: gymObjId,
          status: 'completed',
          paidAt: { $gte: prevFrom, $lte: from },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { gymId: gymObjId, status: 'completed', paidAt: { $gte: from, $lte: to } } },
      {
        $group:
          groupBy === 'month'
            ? {
                _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
                revenue: { $sum: '$amount' },
              }
            : {
                _id: {
                  year: { $year: '$paidAt' },
                  month: { $month: '$paidAt' },
                  day: { $dayOfMonth: '$paidAt' },
                },
                revenue: { $sum: '$amount' },
              },
      },
      {
        $sort:
          groupBy === 'month'
            ? { '_id.year': 1, '_id.month': 1 }
            : { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]),
  ]);

  const totalRevenue = (currentRevData[0]?.total as number) ?? 0;
  const prevRevenue = (prevRevData[0]?.total as number) ?? 0;
  const monthsDiff = Math.max(1, Math.ceil(periodDiff / (30 * 24 * 60 * 60 * 1000)));
  const avgMonthlyRevenue = Math.round(totalRevenue / monthsDiff);
  const growth =
    prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10 : 0;

  const chart = chartData.map((d) => {
    let label: string;
    if (groupBy === 'month') {
      label = monthLabel(d._id.year as number, d._id.month as number);
    } else {
      label = `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`;
    }
    return { label, revenue: d.revenue as number };
  });

  return { summary: { totalRevenue, avgMonthlyRevenue, growth }, chart };
};

// ─── Member Analytics ─────────────────────────────────────────────────────────

export const getMemberAnalytics = async (gymId: string, from: Date, to: Date) => {
  const gymObjId = new Types.ObjectId(gymId);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    totalMembers,
    activeMembers,
    newMembersThisMonth,
    expiredInPeriod,
    activeInPeriod,
    attendanceByDayData,
    membershipDistributionData,
  ] = await Promise.all([
    User.countDocuments({ gymId: gymObjId, role: 'member' }),
    User.countDocuments({ gymId: gymObjId, role: 'member', isActive: true }),
    User.countDocuments({ gymId: gymObjId, role: 'member', createdAt: { $gte: startOfMonth } }),
    MemberSubscription.countDocuments({
      gymId: gymObjId,
      status: { $in: ['expired', 'cancelled'] },
      endDate: { $gte: from, $lte: to },
    }),
    MemberSubscription.countDocuments({
      gymId: gymObjId,
      startDate: { $lte: to },
      endDate: { $gte: from },
    }),
    Attendance.aggregate([
      { $match: { gymId: gymObjId, checkInTime: { $gte: from, $lte: to }, isActive: true } },
      { $group: { _id: { $dayOfWeek: '$checkInTime' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    MemberSubscription.aggregate([
      { $match: { gymId: gymObjId, status: 'active' } },
      { $group: { _id: '$planId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: '_id',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: '$plan' },
      { $project: { planName: '$plan.name', count: 1 } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const churnRate =
    activeInPeriod > 0 ? Math.round((expiredInPeriod / activeInPeriod) * 1000) / 10 : 0;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const attendanceByDay = dayNames.map((day, idx) => {
    const entry = attendanceByDayData.find((d) => (d._id as number) === idx + 1);
    return { day, count: (entry?.count as number) ?? 0 };
  });

  return {
    totalMembers,
    activeMembers,
    newMembersThisMonth,
    churnRate,
    attendanceByDay,
    membershipDistribution: membershipDistributionData.map((d) => ({
      planName: d.planName as string,
      count: d.count as number,
    })),
  };
};

// ─── Member Dashboard ─────────────────────────────────────────────────────────

export const getMemberDashboard = async (memberId: string, gymId: string) => {
  const memberObjId = new Types.ObjectId(memberId);
  const gymObjId = new Types.ObjectId(gymId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    activeSubscription,
    totalCheckIns,
    thisMonthCheckIns,
    allAttendanceDates,
    weeklyAttendanceData,
    upcomingClassesRaw,
    activeWorkoutPlan,
    activeDietPlan,
    recentPayments,
    recentAttendanceRaw,
  ] = await Promise.all([
    MemberSubscription.findOne({ memberId: memberObjId, gymId: gymObjId, status: 'active' })
      .populate('planId', 'name price')
      .sort({ startDate: -1 }),
    Attendance.countDocuments({ memberId: memberObjId, gymId: gymObjId, isActive: true }),
    Attendance.countDocuments({
      memberId: memberObjId,
      gymId: gymObjId,
      isActive: true,
      checkInTime: { $gte: startOfMonth },
    }),
    Attendance.find({ memberId: memberObjId, gymId: gymObjId, isActive: true })
      .select('checkInTime')
      .sort({ checkInTime: 1 }),
    Attendance.aggregate([
      {
        $match: {
          memberId: memberObjId,
          gymId: gymObjId,
          isActive: true,
          checkInTime: { $gte: thirtyDaysAgo },
        },
      },
      { $group: { _id: { $dayOfWeek: '$checkInTime' }, count: { $sum: 1 } } },
    ]),
    GymClass.find({
      gymId: gymObjId,
      enrolledMembers: memberObjId,
      startTime: { $gte: now },
      status: { $in: ['scheduled', 'ongoing'] },
    })
      .populate('trainerId', 'firstName lastName')
      .sort({ startTime: 1 })
      .limit(5),
    WorkoutPlan.findOne({ memberId: memberObjId, gymId: gymObjId, status: 'active' })
      .sort({ createdAt: -1 })
      .select('_id title status startDate'),
    DietPlan.findOne({ memberId: memberObjId, gymId: gymObjId, status: 'active' })
      .sort({ createdAt: -1 })
      .select('_id title status startDate'),
    Payment.find({ memberId: memberObjId, gymId: gymObjId, status: 'completed' })
      .sort({ paidAt: -1 })
      .limit(5)
      .select('_id amount paidAt'),
    Attendance.find({ memberId: memberObjId, gymId: gymObjId, isActive: true })
      .sort({ checkInTime: -1 })
      .limit(5)
      .select('_id checkInTime'),
  ]);

  // Streak calculation
  const dates = [
    ...new Set(allAttendanceDates.map((a) => a.checkInTime.toISOString().slice(0, 10))),
  ].sort();
  let streak = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  let prevDate: string | null = null;
  for (const date of dates) {
    if (prevDate === null) { streak = 1; }
    else {
      const diff = (new Date(date).getTime() - new Date(prevDate).getTime()) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
    }
    if (streak > longestStreak) longestStreak = streak;
    prevDate = date;
  }
  if (dates.length > 0) {
    const lastDate = dates[dates.length - 1];
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    currentStreak = lastDate === today || lastDate === yesterday ? streak : 0;
  }

  // Weekly attendance by day name
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyMap = new Map(weeklyAttendanceData.map((d) => [d._id as number, d.count as number]));
  const weeklyAttendance = dayNames.map((day, idx) => ({
    day,
    count: weeklyMap.get(idx + 1) ?? 0,
  }));

  // Subscription shape
  const plan = activeSubscription?.planId as unknown as { name: string } | null;
  const subscription = activeSubscription
    ? {
        planName: plan?.name ?? '',
        status: activeSubscription.status,
        startDate: activeSubscription.startDate.toISOString(),
        endDate: activeSubscription.endDate.toISOString(),
        daysLeft: Math.max(
          0,
          Math.ceil((activeSubscription.endDate.getTime() - now.getTime()) / 86400000)
        ),
        autoRenew: activeSubscription.autoRenew,
      }
    : null;

  // Upcoming classes shape
  const upcomingClasses = upcomingClassesRaw.map((c) => {
    const trainer = c.trainerId as unknown as { firstName: string; lastName: string } | null;
    return {
      classId: c._id.toString(),
      name: c.name,
      trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown',
      startTime: c.startTime.toISOString(),
      endTime: c.endTime.toISOString(),
      location: c.location ?? null,
      status: c.status,
    };
  });

  // Workout & diet plan shape
  const workoutPlan = activeWorkoutPlan
    ? {
        planId: activeWorkoutPlan._id.toString(),
        title: activeWorkoutPlan.title,
        status: activeWorkoutPlan.status,
        startDate:
          (activeWorkoutPlan as unknown as { startDate?: Date }).startDate?.toISOString() ?? null,
      }
    : null;

  const dietPlan = activeDietPlan
    ? {
        planId: activeDietPlan._id.toString(),
        title: activeDietPlan.title,
        status: activeDietPlan.status,
        startDate:
          (activeDietPlan as unknown as { startDate?: Date }).startDate?.toISOString() ?? null,
      }
    : null;

  // Recent activity
  const recentActivity = [
    ...recentAttendanceRaw.map((a) => ({
      _id: a._id.toString(),
      type: 'check_in' as const,
      message: 'You checked in at the gym',
      timestamp: a.checkInTime.toISOString(),
    })),
    ...recentPayments.map((p) => ({
      _id: p._id.toString(),
      type: 'payment' as const,
      message: `Payment of ₹${p.amount} completed`,
      timestamp: (p.paidAt ?? (p as unknown as { createdAt: Date }).createdAt).toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return {
    subscription,
    attendance: {
      totalCheckIns,
      thisMonthCheckIns,
      currentStreak,
      longestStreak,
      weeklyAttendance,
    },
    upcomingClasses,
    workoutPlan,
    dietPlan,
    recentActivity,
  };
};

// ─── Member Personal Progress Analytics ──────────────────────────────────────

export const getMemberProgressAnalytics = async (memberId: string, gymId: string) => {
  const memberObjId = new Types.ObjectId(memberId);
  const gymObjId = new Types.ObjectId(gymId);

  const [profile, workoutPlans, attendanceLast90Days, subscriptionHistory] = await Promise.all([
    MemberProfile.findOne({ userId: memberObjId, gymId: gymObjId }),
    WorkoutPlan.find({ memberId: memberObjId, gymId: gymObjId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title status createdAt isAiGenerated'),
    Attendance.aggregate([
      {
        $match: {
          memberId: memberObjId,
          gymId: gymObjId,
          checkInTime: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          isActive: true,
        },
      },
      {
        $group: {
          _id: { week: { $isoWeek: '$checkInTime' }, year: { $isoWeekYear: '$checkInTime' } },
          visits: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]),
    MemberSubscription.find({ memberId: memberObjId, gymId: gymObjId })
      .populate('planId', 'name price')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const bodyMetrics = profile?.bodyMetricsHistory ?? [];
  const weightTrend = bodyMetrics.map((m) => ({
    date: m.date,
    weightKg: m.weightKg,
    bmi: m.bmi,
    bodyFatPct: m.bodyFatPct,
  }));

  const totalVisits = attendanceLast90Days.reduce((sum, w) => sum + (w.visits as number), 0);
  const avgVisitsPerWeek =
    attendanceLast90Days.length > 0 ? Math.round((totalVisits / 13) * 10) / 10 : 0;

  return {
    bodyMetrics: weightTrend,
    workoutPlans,
    attendance: {
      weeklyBreakdown: attendanceLast90Days,
      totalLast90Days: totalVisits,
      avgVisitsPerWeek,
    },
    subscriptionHistory,
  };
};
