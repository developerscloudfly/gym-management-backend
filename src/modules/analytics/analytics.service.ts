import { Types } from 'mongoose';
import { User } from '../user/user.model';
import { Gym } from '../gym/gym.model';
import { MemberSubscription } from '../subscription/memberSubscription.model';
import { Payment } from '../payment/payment.model';
import { Attendance } from '../attendance/attendance.model';
import { MemberProfile } from '../member/memberProfile.model';
import { WorkoutPlan } from '../workout/workout.model';

// ─── Super Admin: Platform Analytics ────────────────────────────────────────

export const getPlatformAnalytics = async () => {
  const [
    totalGyms,
    activeGyms,
    totalMembers,
    activeMembers,
    totalTrainers,
    recentPayments,
  ] = await Promise.all([
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

  // MRR: completed payments in current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const mrrData = await Payment.aggregate([
    { $match: { status: 'completed', paidAt: { $gte: startOfMonth } } },
    { $group: { _id: null, mrr: { $sum: '$amount' } } },
  ]);
  const mrr = (mrrData[0]?.mrr as number) ?? 0;

  // Gym growth: last 6 months
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

// ─── Gym Admin: Dashboard Analytics ─────────────────────────────────────────

export const getGymDashboard = async (gymId: string) => {
  const gymObjId = new Types.ObjectId(gymId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [
    totalMembers,
    activeMembers,
    newMembersThisMonth,
    newMembersLastMonth,
    activeSubscriptions,
    expiringSubscriptions,
    revenueThisMonth,
    revenueLastMonth,
    attendanceThisMonth,
    attendanceLastMonth,
  ] = await Promise.all([
    User.countDocuments({ gymId: gymObjId, role: 'member' }),
    User.countDocuments({ gymId: gymObjId, role: 'member', isActive: true }),
    User.countDocuments({ gymId: gymObjId, role: 'member', createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ gymId: gymObjId, role: 'member', createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
    MemberSubscription.countDocuments({ gymId: gymObjId, status: 'active' }),
    MemberSubscription.countDocuments({
      gymId: gymObjId,
      status: 'active',
      endDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    }),
    Payment.aggregate([
      { $match: { gymId: gymObjId, status: 'completed', paidAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { gymId: gymObjId, status: 'completed', paidAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Attendance.countDocuments({ gymId: gymObjId, checkInTime: { $gte: thirtyDaysAgo }, isActive: true }),
    Attendance.countDocuments({ gymId: gymObjId, checkInTime: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, isActive: true }),
  ]);

  const revThisMonth = (revenueThisMonth[0]?.total as number) ?? 0;
  const revLastMonth = (revenueLastMonth[0]?.total as number) ?? 0;

  const memberGrowthPct = newMembersLastMonth > 0
    ? Math.round(((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100)
    : 0;
  const revenueGrowthPct = revLastMonth > 0
    ? Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100)
    : 0;
  const attendanceGrowthPct = attendanceLastMonth > 0
    ? Math.round(((attendanceThisMonth - attendanceLastMonth) / attendanceLastMonth) * 100)
    : 0;

  return {
    members: { total: totalMembers, active: activeMembers, newThisMonth: newMembersThisMonth, growthPct: memberGrowthPct },
    subscriptions: { active: activeSubscriptions, expiringSoon: expiringSubscriptions },
    revenue: { thisMonth: revThisMonth, lastMonth: revLastMonth, growthPct: revenueGrowthPct },
    attendance: { thisMonth: attendanceThisMonth, lastMonth: attendanceLastMonth, growthPct: attendanceGrowthPct },
  };
};

// ─── Gym Admin: Revenue Breakdown ───────────────────────────────────────────

export const getRevenueAnalytics = async (gymId: string, months: number = 6) => {
  const gymObjId = new Types.ObjectId(gymId);
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [monthlyRevenue, revenueByMethod, topPlans] = await Promise.all([
    Payment.aggregate([
      { $match: { gymId: gymObjId, status: 'completed', paidAt: { $gte: since } } },
      {
        $group: {
          _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Payment.aggregate([
      { $match: { gymId: gymObjId, status: 'completed', paidAt: { $gte: since } } },
      { $group: { _id: '$method', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
    ]),
    MemberSubscription.aggregate([
      { $match: { gymId: gymObjId } },
      { $group: { _id: '$planId', subscriberCount: { $sum: 1 } } },
      { $sort: { subscriberCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'subscriptionplans', localField: '_id', foreignField: '_id', as: 'plan' } },
      { $unwind: '$plan' },
      { $project: { planName: '$plan.name', planPrice: '$plan.price', subscriberCount: 1 } },
    ]),
  ]);

  return { monthlyRevenue, revenueByMethod, topPlans };
};

// ─── Gym Admin: Member Analytics ────────────────────────────────────────────

export const getMemberAnalytics = async (gymId: string) => {
  const gymObjId = new Types.ObjectId(gymId);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [membersByGoal, membersByExperience, retentionData, memberGrowth] = await Promise.all([
    MemberProfile.aggregate([
      { $match: { gymId: gymObjId } },
      { $group: { _id: '$fitnessGoal', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    MemberProfile.aggregate([
      { $match: { gymId: gymObjId } },
      { $group: { _id: '$experienceLevel', count: { $sum: 1 } } },
    ]),
    // Active vs churned: members who visited in last 30 days vs all active subscribers
    Attendance.aggregate([
      {
        $match: {
          gymId: gymObjId,
          checkInTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          isActive: true,
        },
      },
      { $group: { _id: '$memberId' } },
      { $count: 'activeVisitors' },
    ]),
    // Member registrations over last 6 months
    User.aggregate([
      { $match: { gymId: gymObjId, role: 'member', createdAt: { $gte: ninetyDaysAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  const totalActiveSubscriptions = await MemberSubscription.countDocuments({ gymId: gymObjId, status: 'active' });
  const activeVisitors = (retentionData[0]?.activeVisitors as number) ?? 0;
  const retentionRate = totalActiveSubscriptions > 0
    ? Math.round((activeVisitors / totalActiveSubscriptions) * 100)
    : 0;

  return { membersByGoal, membersByExperience, retentionRate, activeVisitors, memberGrowth };
};

// ─── Member: Personal Progress Analytics ────────────────────────────────────

export const getMemberProgressAnalytics = async (memberId: string, gymId: string) => {
  const memberObjId = new Types.ObjectId(memberId);
  const gymObjId = new Types.ObjectId(gymId);

  const [profile, workoutPlans, attendanceLast90Days, subscriptionHistory] = await Promise.all([
    MemberProfile.findOne({ userId: memberObjId, gymId: gymObjId }),
    WorkoutPlan.find({ memberId: memberObjId, gymId: gymObjId }).sort({ createdAt: -1 }).limit(10).select('title status createdAt isAiGenerated'),
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
          _id: {
            week: { $isoWeek: '$checkInTime' },
            year: { $isoWeekYear: '$checkInTime' },
          },
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
  const weightTrend = bodyMetrics.map((m) => ({ date: m.date, weightKg: m.weightKg, bmi: m.bmi, bodyFatPct: m.bodyFatPct }));

  const totalVisits = attendanceLast90Days.reduce((sum, w) => sum + (w.visits as number), 0);
  const avgVisitsPerWeek = attendanceLast90Days.length > 0
    ? Math.round((totalVisits / 13) * 10) / 10
    : 0;

  return {
    bodyMetrics: weightTrend,
    workoutPlans,
    attendance: { weeklyBreakdown: attendanceLast90Days, totalLast90Days: totalVisits, avgVisitsPerWeek },
    subscriptionHistory,
  };
};
