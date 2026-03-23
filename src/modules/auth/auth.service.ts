import crypto from 'crypto';
import mongoose from 'mongoose';
import { User, IUser } from '../user/user.model';
import { ApiError } from '../../utils/apiError';
import { verifyRefreshToken } from '../../utils/token';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../../services/email.service';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validation';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: Omit<IUser, 'password' | 'refreshToken'>;
  tokens: AuthTokens;
}

const sanitizeUser = (user: IUser) => {
  const obj = user.toObject();
  delete (obj as Record<string, unknown>).password;
  delete (obj as Record<string, unknown>).refreshToken;
  delete (obj as Record<string, unknown>).passwordResetToken;
  delete (obj as Record<string, unknown>).passwordResetExpiry;
  return obj;
};

export const registerUser = async (
  data: RegisterInput,
  actorId?: mongoose.Types.ObjectId
): Promise<AuthResult> => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw ApiError.conflict('Email is already registered');
  }

  const user = await User.create({
    ...data,
    createdBy: actorId,
    updatedBy: actorId,
  });

  // For self-registration, set createdBy to own _id
  if (!actorId) {
    user.createdBy = user._id;
    user.updatedBy = user._id;
    await user.save();
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  // Fire-and-forget welcome email
  sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`).catch(() => undefined);

  return { user: sanitizeUser(user) as Omit<IUser, 'password' | 'refreshToken'>, tokens: { accessToken, refreshToken } };
};

export const loginUser = async (data: LoginInput): Promise<AuthResult> => {
  // Explicitly select password + refreshToken (both have select: false)
  const user = await User.findOne({ email: data.email, isActive: true }).select(
    '+password +refreshToken'
  );

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(data.password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  user.updatedBy = user._id;
  await user.save();

  return { user: sanitizeUser(user) as Omit<IUser, 'password' | 'refreshToken'>, tokens: { accessToken, refreshToken } };
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw ApiError.unauthorized('Current password is incorrect');

  user.password = newPassword;
  user.mustChangePassword = false;
  user.updatedBy = user._id;
  await user.save();
};

export const refreshTokens = async (token: string): Promise<AuthTokens> => {
  const decoded = verifyRefreshToken(token);

  const user = await User.findById(decoded._id).select('+refreshToken');

  if (!user || user.refreshToken !== token) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Account is deactivated');
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  user.updatedBy = user._id;
  await user.save();

  return { accessToken, refreshToken };
};

export const logoutUser = async (userId: string): Promise<void> => {
  await User.findByIdAndUpdate(userId, {
    refreshToken: null,
    updatedBy: new mongoose.Types.ObjectId(userId),
  });
};

export const forgotPassword = async (data: ForgotPasswordInput): Promise<string> => {
  const user = await User.findOne({ email: data.email, isActive: true });

  // Always return success to prevent email enumeration
  if (!user) return '';

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  user.updatedBy = user._id;
  await user.save();

  // Fire-and-forget password reset email
  sendPasswordResetEmail(user.email, `${user.firstName} ${user.lastName}`, resetToken).catch(() => undefined);

  return resetToken; // Return raw token for email
};

export const resetPassword = async (data: ResetPasswordInput): Promise<void> => {
  const hashedToken = crypto.createHash('sha256').update(data.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: new Date() },
    isActive: true,
  }).select('+passwordResetToken +passwordResetExpiry');

  if (!user) {
    throw ApiError.badRequest('Reset token is invalid or has expired');
  }

  user.password = data.password;
  user.passwordResetToken = null;
  user.passwordResetExpiry = null;
  user.refreshToken = null; // Force re-login
  user.updatedBy = user._id;
  await user.save();
};

export const getMe = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
};
