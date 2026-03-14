import mongoose, { Schema, Document, Model } from 'mongoose';

export type MealType =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'evening_snack'
  | 'dinner'
  | 'pre_workout'
  | 'post_workout';

interface IFoodItem {
  name: string;
  quantity: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  notes?: string;
}

interface IMeal {
  mealType: MealType;
  time?: string;
  items: IFoodItem[];
}

export interface IDietPlan extends Document {
  _id: mongoose.Types.ObjectId;
  gymId: mongoose.Types.ObjectId;
  trainerId?: mongoose.Types.ObjectId;
  memberId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  goal: string;
  dietaryPreference: string;
  dailyCalorieTarget: number;
  dailyProteinG?: number;
  dailyCarbsG?: number;
  dailyFatG?: number;
  waterLiters?: number;
  meals: IMeal[];
  isTemplate: boolean;
  isAiGenerated: boolean;
  status: 'active' | 'completed' | 'archived';
  startDate?: Date;
  endDate?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IDietPlanModel extends Model<IDietPlan> {}

const foodItemSchema = new Schema<IFoodItem>(
  {
    name: { type: String, required: true },
    quantity: { type: String, required: true },
    calories: { type: Number, required: true, min: 0 },
    proteinG: Number,
    carbsG: Number,
    fatG: Number,
    fiberG: Number,
    notes: String,
  },
  { _id: false }
);

const mealSchema = new Schema<IMeal>(
  {
    mealType: {
      type: String,
      enum: ['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'pre_workout', 'post_workout'],
      required: true,
    },
    time: String,
    items: { type: [foodItemSchema], required: true },
  },
  { _id: false }
);

const dietPlanSchema = new Schema<IDietPlan>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
    trainerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, default: '' },
    goal: {
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'strength', 'sports_performance'],
      required: true,
    },
    dietaryPreference: {
      type: String,
      enum: ['none', 'vegetarian', 'vegan', 'keto', 'paleo', 'gluten_free', 'dairy_free'],
      default: 'none',
    },
    dailyCalorieTarget: { type: Number, required: true, min: 0 },
    dailyProteinG: Number,
    dailyCarbsG: Number,
    dailyFatG: Number,
    waterLiters: Number,
    meals: { type: [mealSchema], default: [] },
    isTemplate: { type: Boolean, default: false },
    isAiGenerated: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true }
);

dietPlanSchema.index({ gymId: 1, memberId: 1 });
dietPlanSchema.index({ trainerId: 1 });
dietPlanSchema.index({ gymId: 1, isTemplate: 1 });

export const DietPlan = mongoose.model<IDietPlan, IDietPlanModel>('DietPlan', dietPlanSchema);
