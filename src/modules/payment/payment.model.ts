import mongoose, { Document, Schema, Types } from 'mongoose';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'razorpay' | 'cash' | 'card' | 'upi' | 'bank_transfer';

export interface IPayment extends Document {
  gymId: Types.ObjectId;
  memberId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  // Razorpay fields
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  // Invoice
  invoiceNumber: string;
  invoiceUrl?: string;
  notes?: string;
  paidAt?: Date;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const paymentSchema = new Schema<IPayment>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'MemberSubscription' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    method: {
      type: String,
      enum: ['razorpay', 'cash', 'card', 'upi', 'bank_transfer'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceUrl: { type: String },
    notes: { type: String },
    paidAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

paymentSchema.index({ gymId: 1, paidAt: -1 });
paymentSchema.index({ gymId: 1, status: 1 });
paymentSchema.index({ razorpayOrderId: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
