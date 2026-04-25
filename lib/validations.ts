import { z } from 'zod';

// Auth validations
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['attendee', 'organizer']).default('attendee'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Event validations
export const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  category: z.enum(['tech', 'music', 'sports', 'arts', 'food', 'business', 'education', 'community', 'other']),
  startDateTime: z.coerce.date().refine((date) => date > new Date(), 'Event must be in the future'),
  endDateTime: z.coerce.date(),
  venueName: z.string().min(2, 'Venue name is required'),
  venueAddress: z.string().min(5, 'Venue address is required'),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
  visibility: z.enum(['public', 'private']).default('public'),
  tags: z.array(z.string()).default([]),
}).refine((data) => data.endDateTime > data.startDateTime, {
  message: 'End time must be after start time',
  path: ['endDateTime'],
});

// RSVP validations
export const rsvpSchema = z.object({
  status: z.enum(['going', 'interested', 'declined']),
});

// Review validations
export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(500).optional(),
});

// Announcement validations
export const announcementSchema = z.object({
  title: z.string().min(2).max(200),
  message: z.string().min(5).max(1000),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type RSVPInput = z.infer<typeof rsvpSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type AnnouncementInput = z.infer<typeof announcementSchema>;
