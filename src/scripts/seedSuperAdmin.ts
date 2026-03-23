import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/user/user.model';

const SUPER_ADMIN = {
  firstName: 'Super',
  lastName: 'Admin',
  email: 'superadmin@gym.com',
  password: 'SuperAdmin@123',
  role: 'super_admin' as const,
};

const seed = async () => {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: SUPER_ADMIN.email });
  if (existing) {
    console.log('Super admin already exists:', existing.email);
    process.exit(0);
  }

  const user = await User.create({
    ...SUPER_ADMIN,
    createdBy: new mongoose.Types.ObjectId(env.SYSTEM_USER_ID),
    updatedBy: new mongoose.Types.ObjectId(env.SYSTEM_USER_ID),
  });

  console.log('Super admin created successfully:');
  console.log(`  Email: ${user.email}`);
  console.log(`  Password: ${SUPER_ADMIN.password}`);
  console.log('  ** Change this password after first login **');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
