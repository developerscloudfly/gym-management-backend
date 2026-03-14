import mongoose, { Schema, Document, Model } from 'mongoose';

export type WorkoutGoal =
  | 'weight_loss'
  | 'muscle_gain'
  | 'endurance'
  | 'flexibility'
  | 'general_fitness'
  | 'strength'
  | 'sports_performance';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutStatus = 'active' | 'completed' | 'archived';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'rest';

interface IExercise {
  name: string;
  category?: 'strength' | 'cardio' | 'flexibility' | 'balance';
  sets?: number;
  reps?: string;
  weightKg?: number;
  durationMin?: number;
  restSeconds: number;
  notes: string;
  orderIndex: number;
}

interface IDay {
  day: DayOfWeek;
  isRestDay: boolean;
  focusArea?: string;
  exercises: IExercise[];
}

interface IWeek {
  weekNumber: number;
  days: IDay[];
}

export interface IWorkoutPlan extends Document {
  _id: mongoose.Types.ObjectId;
  gymId: mongoose.Types.ObjectId;
  trainerId?: mongoose.Types.ObjectId;
  memberId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  goal: WorkoutGoal;
  difficultyLevel: DifficultyLevel;
  durationWeeks: number;
  isTemplate: boolean;
  isAiGenerated: boolean;
  weeks: IWeek[];
  status: WorkoutStatus;
  startDate?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IWorkoutPlanModel extends Model<IWorkoutPlan> {}

const exerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true },
    category: { type: String, enum: ['strength', 'cardio', 'flexibility', 'balance'] },
    sets: Number,
    reps: String,
    weightKg: Number,
    durationMin: Number,
    restSeconds: { type: Number, default: 60 },
    notes: { type: String, default: '' },
    orderIndex: { type: Number, required: true },
  },
  { _id: false }
);

const daySchema = new Schema<IDay>(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'rest'],
      required: true,
    },
    isRestDay: { type: Boolean, default: false },
    focusArea: String,
    exercises: { type: [exerciseSchema], default: [] },
  },
  { _id: false }
);

const weekSchema = new Schema<IWeek>(
  {
    weekNumber: { type: Number, required: true },
    days: { type: [daySchema], required: true },
  },
  { _id: false }
);

const workoutPlanSchema = new Schema<IWorkoutPlan>(
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
    difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    durationWeeks: { type: Number, required: true, min: 1 },
    isTemplate: { type: Boolean, default: false },
    isAiGenerated: { type: Boolean, default: false },
    weeks: { type: [weekSchema], default: [] },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
    startDate: Date,
  },
  { timestamps: true }
);

workoutPlanSchema.index({ gymId: 1, memberId: 1 });
workoutPlanSchema.index({ trainerId: 1 });
workoutPlanSchema.index({ gymId: 1, isTemplate: 1 });
workoutPlanSchema.index({ memberId: 1, status: 1 });

export const WorkoutPlan = mongoose.model<IWorkoutPlan, IWorkoutPlanModel>(
  'WorkoutPlan',
  workoutPlanSchema
);
