import mongoose, { Schema, Document, Types } from 'mongoose';

export interface EventReminderPreferenceDocument extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  reminderMinutes: number;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventReminderPreferenceSchema = new Schema<EventReminderPreferenceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    } as any,
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    } as any,
    reminderMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

eventReminderPreferenceSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export const EventReminderPreference =
  mongoose.models.EventReminderPreference ||
  mongoose.model<EventReminderPreferenceDocument>('EventReminderPreference', eventReminderPreferenceSchema);

