import mongoose, { Document, Schema, Types } from 'mongoose';

export type ClassStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type RecurrenceType = 'none' | 'daily' | 'weekly';

export interface IClass extends Document {
  gymId: Types.ObjectId;
  trainerId: Types.ObjectId;
  name: string;
  description?: string;
  category?: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  enrolledCount: number;
  enrolledMembers: Types.ObjectId[];
  location?: string;
  status: ClassStatus;
  recurrence: RecurrenceType;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const classSchema = new Schema<IClass>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    trainerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1 },
    enrolledCount: { type: Number, default: 0, min: 0 },
    enrolledMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    location: { type: String, trim: true },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly'],
      default: 'none',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

classSchema.index({ gymId: 1, startTime: 1 });
classSchema.index({ gymId: 1, status: 1 });

export const GymClass = mongoose.model<IClass>('GymClass', classSchema);
