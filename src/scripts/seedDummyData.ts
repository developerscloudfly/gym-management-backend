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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

let invoiceCounter = 1;
const nextInvoice = () => `INV-SEED-${String(invoiceCounter++).padStart(5, '0')}`;

// ─── Gym Definitions ──────────────────────────────────────────────────────────

const gymsData = [
  {
    name: 'FitZone Mumbai',
    description: 'Premium fitness center in the heart of Mumbai',
    address: { street: '42 Linking Road', city: 'Mumbai', state: 'Maharashtra', zipCode: '400050', country: 'India' },
    phone: '+912226543210',
    email: 'info@fitzonemumai.com',
    website: 'https://fitzonemumai.com',
    settings: { currency: 'INR', timezone: 'Asia/Kolkata', workingHours: { open: '05:30', close: '23:00' } },
    owner: { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@fitzonemumai.com', phone: '+919876001001' },
  },
  {
    name: 'PowerHouse Delhi',
    description: 'Strength and conditioning specialist gym',
    address: { street: '88 Connaught Place', city: 'New Delhi', state: 'Delhi', zipCode: '110001', country: 'India' },
    phone: '+911123456789',
    email: 'info@powerhousedelhi.com',
    website: 'https://powerhousedelhi.com',
    settings: { currency: 'INR', timezone: 'Asia/Kolkata', workingHours: { open: '06:00', close: '22:00' } },
    owner: { firstName: 'Priya', lastName: 'Kapoor', email: 'priya@powerhousedelhi.com', phone: '+919876002002' },
  },
];

// ─── Main Seed ────────────────────────────────────────────────────────────────

const seed = async () => {
  await mongoose.connect(env.MONGODB_URI);
  console.log('\n✅ Connected to MongoDB');
  console.log('🌱 Starting dummy data seed...\n');

  // ── 1. Super Admin ────────────────────────────────────────────────────────
  let superAdmin = await User.findOne({ role: 'super_admin' });
  if (!superAdmin) {
    superAdmin = await User.create({
      firstName: 'Super', lastName: 'Admin',
      email: 'superadmin@gym.com', password: 'SuperAdmin@123',
      role: 'super_admin', createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
    });
    console.log('👑 Super admin created:', superAdmin.email);
  } else {
    console.log('👑 Super admin already exists:', superAdmin.email);
  }

  // ── 2. Gyms + Gym Admins ─────────────────────────────────────────────────
  const createdGyms: Array<{ gym: InstanceType<typeof Gym>; gymAdmin: InstanceType<typeof User> }> = [];

  for (const gd of gymsData) {
    const existingGym = await Gym.findOne({ email: gd.email });
    if (existingGym) {
      const existingAdmin = await User.findOne({ email: gd.owner.email });
      if (existingAdmin) {
        createdGyms.push({ gym: existingGym as InstanceType<typeof Gym>, gymAdmin: existingAdmin });
        console.log(`🏋️  Gym already exists: ${gd.name}`);
        continue;
      }
    }

    // Create gym admin
    const gymAdmin = await User.create({
      firstName: gd.owner.firstName, lastName: gd.owner.lastName,
      email: gd.owner.email, password: 'GymAdmin@123',
      phone: gd.owner.phone, role: 'gym_admin',
      mustChangePassword: false,
      createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
    });

    // Create gym
    const gym = await Gym.create({
      name: gd.name, description: gd.description,
      address: gd.address, phone: gd.phone,
      email: gd.email, website: gd.website,
      ownerId: gymAdmin._id, settings: gd.settings,
      isActive: true, createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
    });

    // Link gym admin to gym
    gymAdmin.gymId = gym._id;
    await gymAdmin.save();

    createdGyms.push({ gym: gym as InstanceType<typeof Gym>, gymAdmin });
    console.log(`🏋️  Gym created: ${gym.name} | Admin: ${gymAdmin.email}`);
  }

  // ── 3. Trainers ───────────────────────────────────────────────────────────
  const trainersPerGym: Array<InstanceType<typeof User>[]> = [];

  const trainerDefs = [
    [
      { firstName: 'Arjun', lastName: 'Mehta', email: 'arjun@fitzonemumai.com', phone: '+919810001001' },
      { firstName: 'Sneha', lastName: 'Patil', email: 'sneha@fitzonemumai.com', phone: '+919810001002' },
      { firstName: 'Vikram', lastName: 'Nair', email: 'vikram@fitzonemumai.com', phone: '+919810001003' },
    ],
    [
      { firstName: 'Karan', lastName: 'Singh', email: 'karan@powerhousedelhi.com', phone: '+919820001001' },
      { firstName: 'Nisha', lastName: 'Verma', email: 'nisha@powerhousedelhi.com', phone: '+919820001002' },
    ],
  ];

  for (let i = 0; i < createdGyms.length; i++) {
    const { gym } = createdGyms[i];
    const gymTrainers: InstanceType<typeof User>[] = [];

    for (const td of trainerDefs[i]) {
      let trainer = await User.findOne({ email: td.email });
      if (!trainer) {
        trainer = await User.create({
          ...td, password: 'Trainer@123', role: 'trainer',
          gymId: gym._id, mustChangePassword: false,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
      }
      gymTrainers.push(trainer);
    }

    trainersPerGym.push(gymTrainers);
    console.log(`  👨‍🏫 ${gymTrainers.length} trainers for ${gym.name}`);
  }

  // ── 4. Staff ──────────────────────────────────────────────────────────────
  const staffDefs = [
    [
      { firstName: 'Pooja', lastName: 'Desai', email: 'pooja@fitzonemumai.com', phone: '+919830001001' },
      { firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@fitzonemumai.com', phone: '+919830001002' },
    ],
    [
      { firstName: 'Ananya', lastName: 'Bose', email: 'ananya@powerhousedelhi.com', phone: '+919840001001' },
    ],
  ];

  for (let i = 0; i < createdGyms.length; i++) {
    const { gym } = createdGyms[i];
    for (const sd of staffDefs[i]) {
      const existing = await User.findOne({ email: sd.email });
      if (!existing) {
        await User.create({
          ...sd, password: 'Staff@123', role: 'staff',
          gymId: gym._id, mustChangePassword: false,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
      }
    }
    console.log(`  🧑‍💼 ${staffDefs[i].length} staff for ${gym.name}`);
  }

  // ── 5. Subscription Plans ─────────────────────────────────────────────────
  const plansPerGym: Array<InstanceType<typeof SubscriptionPlan>[]> = [];

  const planDefs = [
    { name: 'Monthly Basic', durationInDays: 30, price: 999, features: ['Gym Access', 'Locker'], maxFreeze: 0 },
    { name: 'Monthly Premium', durationInDays: 30, price: 1999, features: ['Gym Access', 'Locker', 'Group Classes', '1 PT Session'], maxFreeze: 5 },
    { name: 'Quarterly', durationInDays: 90, price: 4999, features: ['Gym Access', 'Locker', 'Group Classes', '3 PT Sessions', 'Diet Consultation'], maxFreeze: 7 },
    { name: 'Annual', durationInDays: 365, price: 14999, features: ['Unlimited Access', 'Locker', 'Group Classes', 'Unlimited PT', 'Diet Consultation', 'Body Analysis'], maxFreeze: 15 },
  ];

  for (const { gym } of createdGyms) {
    const gymPlans: InstanceType<typeof SubscriptionPlan>[] = [];
    for (const pd of planDefs) {
      let plan = await SubscriptionPlan.findOne({ gymId: gym._id, name: pd.name });
      if (!plan) {
        plan = await SubscriptionPlan.create({
          gymId: gym._id, ...pd, currency: 'INR', isActive: true,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
      }
      gymPlans.push(plan);
    }
    plansPerGym.push(gymPlans);
    console.log(`  📋 ${gymPlans.length} subscription plans for ${gym.name}`);
  }

  // ── 6. Members ────────────────────────────────────────────────────────────
  const membersPerGym: Array<InstanceType<typeof User>[]> = [];

  const memberDefs = [
    // FitZone Mumbai - 15 members
    [
      { firstName: 'Aditya', lastName: 'Joshi', email: 'aditya@member.com', phone: '+919900001001', dob: '1995-03-12', gender: 'male' as const, heightCm: 175, weightKg: 78, goal: 'muscle_gain' as const, exp: 'intermediate' as const },
      { firstName: 'Priya', lastName: 'Malhotra', email: 'priya.m@member.com', phone: '+919900001002', dob: '1998-07-22', gender: 'female' as const, heightCm: 163, weightKg: 58, goal: 'weight_loss' as const, exp: 'beginner' as const },
      { firstName: 'Siddharth', lastName: 'Rao', email: 'sid@member.com', phone: '+919900001003', dob: '1993-11-05', gender: 'male' as const, heightCm: 180, weightKg: 85, goal: 'strength' as const, exp: 'advanced' as const },
      { firstName: 'Kavya', lastName: 'Iyer', email: 'kavya@member.com', phone: '+919900001004', dob: '2000-01-18', gender: 'female' as const, heightCm: 158, weightKg: 52, goal: 'general_fitness' as const, exp: 'beginner' as const },
      { firstName: 'Rohan', lastName: 'Gupta', email: 'rohan@member.com', phone: '+919900001005', dob: '1996-06-30', gender: 'male' as const, heightCm: 172, weightKg: 70, goal: 'endurance' as const, exp: 'intermediate' as const },
      { firstName: 'Anita', lastName: 'Sharma', email: 'anita@member.com', phone: '+919900001006', dob: '1990-09-14', gender: 'female' as const, heightCm: 160, weightKg: 65, goal: 'weight_loss' as const, exp: 'beginner' as const },
      { firstName: 'Nikhil', lastName: 'Patel', email: 'nikhil@member.com', phone: '+919900001007', dob: '1994-04-25', gender: 'male' as const, heightCm: 178, weightKg: 82, goal: 'muscle_gain' as const, exp: 'intermediate' as const },
      { firstName: 'Divya', lastName: 'Nair', email: 'divya@member.com', phone: '+919900001008', dob: '1997-12-08', gender: 'female' as const, heightCm: 165, weightKg: 60, goal: 'flexibility' as const, exp: 'beginner' as const },
      { firstName: 'Akash', lastName: 'Mehta', email: 'akash@member.com', phone: '+919900001009', dob: '1992-02-17', gender: 'male' as const, heightCm: 173, weightKg: 76, goal: 'strength' as const, exp: 'advanced' as const },
      { firstName: 'Shreya', lastName: 'Bhat', email: 'shreya@member.com', phone: '+919900001010', dob: '1999-08-03', gender: 'female' as const, heightCm: 161, weightKg: 55, goal: 'general_fitness' as const, exp: 'intermediate' as const },
      { firstName: 'Rahul', lastName: 'Verma', email: 'rahul.v@member.com', phone: '+919900001011', dob: '1991-05-20', gender: 'male' as const, heightCm: 176, weightKg: 90, goal: 'weight_loss' as const, exp: 'beginner' as const },
      { firstName: 'Meera', lastName: 'Pillai', email: 'meera@member.com', phone: '+919900001012', dob: '1996-10-11', gender: 'female' as const, heightCm: 159, weightKg: 57, goal: 'endurance' as const, exp: 'intermediate' as const },
      { firstName: 'Suresh', lastName: 'Kumar', email: 'suresh@member.com', phone: '+919900001013', dob: '1988-03-28', gender: 'male' as const, heightCm: 169, weightKg: 73, goal: 'muscle_gain' as const, exp: 'intermediate' as const },
      { firstName: 'Lakshmi', lastName: 'Reddy', email: 'lakshmi@member.com', phone: '+919900001014', dob: '2001-06-15', gender: 'female' as const, heightCm: 162, weightKg: 53, goal: 'general_fitness' as const, exp: 'beginner' as const },
      { firstName: 'Deepak', lastName: 'Singh', email: 'deepak@member.com', phone: '+919900001015', dob: '1993-09-02', gender: 'male' as const, heightCm: 174, weightKg: 79, goal: 'strength' as const, exp: 'advanced' as const },
    ],
    // PowerHouse Delhi - 10 members
    [
      { firstName: 'Aisha', lastName: 'Khan', email: 'aisha@member.com', phone: '+919900002001', dob: '1997-04-10', gender: 'female' as const, heightCm: 164, weightKg: 59, goal: 'weight_loss' as const, exp: 'beginner' as const },
      { firstName: 'Vikram', lastName: 'Yadav', email: 'vikram.y@member.com', phone: '+919900002002', dob: '1994-11-22', gender: 'male' as const, heightCm: 182, weightKg: 88, goal: 'muscle_gain' as const, exp: 'advanced' as const },
      { firstName: 'Sunita', lastName: 'Arora', email: 'sunita@member.com', phone: '+919900002003', dob: '1989-07-05', gender: 'female' as const, heightCm: 157, weightKg: 68, goal: 'weight_loss' as const, exp: 'beginner' as const },
      { firstName: 'Manish', lastName: 'Tiwari', email: 'manish@member.com', phone: '+919900002004', dob: '1995-01-30', gender: 'male' as const, heightCm: 177, weightKg: 83, goal: 'strength' as const, exp: 'intermediate' as const },
      { firstName: 'Ritu', lastName: 'Chopra', email: 'ritu@member.com', phone: '+919900002005', dob: '1998-05-18', gender: 'female' as const, heightCm: 166, weightKg: 62, goal: 'general_fitness' as const, exp: 'beginner' as const },
      { firstName: 'Sanjay', lastName: 'Mishra', email: 'sanjay@member.com', phone: '+919900002006', dob: '1985-08-25', gender: 'male' as const, heightCm: 171, weightKg: 91, goal: 'weight_loss' as const, exp: 'beginner' as const },
      { firstName: 'Pooja', lastName: 'Saxena', email: 'pooja.s@member.com', phone: '+919900002007', dob: '2000-12-12', gender: 'female' as const, heightCm: 160, weightKg: 54, goal: 'endurance' as const, exp: 'intermediate' as const },
      { firstName: 'Rajesh', lastName: 'Pandey', email: 'rajesh@member.com', phone: '+919900002008', dob: '1992-03-07', gender: 'male' as const, heightCm: 170, weightKg: 75, goal: 'muscle_gain' as const, exp: 'intermediate' as const },
      { firstName: 'Tanvi', lastName: 'Jain', email: 'tanvi@member.com', phone: '+919900002009', dob: '1999-09-29', gender: 'female' as const, heightCm: 163, weightKg: 56, goal: 'flexibility' as const, exp: 'beginner' as const },
      { firstName: 'Harsh', lastName: 'Agarwal', email: 'harsh@member.com', phone: '+919900002010', dob: '1996-06-14', gender: 'male' as const, heightCm: 179, weightKg: 80, goal: 'strength' as const, exp: 'advanced' as const },
    ],
  ];

  for (let gi = 0; gi < createdGyms.length; gi++) {
    const { gym } = createdGyms[gi];
    const gymMembers: InstanceType<typeof User>[] = [];

    for (const md of memberDefs[gi]) {
      let member = await User.findOne({ email: md.email });
      if (!member) {
        member = await User.create({
          firstName: md.firstName, lastName: md.lastName,
          email: md.email, password: 'Member@123',
          phone: md.phone, role: 'member',
          gymId: gym._id, mustChangePassword: false,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
      }

      // Create member profile
      const existingProfile = await MemberProfile.findOne({ userId: member._id });
      if (!existingProfile) {
        await MemberProfile.create({
          userId: member._id, gymId: gym._id,
          dateOfBirth: new Date(md.dob),
          gender: md.gender, heightCm: md.heightCm, weightKg: md.weightKg,
          fitnessGoal: md.goal, experienceLevel: md.exp,
          bodyMetricsHistory: [
            { date: daysAgo(60), weightKg: md.weightKg + 3, bmi: parseFloat(((md.weightKg + 3) / ((md.heightCm / 100) ** 2)).toFixed(1)) },
            { date: daysAgo(30), weightKg: md.weightKg + 1, bmi: parseFloat(((md.weightKg + 1) / ((md.heightCm / 100) ** 2)).toFixed(1)) },
            { date: daysAgo(5), weightKg: md.weightKg, bmi: parseFloat((md.weightKg / ((md.heightCm / 100) ** 2)).toFixed(1)) },
          ],
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
      }

      gymMembers.push(member);
    }

    membersPerGym.push(gymMembers);
    console.log(`  👥 ${gymMembers.length} members for ${gym.name}`);
  }

  // ── 7. Subscriptions + Payments ───────────────────────────────────────────
  for (let gi = 0; gi < createdGyms.length; gi++) {
    const { gym } = createdGyms[gi];
    const members = membersPerGym[gi];
    const plans = plansPerGym[gi];
    let subCount = 0;
    let payCount = 0;

    for (let mi = 0; mi < members.length; mi++) {
      const member = members[mi];
      // Distribute plans: most get Monthly Premium, some Quarterly, a few Annual, a couple Basic
      const planIndex = mi < 2 ? 0 : mi < 8 ? 1 : mi < 12 ? 2 : 3;
      const plan = plans[planIndex];

      const existingSub = await MemberSubscription.findOne({ memberId: member._id, gymId: gym._id, status: 'active' });
      if (existingSub) { subCount++; continue; }

      // Some members have expiring soon subscriptions (for dashboard testing)
      let startDate: Date;
      let endDate: Date;
      if (mi === 0) {
        // Expires in 2 days
        startDate = daysAgo(plan.durationInDays - 2);
        endDate = daysFromNow(2);
      } else if (mi === 1) {
        // Expires in 5 days
        startDate = daysAgo(plan.durationInDays - 5);
        endDate = daysFromNow(5);
      } else if (mi === members.length - 1) {
        // Expired last month (for churn stats)
        startDate = daysAgo(plan.durationInDays + 35);
        endDate = daysAgo(35);
      } else {
        startDate = daysAgo(Math.floor(Math.random() * 20) + 5);
        endDate = new Date(startDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000);
      }

      const status = endDate < new Date() ? 'expired' : 'active';

      await MemberSubscription.create({
        memberId: member._id, gymId: gym._id, planId: plan._id,
        startDate, endDate, status,
        createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
      });
      subCount++;

      // Payment record
      const isPaid = mi !== 3; // member index 3 has a failed payment
      await Payment.create({
        gymId: gym._id, memberId: member._id,
        amount: plan.price, currency: 'INR',
        method: mi % 3 === 0 ? 'cash' : mi % 3 === 1 ? 'upi' : 'card',
        status: isPaid ? 'completed' : 'failed',
        invoiceNumber: nextInvoice(),
        paidAt: isPaid ? startDate : undefined,
        notes: `${plan.name} subscription`,
        createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
      });
      payCount++;

      // Historical payment (previous month) for some members
      if (mi < 5 && status === 'active') {
        await Payment.create({
          gymId: gym._id, memberId: member._id,
          amount: plan.price, currency: 'INR',
          method: 'upi', status: 'completed',
          invoiceNumber: nextInvoice(),
          paidAt: daysAgo(plan.durationInDays + 5),
          notes: `${plan.name} subscription (prev month)`,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
        payCount++;
      }
    }
    console.log(`  💳 ${subCount} subscriptions, ${payCount} payments for ${gym.name}`);
  }

  // ── 8. Attendance Records ─────────────────────────────────────────────────
  for (let gi = 0; gi < createdGyms.length; gi++) {
    const { gym } = createdGyms[gi];
    const members = membersPerGym[gi];
    let attCount = 0;

    for (let mi = 0; mi < members.length; mi++) {
      const member = members[mi];
      // Last member is "inactive" (no recent check-ins for dashboard test)
      if (mi === members.length - 1) continue;
      // Members index 3 skips last 20 days (inactive member test)
      const maxDaysBack = mi === 4 ? 25 : 30;

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
          memberId: member._id,
          gymId: gym._id,
          checkInTime: { $gte: new Date(checkIn.getTime() - 60000), $lte: new Date(checkIn.getTime() + 60000) },
        });
        if (!existingAtt) {
          await Attendance.create({
            gymId: gym._id, memberId: member._id,
            type: 'gym_checkin', checkInTime: checkIn, checkOutTime: checkOut,
            status: 'present', isActive: true,
            createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
          });
          attCount++;
        }
      }
    }
    console.log(`  📅 ${attCount} attendance records for ${gym.name}`);
  }

  // ── 9. Classes ────────────────────────────────────────────────────────────
  const classDefsPerGym = [
    [
      { name: 'Morning Yoga', category: 'Yoga', trainerIdx: 1, hour: 7, duration: 60, capacity: 15 },
      { name: 'HIIT Blast', category: 'Cardio', trainerIdx: 0, hour: 9, duration: 45, capacity: 20 },
      { name: 'Strength Foundations', category: 'Strength', trainerIdx: 2, hour: 11, duration: 60, capacity: 12 },
      { name: 'Evening Zumba', category: 'Dance', trainerIdx: 1, hour: 18, duration: 60, capacity: 25 },
      { name: 'Power Cycling', category: 'Cardio', trainerIdx: 0, hour: 7, duration: 45, capacity: 20 },
    ],
    [
      { name: 'Powerlifting Club', category: 'Strength', trainerIdx: 0, hour: 8, duration: 90, capacity: 10 },
      { name: 'Functional Fitness', category: 'Functional', trainerIdx: 1, hour: 10, duration: 60, capacity: 15 },
      { name: 'Boxing Basics', category: 'Combat', trainerIdx: 0, hour: 17, duration: 60, capacity: 12 },
    ],
  ];

  for (let gi = 0; gi < createdGyms.length; gi++) {
    const { gym } = createdGyms[gi];
    const trainers = trainersPerGym[gi];
    let classCount = 0;

    for (const cd of classDefsPerGym[gi]) {
      const trainer = trainers[Math.min(cd.trainerIdx, trainers.length - 1)];

      // Create today's class
      const todayStart = new Date();
      todayStart.setHours(cd.hour, 0, 0, 0);
      const todayEnd = new Date(todayStart.getTime() + cd.duration * 60000);
      const todayStatus = todayEnd < new Date() ? 'completed' : todayStart <= new Date() ? 'ongoing' : 'scheduled';

      const existingToday = await GymClass.findOne({ gymId: gym._id, name: cd.name, startTime: { $gte: new Date(todayStart.getTime() - 60000), $lte: new Date(todayStart.getTime() + 60000) } });
      if (!existingToday) {
        await GymClass.create({
          gymId: gym._id, trainerId: trainer._id,
          name: cd.name, category: cd.category,
          startTime: todayStart, endTime: todayEnd,
          capacity: cd.capacity, enrolledCount: Math.floor(cd.capacity * 0.6),
          status: todayStatus, recurrence: 'none', isActive: true,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
        classCount++;
      }

      // Create yesterday's completed class
      const yStart = new Date(daysAgo(1));
      yStart.setHours(cd.hour, 0, 0, 0);
      const yEnd = new Date(yStart.getTime() + cd.duration * 60000);
      const existingY = await GymClass.findOne({ gymId: gym._id, name: cd.name, startTime: { $gte: new Date(yStart.getTime() - 60000), $lte: new Date(yStart.getTime() + 60000) } });
      if (!existingY) {
        await GymClass.create({
          gymId: gym._id, trainerId: trainer._id,
          name: cd.name, category: cd.category,
          startTime: yStart, endTime: yEnd,
          capacity: cd.capacity, enrolledCount: Math.floor(cd.capacity * 0.7),
          status: 'completed', recurrence: 'none', isActive: true,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
        classCount++;
      }

      // Tomorrow's class
      const tmStart = new Date(daysFromNow(1));
      tmStart.setHours(cd.hour, 0, 0, 0);
      const tmEnd = new Date(tmStart.getTime() + cd.duration * 60000);
      const existingTm = await GymClass.findOne({ gymId: gym._id, name: cd.name, startTime: { $gte: new Date(tmStart.getTime() - 60000), $lte: new Date(tmStart.getTime() + 60000) } });
      if (!existingTm) {
        await GymClass.create({
          gymId: gym._id, trainerId: trainer._id,
          name: cd.name, category: cd.category,
          startTime: tmStart, endTime: tmEnd,
          capacity: cd.capacity, enrolledCount: Math.floor(cd.capacity * 0.4),
          status: 'scheduled', recurrence: 'none', isActive: true,
          createdBy: SYSTEM_ID, updatedBy: SYSTEM_ID,
        });
        classCount++;
      }
    }
    console.log(`  🧘 ${classCount} class records for ${gym.name}`);
  }

  // ── 10. Workout Plans ─────────────────────────────────────────────────────
  for (let gi = 0; gi < createdGyms.length; gi++) {
    const { gym } = createdGyms[gi];
    const trainers = trainersPerGym[gi];
    const members = membersPerGym[gi];
    let wpCount = 0;

    // Assign workout plans to first 8 members of each gym
    for (let mi = 0; mi < Math.min(8, members.length); mi++) {
      const member = members[mi];
      const trainer = trainers[mi % trainers.length];

      const existing = await WorkoutPlan.findOne({ memberId: member._id, gymId: gym._id, status: 'active' });
      if (existing) { wpCount++; continue; }

      await WorkoutPlan.create({
        gymId: gym._id, trainerId: trainer._id, memberId: member._id,
        title: `${member.firstName}'s Custom Plan`,
        description: 'Personalized training program',
        goal: 'general_fitness', difficultyLevel: 'intermediate',
        durationWeeks: 4, isTemplate: false, isAiGenerated: false,
        status: 'active', startDate: daysAgo(10),
        weeks: [
          {
            weekNumber: 1,
            days: [
              {
                day: 'monday', isRestDay: false, focusArea: 'Chest & Triceps',
                exercises: [
                  { name: 'Bench Press', category: 'strength', sets: 4, reps: '8-10', weightKg: 60, restSeconds: 90, notes: '', orderIndex: 0 },
                  { name: 'Push Ups', category: 'strength', sets: 3, reps: '15', restSeconds: 60, notes: '', orderIndex: 1 },
                ],
              },
              { day: 'tuesday', isRestDay: true, exercises: [] },
              {
                day: 'wednesday', isRestDay: false, focusArea: 'Back & Biceps',
                exercises: [
                  { name: 'Pull Ups', category: 'strength', sets: 3, reps: '8-10', restSeconds: 90, notes: '', orderIndex: 0 },
                  { name: 'Dumbbell Curl', category: 'strength', sets: 3, reps: '12', weightKg: 12, restSeconds: 60, notes: '', orderIndex: 1 },
                ],
              },
              { day: 'thursday', isRestDay: true, exercises: [] },
              {
                day: 'friday', isRestDay: false, focusArea: 'Legs & Shoulders',
                exercises: [
                  { name: 'Squats', category: 'strength', sets: 4, reps: '10-12', weightKg: 80, restSeconds: 120, notes: '', orderIndex: 0 },
                  { name: 'Shoulder Press', category: 'strength', sets: 3, reps: '10', weightKg: 20, restSeconds: 90, notes: '', orderIndex: 1 },
                ],
              },
              { day: 'saturday', isRestDay: false, focusArea: 'Cardio',
                exercises: [
                  { name: 'Treadmill Run', category: 'cardio', durationMin: 30, restSeconds: 0, notes: 'Moderate pace', orderIndex: 0 },
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
    console.log(`  🏃 ${wpCount} workout plans for ${gym.name}`);
  }

  // ── 11. Notifications ─────────────────────────────────────────────────────
  for (let gi = 0; gi < createdGyms.length; gi++) {
    const members = membersPerGym[gi];
    let notifCount = 0;

    for (let mi = 0; mi < Math.min(5, members.length); mi++) {
      const member = members[mi];
      const existing = await Notification.findOne({ userId: member._id });
      if (existing) continue;

      const notifs = [
        { title: 'Welcome to the Gym!', body: 'Your membership is now active. Start your fitness journey today!', type: 'general' as const },
        { title: 'Membership Expiring Soon', body: 'Your membership expires in 7 days. Renew now to continue your progress.', type: 'subscription' as const },
        { title: 'Workout Plan Assigned', body: 'Your trainer has assigned a new workout plan. Check it out!', type: 'workout' as const },
        { title: 'Class Reminder', body: "Morning Yoga starts in 1 hour. Don't forget your mat!", type: 'class' as const },
      ];

      for (const n of notifs) {
        await Notification.create({
          userId: member._id, title: n.title, body: n.body,
          type: n.type, isRead: mi > 1,
        });
        notifCount++;
      }
    }
    console.log(`  🔔 ${notifCount} notifications for ${createdGyms[gi].gym.name}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!\n');
  console.log('─────────────────────────────────────────');
  console.log('🔑 Login credentials:');
  console.log('─────────────────────────────────────────');
  console.log('Super Admin:');
  console.log('  Email    : superadmin@gym.com');
  console.log('  Password : SuperAdmin@123\n');
  for (const gd of gymsData) {
    console.log(`Gym Admin (${gd.name}):`);
    console.log(`  Email    : ${gd.owner.email}`);
    console.log('  Password : GymAdmin@123');
  }
  console.log('\nTrainers : <email from above> / Trainer@123');
  console.log('Staff    : <email from above> / Staff@123');
  console.log('Members  : <email from above> / Member@123');
  console.log('─────────────────────────────────────────\n');

  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
