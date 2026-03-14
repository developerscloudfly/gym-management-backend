import mongoose, { Document, Schema, Types } from 'mongoose';

export type AttendanceType = 'gym_checkin' | 'class';
export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface IAttendance extends Document {
  gymId: Types.ObjectId;
  memberId: Types.ObjectId;
  type: AttendanceType;
  classId?: Types.ObjectId;
  checkInTime: Date;
  checkOutTime?: Date;
  status: AttendanceStatus;
  notes?: string;
  markedBy?: Types.ObjectId;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['gym_checkin', 'class'],
      required: true,
    },
    classId: { type: Schema.Types.ObjectId, ref: 'GymClass' },
    checkInTime: { type: Date, required: true, default: Date.now },
    checkOutTime: { type: Date },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'present',
    },
    notes: { type: String, trim: true },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ gymId: 1, memberId: 1, checkInTime: -1 });
attendanceSchema.index({ gymId: 1, classId: 1 });
attendanceSchema.index({ gymId: 1, checkInTime: -1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
