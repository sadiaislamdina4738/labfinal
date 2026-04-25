import mongoose, { Schema, Document, Types } from 'mongoose';

export interface PhotoSubmissionDocument extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  imageUrl: string;
  caption?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const photoSubmissionSchema = new Schema<PhotoSubmissionDocument>(
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
    imageUrl: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      maxlength: 200,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    } as any,
  },
  { timestamps: true }
);

// Indexes for efficient queries
photoSubmissionSchema.index({ eventId: 1, approvalStatus: 1 });
photoSubmissionSchema.index({ userId: 1, eventId: 1 });

export const PhotoSubmission = mongoose.models.PhotoSubmission || mongoose.model<PhotoSubmissionDocument>('PhotoSubmission', photoSubmissionSchema);
