import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import mongoose, { Types } from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/user/user.model';
import { Gym } from '../modules/gym/gym.model';
import { MemberProfile } from '../modules/member/memberProfile.model';
import { SubscriptionPlan } from '../modules/subscription/subscriptionPlan.model';
import { MemberSubscription } from '../modules/subscription/memberSubscription.model';
import { Payment } from '../modules/payment/payment.model';
import { Attendance } from '../modules/attendance/attendance.model';
import { GymClass } from '../modules/class/class.model';
import { WorkoutPlan } from '../modules/workout/workout.model';
import { Notification } from '../modules/notification/notification.model';

const SYSTEM_ID = new Types.ObjectId(env.SYSTEM_USER_ID);

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

let invoiceCounter = 9000;
const nextInvoice = () => `INV-VN-${String(invoiceCounter++).padStart(5, '0')}`;

// ─── Vishnu's Gym ──────────────────────────────────────────────────────────────

const VISHNU = {
  firstName: 'Vishnu',
  lastName: 'Nair',
  email: 'vishnu.cloudfly@gmail.com',
  phone: '+919876003003',
  password: 'GymAdmin@123',
};

const GYM_DEF = {
  name: 'CloudFly Fitness',
  description: 'Modern gym with AI-powered training and smart equipment',
  address: { street: '12 Tech Park Road', city: 'Bengaluru', state: 'Karnataka', zipCode: '560103', country: 'India' },
  phone: '+918022334455',
  email: 'info@cloudflyfitness.com',
  website: 'https://cloudflyfitness.com',
  settings: { currency: 'INR', timezone: 'Asia/Kolkata', workingHours: { open: '05:00', close: '23:30' } },
};

const TRAINERS = [
  { firstName: 'Abhishek', lastName: 'Rao', email: 'abhishek@cloudflyfitness.com', phone: '+919811001001' },
  { firstName: 'Meghna', lastName: 'Iyer', email: 'meghna@cloudflyfitness.com', phone: '+919811001002' },
  { firstName: 'Tarun', lastName: 'Pillai', email: 'tarun@cloudflyfitness.com', phone: '+919811001003' },
];

const STAFF = [
  { firstName: 'Sameer', lastName: 'Kulkarni', email: 'sameer@cloudflyfitness.com', phone: '+919812001001' },
  { firstName: 'Diya', lastName: 'Menon', email: 'diya@cloudflyfitness.com', phone: '+919812001002' },
];

const MEMBERS = [
  { firstName: 'Aryan', lastName: 'Krishnan', email: 'aryan.k@cfmember.com', phone: '+919900003001', dob: '1996-02-14', gender: 'male' as const, heightCm: 176, weightKg: 80, goal: 'muscle_gain' as const, exp: 'intermediate' as const },
  { firstName: 'Riya', lastName: 'Nambiar', email: 'riya.n@cfmember.com', phone: '+919900003002', dob: '1999-07-08', gender: 'female' as const, heightCm: 162, weightKg: 56, goal: 'weight_loss' as const, exp: 'beginner' as const },
  { firstName: 'Sagar', lastName: 'Bhat', email: 'sagar.b@cfmember.com', phone: '+919900003003', dob: '1993-11-20', gender: 'male' as const, heightCm: 181, weightKg: 87, goal: 'strength' as const, exp: 'advanced' as const },
  { firstName: 'Ishita', lastName: 'Shetty', email: 'ishita.s@cfmember.com', phone: '+919900003004', dob: '2001-04-03', gender: 'female' as const, heightCm: 160, weightKg: 53, goal: 'general_fitness' as const, exp: 'beginner' as const },
  { firstName: 'Kiran', lastName: 'Hegde', email: 'kiran.h@cfmember.com', phone: '+919900003005', dob: '1995-09-17', gender: 'male' as const, heightCm: 174, weightKg: 72, goal: 'endurance' as const, exp: 'intermediate' as const },
  { firstName: 'Pooja', lastName: 'Upadhyay', email: 'pooja.u@cfmember.com', phone: '+919900003006', dob: '1991-12-29', gender: 'female' as const, heightCm: 158, weightKg: 64, goal: 'weight_loss' as const, exp: 'beginner' as const },
  { firstName: 'Nitin', lastName: 'Kamath', email: 'nitin.k@cfmember.com', phone: '+919900003007', dob: '1994-06-11', gender: 'male' as const, heightCm: 179, weightKg: 84, goal: 'muscle_gain' as const, exp: 'advanced' as const },
  { firstName: 'Swati', lastName: 'Joshi', email: 'swati.j@cfmember.com', phone: '+919900003008', dob: '1997-03-25', gender: 'female' as const, heightCm: 164, weightKg: 59, goal: 'flexibility' as const, exp: 'beginner' as const },
  { firstName: 'Rahul', lastName: 'Nair', email: 'rahul.nair@cfmember.com', phone: '+919900003009', dob: '1990-08-05', gender: 'male' as const, heightCm: 172, weightKg: 77, goal: 'general_fitness' as const, exp: 'intermediate' as const },
  { firstName: 'Anushka', lastName: 'Pai', email: 'anushka.p@cfmember.com', phone: '+919900003010', dob: '1998-01-19', gender: 'female' as const, heightCm: 161, weightKg: 54, goal: 'endurance' as const, exp: 'beginner' as const },
  { firstName: 'Dev', lastName: 'Mallya', email: 'dev.m@cfmember.com', phone: '+919900003011', dob: '1992-10-07', gender: 'male' as const, heightCm: 175, weightKg: 78, goal: 'strength' as const, exp: 'intermediate' as const },
  { firstName: 'Preethi', lastName: 'Srinivas', email: 'preethi.s@cfmember.com', phone: '+919900003012', dob: '2000-05-23', gender: 'female' as const, heightCm: 163, weightKg: 55, goal: 'weight_loss' as const, exp: 'beginner' as const },
];

const PLAN_DEFS = [
  { name: 'Monthly Basic', durationInDays: 30, price: 1299, features: ['Gym Access', 'Locker'], maxFreeze: 0 },
  { name: 'Monthly Premium', durationInDays: 30, price: 2499, features: ['Gym Access', 'Locker', 'Group Classes', '2 PT Sessions'], maxFreeze: 5 },
  { name: 'Quarterly Elite', durationInDays: 90, price: 5999, features: ['Gym Access', 'Locker', 'Unlimited Classes', '5 PT Sessions', 'Diet Consultation'], maxFreeze: 7 },
  { name: 'Annual Pro', durationInDays: 365, price: 17999, features: ['Unlimited Access', 'Locker', 'Unlimited Classes', 'Unlimited PT', 'Diet + Nutrition', 'Body Composition Analysis'], maxFreeze: 15 },
];

const CLASS_DEFS = [
  { name: 'Sunrise Yoga', category: 'Yoga', trainerIdx: 1, hour: 6, duration: 60, capacity: 15 },
  { name: 'CrossFit WOD', category: 'Functional', trainerIdx: 0, hour: 8, duration: 60, capacity: 18 },
  { name: 'Hypertrophy Lab', category: 'Strength', trainerIdx: 2, hour: 10, duration: 75, capacity: 10 },
  { name: 'Evening HIIT', category: 'Cardio', trainerIdx: 0, hour: 18, duration: 45, capacity: 20 },
  { name: 'Weekend Pilates', category: 'Flexibility', trainerIdx: 1, hour: 9, duration: 60, capacity: 12 },
];

// ─── Main Seed ─────────────────────────────────────────────────────────────────

const seed = async () => {
  await mongoose.connect(env.MONGODB_URI);
  console.log('\n✅ Connected to MongoDB');
  console.log('🌱 Seeding data for Vishnu Nair (CloudFly Fitness)...\n');

  // ── Gym Admin ────────────────────────────────────────────────────────────────
  let gymAdmin = await User.findOne({ email: VISHNU.email });
  if (!gymAdmin) {
    gymAdmin = await User.create({
      firstName: VISHNU.firstName, lastName: VISHNU.lastName,
      email: VISHNU.email, password: VISHNU.password,
      phone: VISHNU.phone, role: 'gym_admin',
      mustChangePassword: false,
      createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
    });
    console.log(`👤 Gym admin created: ${gymAdmin.email}`);
  } else {
    console.log(`👤 Gym admin already exists: ${gymAdmin.email}`);
  }

  // ── Gym ──────────────────────────────────────────────────────────────────────
  let gym = await Gym.findOne({ email: GYM_DEF.email });
  if (!gym) {
    gym = await Gym.create({
      ...GYM_DEF, ownerId: gymAdmin._id, isActive: true,
      createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
    });
    gymAdmin.gymId = gym._id;
    await gymAdmin.save();
    console.log(`🏋️  Gym created: ${gym.name}`);
  } else {
    console.log(`🏋️  Gym already exists: ${gym.name}`);
  }

  const gymId = gym._id;

  // ── Trainers ─────────────────────────────────────────────────────────────────
  const trainers: InstanceType<typeof User>[] = [];
  for (const td of TRAINERS) {
    let t = await User.findOne({ email: td.email });
    if (!t) {
      t = await User.create({
        ...td, password: 'Trainer@123', role: 'trainer',
        gymId, mustChangePassword: false,
        createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
      });
    }
    trainers.push(t);
  }
  console.log(`  👨‍🏫 ${trainers.length} trainers`);

  // ── Staff ─────────────────────────────────────────────────────────────────────
  for (const sd of STAFF) {
    const existing = await User.findOne({ email: sd.email });
    if (!existing) {
      await User.create({
        ...sd, password: 'Staff@123', role: 'staff',
        gymId, mustChangePassword: false,
        createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
      });
    }
  }
  console.log(`  🧑‍💼 ${STAFF.length} staff`);

  // ── Subscription Plans ────────────────────────────────────────────────────────
  const plans: InstanceType<typeof SubscriptionPlan>[] = [];
  for (const pd of PLAN_DEFS) {
    let plan = await SubscriptionPlan.findOne({ gymId, name: pd.name });
    if (!plan) {
      plan = await SubscriptionPlan.create({
        gymId, ...pd, currency: 'INR', isActive: true,
        createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
      });
    }
    plans.push(plan);
  }
  console.log(`  📋 ${plans.length} subscription plans`);

  // ── Members + Profiles ────────────────────────────────────────────────────────
  const members: InstanceType<typeof User>[] = [];
  for (const md of MEMBERS) {
    let member = await User.findOne({ email: md.email });
    if (!member) {
      member = await User.create({
        firstName: md.firstName, lastName: md.lastName,
        email: md.email, password: 'Member@123',
        phone: md.phone, role: 'member',
        gymId, mustChangePassword: false,
        createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
      });
    }
    const existingProfile = await MemberProfile.findOne({ userId: member._id });
    if (!existingProfile) {
      await MemberProfile.create({
        userId: member._id, gymId,
        dateOfBirth: new Date(md.dob),
        gender: md.gender, heightCm: md.heightCm, weightKg: md.weightKg,
        fitnessGoal: md.goal, experienceLevel: md.exp,
        bodyMetricsHistory: [
          { date: daysAgo(60), weightKg: md.weightKg + 4, bmi: parseFloat(((md.weightKg + 4) / ((md.heightCm / 100) ** 2)).toFixed(1)) },
          { date: daysAgo(30), weightKg: md.weightKg + 2, bmi: parseFloat(((md.weightKg + 2) / ((md.heightCm / 100) ** 2)).toFixed(1)) },
          { date: daysAgo(3), weightKg: md.weightKg, bmi: parseFloat((md.weightKg / ((md.heightCm / 100) ** 2)).toFixed(1)) },
        ],
        createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
      });
    }
    members.push(member);
  }
  console.log(`  👥 ${members.length} members`);

  // ── Subscriptions + Payments ──────────────────────────────────────────────────
  let subCount = 0; let payCount = 0;
  for (let mi = 0; mi < members.length; mi++) {
    const member = members[mi];
    const planIndex = mi < 2 ? 0 : mi < 7 ? 1 : mi < 10 ? 2 : 3;
    const plan = plans[planIndex];

    const existingSub = await MemberSubscription.findOne({ memberId: member._id, gymId, status: 'active' });
    if (!existingSub) {
      let startDate: Date; let endDate: Date;

      // mi=0 → expires in 3 days, mi=1 → expires in 6 days, last → already expired
      if (mi === 0) {
        startDate = daysAgo(plan.durationInDays - 3);
        endDate = daysFromNow(3);
      } else if (mi === 1) {
        startDate = daysAgo(plan.durationInDays - 6);
        endDate = daysFromNow(6);
      } else if (mi === members.length - 1) {
        startDate = daysAgo(plan.durationInDays + 40);
        endDate = daysAgo(40);
      } else {
        startDate = daysAgo(Math.floor(Math.random() * 20) + 5);
        endDate = new Date(startDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000);
      }

      const status = endDate < new Date() ? 'expired' : 'active';
      await MemberSubscription.create({
        memberId: member._id, gymId, planId: plan._id,
        startDate, endDate, status,
        createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
      });
      subCount++;

      // mi=3 → failed payment (for dashboard alert)
      const isPaid = mi !== 3;
      await Payment.create({
        gymId, memberId: member._id,
        amount: plan.price, currency: 'INR',
        method: mi % 3 === 0 ? 'cash' : mi % 3 === 1 ? 'upi' : 'card',
        status: isPaid ? 'completed' : 'failed',
        invoiceNumber: nextInvoice(),
        paidAt: isPaid ? startDate : undefined,
        notes: `${plan.name} subscription`,
        createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
      });
      payCount++;

      // Extra historical payment for first 4 active members
      if (mi < 4 && isPaid) {
        await Payment.create({
          gymId, memberId: member._id,
          amount: plan.price, currency: 'INR',
          method: 'upi', status: 'completed',
          invoiceNumber: nextInvoice(),
          paidAt: daysAgo(plan.durationInDays + 8),
          notes: `${plan.name} (previous cycle)`,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
        payCount++;
      }
    } else {
      subCount++;
    }
  }
  console.log(`  💳 ${subCount} subscriptions, ${payCount} payments`);

  // ── Attendance Records ────────────────────────────────────────────────────────
  let attCount = 0;
  for (let mi = 0; mi < members.length; mi++) {
    const member = members[mi];
    // Last member = inactive (no check-ins), mi=5 = sparse (inactive alert)
    if (mi === members.length - 1) continue;
    const maxDaysBack = mi === 5 ? 22 : 30;

    const visitDays = new Set<number>();
    const numVisits = Math.floor(Math.random() * 10) + 8;
    while (visitDays.size < numVisits) {
      visitDays.add(Math.floor(Math.random() * maxDaysBack));
    }

    for (const day of visitDays) {
      const checkIn = new Date(daysAgo(day));
      checkIn.setHours(6 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), 0, 0);
      const checkOut = new Date(checkIn.getTime() + (60 + Math.floor(Math.random() * 60)) * 60000);

      const existingAtt = await Attendance.findOne({
        memberId: member._id, gymId,
        checkInTime: { $gte: new Date(checkIn.getTime() - 60000), $lte: new Date(checkIn.getTime() + 60000) },
      });
      if (!existingAtt) {
        await Attendance.create({
          gymId, memberId: member._id,
          type: 'gym_checkin', checkInTime: checkIn, checkOutTime: checkOut,
          status: 'present', isActive: true,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
        attCount++;
      }
    }
  }
  console.log(`  📅 ${attCount} attendance records`);

  // ── Classes ───────────────────────────────────────────────────────────────────
  let classCount = 0;
  for (const cd of CLASS_DEFS) {
    const trainer = trainers[Math.min(cd.trainerIdx, trainers.length - 1)];

    for (const [offset, status] of [[-1, 'completed'], [0, null], [1, 'scheduled']] as [number, string | null][]) {
      const start = new Date(offset === 0 ? new Date() : offset < 0 ? daysAgo(Math.abs(offset)) : daysFromNow(offset));
      start.setHours(cd.hour, 0, 0, 0);
      const end = new Date(start.getTime() + cd.duration * 60000);

      const derivedStatus = status ?? (end < new Date() ? 'completed' : start <= new Date() ? 'ongoing' : 'scheduled');

      const existing = await GymClass.findOne({
        gymId, name: cd.name,
        startTime: { $gte: new Date(start.getTime() - 60000), $lte: new Date(start.getTime() + 60000) },
      });
      if (!existing) {
        await GymClass.create({
          gymId, trainerId: trainer._id,
          name: cd.name, category: cd.category,
          startTime: start, endTime: end,
          capacity: cd.capacity,
          enrolledCount: Math.floor(cd.capacity * (offset === 0 ? 0.65 : offset < 0 ? 0.8 : 0.4)),
          status: derivedStatus, recurrence: 'none', isActive: true,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
        classCount++;
      }
    }
  }
  console.log(`  🧘 ${classCount} class records`);

  // ── Workout Plans ─────────────────────────────────────────────────────────────
  let wpCount = 0;
  for (let mi = 0; mi < Math.min(9, members.length); mi++) {
    const member = members[mi];
    const trainer = trainers[mi % trainers.length];
    const existing = await WorkoutPlan.findOne({ memberId: member._id, gymId, status: 'active' });
    if (!existing) {
      await WorkoutPlan.create({
        gymId, trainerId: trainer._id, memberId: member._id,
        title: `${member.firstName}'s Training Plan`,
        description: 'Custom plan by CloudFly trainer',
        goal: 'general_fitness', difficultyLevel: 'intermediate',
        durationWeeks: 4, isTemplate: false, isAiGenerated: false,
        status: 'active', startDate: daysAgo(7),
        weeks: [
          {
            weekNumber: 1,
            days: [
              {
                day: 'monday', isRestDay: false, focusArea: 'Push',
                exercises: [
                  { name: 'Bench Press', category: 'strength', sets: 4, reps: '8-10', weightKg: 60, restSeconds: 90, notes: '', orderIndex: 0 },
                  { name: 'Overhead Press', category: 'strength', sets: 3, reps: '10', weightKg: 40, restSeconds: 75, notes: '', orderIndex: 1 },
                ],
              },
              { day: 'tuesday', isRestDay: true, exercises: [] },
              {
                day: 'wednesday', isRestDay: false, focusArea: 'Pull',
                exercises: [
                  { name: 'Deadlift', category: 'strength', sets: 4, reps: '6-8', weightKg: 100, restSeconds: 120, notes: '', orderIndex: 0 },
                  { name: 'Barbell Row', category: 'strength', sets: 3, reps: '10', weightKg: 60, restSeconds: 90, notes: '', orderIndex: 1 },
                ],
              },
              { day: 'thursday', isRestDay: true, exercises: [] },
              {
                day: 'friday', isRestDay: false, focusArea: 'Legs',
                exercises: [
                  { name: 'Back Squat', category: 'strength', sets: 4, reps: '8-10', weightKg: 80, restSeconds: 120, notes: '', orderIndex: 0 },
                  { name: 'Leg Press', category: 'strength', sets: 3, reps: '12', weightKg: 120, restSeconds: 90, notes: '', orderIndex: 1 },
                ],
              },
              {
                day: 'saturday', isRestDay: false, focusArea: 'Cardio & Core',
                exercises: [
                  { name: 'Rowing Machine', category: 'cardio', durationMin: 20, restSeconds: 0, notes: 'Moderate pace', orderIndex: 0 },
                  { name: 'Plank', category: 'strength', sets: 3, reps: '60s', restSeconds: 60, notes: '', orderIndex: 1 },
                ],
              },
              { day: 'sunday', isRestDay: true, exercises: [] },
            ],
          },
        ],
        createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
      });
      wpCount++;
    }
  }
  console.log(`  🏃 ${wpCount} workout plans`);

  // ── Notifications ─────────────────────────────────────────────────────────────
  let notifCount = 0;
  for (let mi = 0; mi < Math.min(5, members.length); mi++) {
    const member = members[mi];
    const existing = await Notification.findOne({ userId: member._id });
    if (existing) continue;

    const notifs = [
      { title: 'Welcome to CloudFly Fitness!', body: 'Your membership is active. Time to crush your goals!', type: 'general' as const },
      { title: 'Subscription Reminder', body: 'Your membership renews soon. Make sure your payment is up to date.', type: 'subscription' as const },
      { title: 'New Workout Plan Ready', body: 'Your trainer has created a personalised plan for you. Check it out!', type: 'workout' as const },
      { title: 'Class Booking Confirmed', body: 'You are enrolled in Sunrise Yoga tomorrow at 6:00 AM.', type: 'class' as const },
    ];

    for (const n of notifs) {
      await Notification.create({
        userId: member._id, gymId,
        title: n.title, body: n.body,
        type: n.type, isRead: mi > 1, isActive: true,
      });
      notifCount++;
    }
  }
  console.log(`  🔔 ${notifCount} notifications`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\n✅ Done!\n');
  console.log('─────────────────────────────────────────────────────');
  console.log('🔑 Login credentials for CloudFly Fitness:');
  console.log('─────────────────────────────────────────────────────');
  console.log(`Gym Admin  : ${VISHNU.email} / ${VISHNU.password}`);
  console.log(`Trainers   : abhishek@cloudflyfitness.com / Trainer@123`);
  console.log(`           : meghna@cloudflyfitness.com / Trainer@123`);
  console.log(`           : tarun@cloudflyfitness.com / Trainer@123`);
  console.log(`Staff      : sameer@cloudflyfitness.com / Staff@123`);
  console.log(`           : diya@cloudflyfitness.com / Staff@123`);
  console.log(`Members    : aryan.k@cfmember.com / Member@123  (+ 11 more)`);
  console.log('─────────────────────────────────────────────────────\n');

  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
