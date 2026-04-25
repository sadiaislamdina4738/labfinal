import mongoose, { Schema, Document, Types } from 'mongoose';
import type { IUser, UserRole } from '@/types';

export interface UserDocument extends Omit<IUser, '_id'>, Document {
  _id: Types.ObjectId;
}

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
    },
    role: {
      type: String,
      enum: ['attendee', 'organizer', 'vendor', 'admin'],
      default: 'attendee',
    },
    avatarUrl: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    interests: {
      type: [String],
      default: [],
    },
    notificationPreferences: {
      emailReminders: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      eventUpdates: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Note: email unique index is already created by `unique: true` on the field above

export const User = mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);
