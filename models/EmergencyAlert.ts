import mongoose, { Schema, Document, Types } from 'mongoose';

export interface EmergencyAlertDocument extends Document {
  eventId: Types.ObjectId;
  organizerId: Types.ObjectId;
  title: string;
  message: string;
  alertType: 'venue_change' | 'weather' | 'safety' | 'cancellation' | 'other';
  sentAt: Date;
  recipientCount: number;
  createdAt: Date;
}

const emergencyAlertSchema = new Schema<EmergencyAlertDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    } as any,
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    } as any,
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    alertType: {
      type: String,
      enum: ['venue_change', 'weather', 'safety', 'cancellation', 'other'],
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

emergencyAlertSchema.index({ eventId: 1, createdAt: -1 });
emergencyAlertSchema.index({ organizerId: 1, createdAt: -1 });

export const EmergencyAlert = mongoose.models.EmergencyAlert || mongoose.model<EmergencyAlertDocument>('EmergencyAlert', emergencyAlertSchema);
