import mongoose, { Schema, Document, Model } from 'mongoose';

export type FitnessGoal =
  | 'weight_loss'
  | 'muscle_gain'
  | 'endurance'
  | 'flexibility'
  | 'general_fitness'
  | 'strength'
  | 'sports_performance';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type DietaryPreference =
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'paleo'
  | 'gluten_free'
  | 'dairy_free';

interface IBodyMetric {
  date: Date;
  weightKg: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  bmi?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  thighs?: number;
  notes?: string;
}

interface IEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IMemberProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  gymId: mongoose.Types.ObjectId;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
  fitnessGoal: FitnessGoal;
  experienceLevel: ExperienceLevel;
  dietaryPreference: DietaryPreference;
  medicalConditions: string[];
  injuries: string[];
  emergencyContact?: IEmergencyContact;
  bodyMetricsHistory: IBodyMetric[];
  // Audit fields
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IMemberProfileModel extends Model<IMemberProfile> {}

const bodyMetricSchema = new Schema<IBodyMetric>(
  {
    date: { type: Date, required: true },
    weightKg: { type: Number, required: true },
    bodyFatPct: Number,
    muscleMassKg: Number,
    bmi: Number,
    chest: Number,
    waist: Number,
    hips: Number,
    biceps: Number,
    thighs: Number,
    notes: String,
  },
  { _id: false }
);

const memberProfileSchema = new Schema<IMemberProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    gymId: {
      type: Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
    },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    heightCm: Number,
    weightKg: Number,
    fitnessGoal: {
      type: String,
      enum: [
        'weight_loss',
        'muscle_gain',
        'endurance',
        'flexibility',
        'general_fitness',
        'strength',
        'sports_performance',
      ],
      default: 'general_fitness',
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    dietaryPreference: {
      type: String,
      enum: ['none', 'vegetarian', 'vegan', 'keto', 'paleo', 'gluten_free', 'dairy_free'],
      default: 'none',
    },
    medicalConditions: { type: [String], default: [] },
    injuries: { type: [String], default: [] },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    bodyMetricsHistory: { type: [bodyMetricSchema], default: [] },
  },
  { timestamps: true }
);

memberProfileSchema.index({ gymId: 1 });

export const MemberProfile = mongoose.model<IMemberProfile, IMemberProfileModel>(
  'MemberProfile',
  memberProfileSchema
);
