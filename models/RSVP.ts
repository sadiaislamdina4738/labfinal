import mongoose, { Schema, Document, Types } from 'mongoose';
import type { RSVPStatus } from '@/types';

export interface RSVPDocument extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  status: RSVPStatus;
  waitlistPosition?: number;
  joinedFromInviteCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const rsvpSchema = new Schema<RSVPDocument>(
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
    status: {
      type: String,
      enum: ['going', 'interested', 'declined'],
      required: true,
    },
    waitlistPosition: {
      type: Number,
    },
    joinedFromInviteCode: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate RSVPs
rsvpSchema.index({ userId: 1, eventId: 1 }, { unique: true });
rsvpSchema.index({ eventId: 1, status: 1 });
rsvpSchema.index({ userId: 1 });

export const RSVP = mongoose.models.RSVP || mongoose.model<RSVPDocument>('RSVP', rsvpSchema);
