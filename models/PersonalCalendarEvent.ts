import mongoose, { Schema, Document, Types } from 'mongoose';

export interface PersonalCalendarEventDocument extends Document {
  userId: Types.ObjectId;
  title: string;
  notes?: string;
  startDateTime: Date;
  endDateTime: Date;
  allDay: boolean;
  createdAt: Date;
}

const personalCalendarEventSchema = new Schema<PersonalCalendarEventDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    } as any,
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: '' },
    startDateTime: { type: Date, required: true, index: true },
    endDateTime: { type: Date, required: true, index: true },
    allDay: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

personalCalendarEventSchema.index({ userId: 1, startDateTime: 1 });

export const PersonalCalendarEvent =
  mongoose.models.PersonalCalendarEvent ||
  mongoose.model<PersonalCalendarEventDocument>('PersonalCalendarEvent', personalCalendarEventSchema);

