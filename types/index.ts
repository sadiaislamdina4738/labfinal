export type UserRole = 'attendee' | 'organizer' | 'vendor' | 'admin';

export type EventCategory = 'tech' | 'music' | 'sports' | 'arts' | 'food' | 'business' | 'education' | 'community' | 'other';

export type EventVisibility = 'public' | 'private';

export type RSVPStatus = 'going' | 'interested' | 'declined';

export type NotificationType = 'event_reminder' | 'event_update' | 'rsvp_response' | 'new_review' | 'photo_approved' | 'announcement' | 'check_in_opened' | 'emergency_alert';

export type NotificationPriority = 'low' | 'medium' | 'high';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export type ReportTargetType = 'event' | 'user' | 'photo' | 'review' | 'comment';

// User types
export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  interests?: string[];
  notificationPreferences?: {
    emailReminders: boolean;
    pushNotifications: boolean;
    eventUpdates: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Event types
export interface IEvent {
  _id: string;
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
  organizerId: string;
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

// RSVP types
export interface IRSVP {
  _id: string;
  userId: string;
  eventId: string;
  status: RSVPStatus;
  waitlistPosition?: number;
  joinedFromInviteCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Check-in types
export interface ICheckIn {
  _id: string;
  userId: string;
  eventId: string;
  checkedInAt: Date;
  checkedInBy?: string;
  source: 'qr' | 'manual';
}

// Notification types
export interface INotification {
  _id: string;
  recipientId: string;
  eventId?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  createdAt: Date;
}

// Review types
export interface IReview {
  _id: string;
  userId: string;
  eventId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Photo submission types
export interface IPhotoSubmission {
  _id: string;
  userId: string;
  eventId: string;
  imageUrl: string;
  caption?: string;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Report types
export interface IReport {
  _id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  reviewedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Venue Layout types
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

export interface IVenueLayout {
  _id: string;
  organizerId: string;
  eventId?: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  items: VenueLayoutItem[];
  budgetEstimate: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Session types
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}
