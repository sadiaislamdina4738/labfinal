import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ICheckIn } from '@/types';

export interface CheckInDocument extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  checkedInAt: Date;
  checkedInBy?: Types.ObjectId;
  source: 'qr' | 'manual';
}

const checkInSchema = new Schema<CheckInDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    } as any,
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    } as any,
    checkedInAt: {
      type: Date,
      default: Date.now,
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    } as any,
    source: {
      type: String,
      enum: ['qr', 'manual'],
      default: 'qr',
    },
  },
  { timestamps: false }
);

// Compound index to prevent duplicate check-ins
checkInSchema.index({ userId: 1, eventId: 1 }, { unique: true });
checkInSchema.index({ eventId: 1, checkedInAt: -1 });

export const CheckIn = mongoose.models.CheckIn || mongoose.model<CheckInDocument>('CheckIn', checkInSchema);
