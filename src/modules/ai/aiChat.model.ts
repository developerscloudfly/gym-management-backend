import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IAIChat extends Document {
  memberId: Types.ObjectId;
  gymId: Types.ObjectId;
  messages: IChatMessage[];
  isActive: boolean;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const aiChatSchema = new Schema<IAIChat>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    messages: { type: [chatMessageSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

aiChatSchema.index({ memberId: 1, gymId: 1 });

export const AIChat = mongoose.model<IAIChat>('AIChat', aiChatSchema);
