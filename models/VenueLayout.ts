import mongoose, { Schema, Document, Types } from 'mongoose';

export interface VenueLayoutItem {
  id: string;
  type: 'table_round' | 'table_rect' | 'chair' | 'stage' | 'bar' | 'dance_floor' | 'plant' | 'custom_text';
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
}

export interface VenueLayoutDocument extends Document {
  organizerId: Types.ObjectId;
  eventId?: Types.ObjectId;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  items: VenueLayoutItem[];
  budgetEstimate: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const venueLayoutSchema = new Schema<VenueLayoutDocument>(
  {
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    } as any,
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
    } as any,
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    canvasWidth: {
      type: Number,
      default: 800,
    },
    canvasHeight: {
      type: Number,
      default: 600,
    },
    items: [
      {
        id: String,
        type: {
          type: String,
          enum: ['table_round', 'table_rect', 'chair', 'stage', 'bar', 'dance_floor', 'plant', 'custom_text'],
        },
        x: Number,
        y: Number,
        width: Number,
        height: Number,
        label: String,
        color: String,
      },
    ],
    budgetEstimate: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes
venueLayoutSchema.index({ organizerId: 1 });
venueLayoutSchema.index({ eventId: 1 });

export const VenueLayout = mongoose.models.VenueLayout || mongoose.model<VenueLayoutDocument>('VenueLayout', venueLayoutSchema);
