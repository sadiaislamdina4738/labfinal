import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ReviewDocument extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate reviews per user-event
reviewSchema.index({ userId: 1, eventId: 1 }, { unique: true });
reviewSchema.index({ eventId: 1 });

export const Review = mongoose.models.Review || mongoose.model<ReviewDocument>('Review', reviewSchema);
