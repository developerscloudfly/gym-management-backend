import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../../utils/token';

export type UserRole = 'super_admin' | 'gym_admin' | 'trainer' | 'staff' | 'member';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  gymId?: mongoose.Types.ObjectId | null;
  avatar: string;
  isActive: boolean;
  isEmailVerified: boolean;
  refreshToken?: string | null;
  passwordResetToken?: string | null;
  passwordResetExpiry?: Date | null;
  lastLogin?: Date | null;
  fcmToken?: string | null;
  // Audit fields (added by global plugin)
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

interface IUserModel extends Model<IUser> {}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries by default
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+[1-9]\d{6,14}$/, 'Phone must include country code e.g. +91XXXXXXXXXX'],
    },
    role: {
      type: String,
      enum: ['super_admin', 'gym_admin', 'trainer', 'staff', 'member'],
      required: [true, 'Role is required'],
    },
    gymId: {
      type: Schema.Types.ObjectId,
      ref: 'Gym',
      default: null,
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetToken: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetExpiry: {
      type: Date,
      select: false,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    fcmToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ gymId: 1, role: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare candidate password with stored hash
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate short-lived access token
userSchema.methods.generateAccessToken = function (): string {
  return generateAccessToken({
    _id: this._id.toString(),
    role: this.role,
    gymId: this.gymId?.toString() ?? null,
  });
};

// Generate long-lived refresh token
userSchema.methods.generateRefreshToken = function (): string {
  return generateRefreshToken({
    _id: this._id.toString(),
    role: this.role,
    gymId: this.gymId?.toString() ?? null,
  });
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
