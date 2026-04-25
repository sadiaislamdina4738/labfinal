import mongoose, { Schema, Document, Types } from 'mongoose';
import type { EventCategory, EventVisibility } from '@/types';

export interface EventDocument extends Document {
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  coverImage?: string;
  startDateTime: Date;
  endDateTime: Date;
  venueName: string;
  venueAddress: string;
  area?: string;
  tags?: string[];
  organizerId: Types.ObjectId;
  capacity: number;
  visibility: EventVisibility;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  qrToken?: string;
  viewsCount: number;
  goingCount: number;
  interestedCount: number;
  averageRating: number;
  trendingScore: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<EventDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['tech', 'music', 'sports', 'arts', 'food', 'business', 'education', 'community', 'other'],
      required: true,
    },
    coverImage: {
      type: String,
    },
    startDateTime: {
      type: Date,
      required: true,
    },
    endDateTime: {
      type: Date,
      required: true,
    },
    venueName: {
      type: String,
      required: true,
    },
    venueAddress: {
      type: String,
      required: true,
    },
    area: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    } as any,
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
    },
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    goingCount: {
      type: Number,
      default: 0,
    },
    interestedCount: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    trendingScore: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes for common queries
eventSchema.index({ organizerId: 1 });
eventSchema.index({ startDateTime: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ visibility: 1, status: 1 });
// Note: slug unique index is already created by `unique: true` on the field above

export const Event = mongoose.models.Event || mongoose.model<EventDocument>('Event', eventSchema);
