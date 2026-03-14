import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  _id: mongoose.Types.ObjectId;
  gymId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  durationInDays: number;
  price: number;
  currency: string;
  features: string[];
  maxFreeze: number;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface ISubscriptionPlanModel extends Model<ISubscriptionPlan> {}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    name: { type: String, required: [true, 'Plan name is required'], trim: true },
    description: { type: String, default: '' },
    durationInDays: { type: Number, required: [true, 'Duration is required'], min: 1 },
    price: { type: Number, required: [true, 'Price is required'], min: 0 },
    currency: { type: String, default: 'INR' },
    features: { type: [String], default: [] },
    maxFreeze: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ gymId: 1, isActive: 1 });

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan, ISubscriptionPlanModel>(
  'SubscriptionPlan',
  subscriptionPlanSchema
);
