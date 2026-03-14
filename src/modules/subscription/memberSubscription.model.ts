import mongoose, { Schema, Document, Model } from 'mongoose';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'frozen';

interface IFreezeRecord {
  startDate: Date;
  endDate?: Date;
  reason?: string;
}

export interface IMemberSubscription extends Document {
  _id: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  gymId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  freezeHistory: IFreezeRecord[];
  autoRenew: boolean;
  cancelledAt?: Date;
  cancelReason?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IMemberSubscriptionModel extends Model<IMemberSubscription> {}

const memberSubscriptionSchema = new Schema<IMemberSubscription>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'frozen'],
      default: 'active',
    },
    freezeHistory: {
      type: [
        {
          startDate: { type: Date, required: true },
          endDate: Date,
          reason: String,
        },
      ],
      default: [],
    },
    autoRenew: { type: Boolean, default: false },
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true }
);

memberSubscriptionSchema.index({ memberId: 1, status: 1 });
memberSubscriptionSchema.index({ gymId: 1, status: 1 });
memberSubscriptionSchema.index({ endDate: 1 });

export const MemberSubscription = mongoose.model<IMemberSubscription, IMemberSubscriptionModel>(
  'MemberSubscription',
  memberSubscriptionSchema
);
