/* eslint-disable */
// @ts-nocheck
/**
 * EventEase Seed Script
 * Run: npm run seed
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in environment');
  process.exit(1);
}

// ─── Inline Mongoose Models ──────────────────────────────────────────────────

const UserModel = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  role: { type: String, enum: ['attendee', 'organizer', 'vendor', 'admin'], default: 'attendee' },
  bio: String,
  interests: [String],
  notificationPreferences: {
    emailReminders: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    eventUpdates: { type: Boolean, default: true },
  },
}, { timestamps: true }));

const EventModel = mongoose.models.EventEase || mongoose.model('Event', new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true, lowercase: true },
  description: String,
  category: String,
  startDateTime: Date,
  endDateTime: Date,
  venueName: String,
  venueAddress: String,
  area: String,
  tags: [String],
  organizerId: mongoose.Schema.Types.ObjectId,
  capacity: Number,
  visibility: { type: String, default: 'public' },
  status: { type: String, default: 'published' },
  qrToken: { type: String, sparse: true },
  viewsCount: { type: Number, default: 0 },
  goingCount: { type: Number, default: 0 },
  interestedCount: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  trendingScore: { type: Number, default: 0 },
}, { timestamps: true }));

const RSVPModel = mongoose.models.RSVP || mongoose.model('RSVP', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  eventId: mongoose.Schema.Types.ObjectId,
  status: String,
  waitlistPosition: Number,
}, { timestamps: true }));

const CheckInModel = mongoose.models.CheckIn || mongoose.model('CheckIn', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  eventId: mongoose.Schema.Types.ObjectId,
  checkedInAt: { type: Date, default: Date.now },
  checkedInBy: mongoose.Schema.Types.ObjectId,
  source: { type: String, default: 'manual' },
}));

const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', new mongoose.Schema({
  recipientId: mongoose.Schema.Types.ObjectId,
  eventId: mongoose.Schema.Types.ObjectId,
  type: String,
  title: String,
  message: String,
  priority: { type: String, default: 'medium' },
  read: { type: Boolean, default: false },
}, { timestamps: true }));

const ReviewModel = mongoose.models.Review || mongoose.model('Review', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  eventId: mongoose.Schema.Types.ObjectId,
  rating: Number,
  comment: String,
}, { timestamps: true }));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function seed() {
  console.log('\n🌱 EventEase Seed Script Starting...');
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('✓ Connected to MongoDB Atlas\n');

  // ── Clean old seed data ───────────────────────────────────────────────────
  console.log('Cleaning existing seed data...');
  const seedEmails = ['admin@eventease.com','organizer@eventease.com','alice@eventease.com','bob@eventease.com','vendor@eventease.com'];
  const existingUsers = await UserModel.find({ email: { $in: seedEmails } }).lean();
  const existingUserIds = existingUsers.map(u => u._id);
  
  if (existingUserIds.length > 0) {
    const existingEvents = await EventModel.find({ organizerId: { $in: existingUserIds } }).lean();
    const existingEventIds = existingEvents.map(e => e._id);
    await RSVPModel.deleteMany({ eventId: { $in: existingEventIds } });
    await CheckInModel.deleteMany({ eventId: { $in: existingEventIds } });
    await NotificationModel.deleteMany({ recipientId: { $in: existingUserIds } });
    await ReviewModel.deleteMany({ eventId: { $in: existingEventIds } });
    await EventModel.deleteMany({ _id: { $in: existingEventIds } });
    await UserModel.deleteMany({ email: { $in: seedEmails } });
  }
  console.log('✓ Cleaned old seed data\n');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Create Users ──────────────────────────────────────────────────────────
  console.log('Creating users...');

  const admin = await UserModel.create({
    name: 'Admin User', email: 'admin@eventease.com', passwordHash,
    role: 'admin', bio: 'Platform administrator', interests: ['tech', 'business'],
  });

  const organizer = await UserModel.create({
    name: 'Sarah Chen', email: 'organizer@eventease.com', passwordHash,
    role: 'organizer', bio: 'Event organizer specializing in tech and music events',
    interests: ['tech', 'music', 'arts'],
  });

  const alice = await UserModel.create({
    name: 'Alice Johnson', email: 'alice@eventease.com', passwordHash,
    role: 'attendee', bio: 'Tech enthusiast and music lover',
    interests: ['tech', 'music', 'food'],
  });

  const bob = await UserModel.create({
    name: 'Bob Martinez', email: 'bob@eventease.com', passwordHash,
    role: 'attendee', bio: 'Sports and business professional',
    interests: ['sports', 'business', 'community'],
  });

  const vendor = await UserModel.create({
    name: 'Vendor Co.', email: 'vendor@eventease.com', passwordHash,
    role: 'vendor', bio: 'Event services and catering provider',
    interests: ['food', 'business'],
  });

  console.log('✓ Created 5 users\n');

  // ── Create Events ─────────────────────────────────────────────────────────
  console.log('Creating events...');
  const ts = Date.now();

  const techConference = await EventModel.create({
    title: 'Tech Summit 2026',
    slug: `tech-summit-2026-${ts}`,
    description: 'Join the most exciting tech conference of 2026! Featuring keynotes from industry leaders, hands-on workshops, networking sessions, and demos from cutting-edge startups.\n\nHighlights:\n• Keynote speakers from top tech companies\n• 10+ workshops on AI, cloud, and web3\n• Startup pitch competition with $10K prize\n• Networking lunch and afterparty',
    category: 'tech',
    startDateTime: daysFromNow(14),
    endDateTime: new Date(daysFromNow(14).getTime() + 8 * 3600000),
    venueName: 'Dhaka Tech Hub', venueAddress: '42 Gulshan Avenue, Dhaka', area: 'Gulshan',
    tags: ['conference', 'networking', 'AI', 'startups'],
    organizerId: organizer._id, capacity: 200,
    visibility: 'public', status: 'published', qrToken: randomUUID(),
    viewsCount: 342, goingCount: 1, interestedCount: 1, trendingScore: 88,
  });

  const musicFest = await EventModel.create({
    title: 'Dhaka Music Festival',
    slug: `dhaka-music-festival-${ts}`,
    description: 'The biggest outdoor music festival in Dhaka returns! Three stages, 20+ bands, food stalls, and an amazing vibe for music lovers.\n\nLineup:\n• Main Stage: 8 headline acts\n• Indie Stage: 8 artists\n• Acoustic Lounge: 6 intimate sessions\n• World Food Court',
    category: 'music',
    startDateTime: daysFromNow(21),
    endDateTime: new Date(daysFromNow(22).getTime() + 6 * 3600000),
    venueName: 'Bashundhara Open Ground', venueAddress: 'Bashundhara City, Dhaka', area: 'Bashundhara',
    tags: ['festival', 'live-music', 'outdoor', 'food'],
    organizerId: organizer._id, capacity: 500,
    visibility: 'public', status: 'published', qrToken: randomUUID(),
    viewsCount: 891, goingCount: 1, interestedCount: 1, trendingScore: 133,
  });

  const startupPitch = await EventModel.create({
    title: 'Startup Pitch Night',
    slug: `startup-pitch-night-${ts}`,
    description: 'An exclusive evening where 10 pre-selected startups pitch to a panel of top VCs and angel investors. Seating is extremely limited!\n\nFormat:\n• 5-minute pitch per company\n• 3-minute Q&A with panel\n• Networking reception\n• Best Pitch Award: $5,000',
    category: 'business',
    startDateTime: daysFromNow(7),
    endDateTime: new Date(daysFromNow(7).getTime() + 4 * 3600000),
    venueName: 'Startup Bangladesh HQ', venueAddress: 'Panthapath, Dhaka', area: 'Panthapath',
    tags: ['startup', 'pitch', 'investor', 'networking'],
    organizerId: organizer._id, capacity: 3, // Small cap to demo waitlist
    visibility: 'public', status: 'published', qrToken: randomUUID(),
    viewsCount: 215, goingCount: 3, interestedCount: 0, trendingScore: 69,
  });

  const pastEvent = await EventModel.create({
    title: 'Community Food Fest 2025',
    slug: `community-food-fest-2025-${ts}`,
    description: 'A beloved community event celebrating local cuisine and culture. Our annual food festival brought together 50+ local vendors, cooking demonstrations, and cultural performances.',
    category: 'food',
    startDateTime: daysFromNow(-30),
    endDateTime: new Date(daysFromNow(-30).getTime() + 8 * 3600000),
    venueName: 'Ramna Park', venueAddress: 'Ramna, Dhaka', area: 'Ramna',
    tags: ['food', 'community', 'culture', 'outdoor'],
    organizerId: organizer._id, capacity: 100,
    visibility: 'public', status: 'completed', qrToken: randomUUID(),
    viewsCount: 1240, goingCount: 2, interestedCount: 0, averageRating: 4.5, trendingScore: 41,
  });

  console.log('✓ Created 4 events\n');

  // ── Create RSVPs ──────────────────────────────────────────────────────────
  console.log('Creating RSVPs...');

  await RSVPModel.create({ userId: alice._id, eventId: techConference._id, status: 'going' });
  await RSVPModel.create({ userId: bob._id, eventId: techConference._id, status: 'interested' });
  await RSVPModel.create({ userId: alice._id, eventId: musicFest._id, status: 'interested' });
  await RSVPModel.create({ userId: bob._id, eventId: musicFest._id, status: 'going' });
  // Startup Pitch: full capacity + waitlist
  await RSVPModel.create({ userId: alice._id, eventId: startupPitch._id, status: 'going' });
  await RSVPModel.create({ userId: bob._id, eventId: startupPitch._id, status: 'going' });
  await RSVPModel.create({ userId: admin._id, eventId: startupPitch._id, status: 'going' });
  await RSVPModel.create({ userId: vendor._id, eventId: startupPitch._id, status: 'going', waitlistPosition: 1 });
  // Past event
  await RSVPModel.create({ userId: alice._id, eventId: pastEvent._id, status: 'going' });
  await RSVPModel.create({ userId: bob._id, eventId: pastEvent._id, status: 'going' });

  console.log('✓ Created RSVPs (startup pitch is full with 1 user on waitlist)\n');

  // ── Create Check-ins ──────────────────────────────────────────────────────
  console.log('Creating check-ins for past event...');
  const checkInBase = new Date(daysFromNow(-30).getTime() + 3600000);
  await CheckInModel.create({ userId: alice._id, eventId: pastEvent._id, checkedInAt: checkInBase, checkedInBy: organizer._id, source: 'qr' });
  await CheckInModel.create({ userId: bob._id, eventId: pastEvent._id, checkedInAt: new Date(checkInBase.getTime() + 600000), checkedInBy: organizer._id, source: 'manual' });
  console.log('✓ Created 2 check-ins\n');

  // ── Create Reviews ────────────────────────────────────────────────────────
  console.log('Creating reviews for past event...');
  await ReviewModel.create({ userId: alice._id, eventId: pastEvent._id, rating: 5, comment: 'Amazing event! The food variety was incredible and the atmosphere was wonderful. Will definitely come back next year!' });
  await ReviewModel.create({ userId: bob._id, eventId: pastEvent._id, rating: 4, comment: 'Great community event. Good food selection, enjoyed the cultural performances. A bit crowded near the main stage.' });
  console.log('✓ Created 2 reviews\n');

  // ── Create Notifications ──────────────────────────────────────────────────
  console.log('Creating notifications...');
  await NotificationModel.create({ recipientId: alice._id, eventId: techConference._id, type: 'event_reminder', title: '🔔 Reminder: Tech Summit 2026 in 2 weeks', message: 'Tech Summit 2026 is coming up! Make sure you have your QR code ready for check-in.', priority: 'high', read: false });
  await NotificationModel.create({ recipientId: organizer._id, eventId: techConference._id, type: 'rsvp_response', title: 'New RSVP: Tech Summit 2026', message: 'Alice Johnson is going to your event.', priority: 'low', read: false });
  await NotificationModel.create({ recipientId: vendor._id, eventId: startupPitch._id, type: 'rsvp_response', title: "⏳ You're on the waitlist!", message: "You've been added to the waitlist for Startup Pitch Night at position #1. We'll notify you if a spot opens.", priority: 'medium', read: false });
  await NotificationModel.create({ recipientId: bob._id, eventId: pastEvent._id, type: 'event_update', title: '📝 Community Food Fest 2025 — Leave a Review', message: "You attended Community Food Fest 2025! We'd love to hear your feedback.", priority: 'low', read: true });
  console.log('✓ Created 4 notifications\n');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅  SEED COMPLETE — EventEase Demo Data Ready');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Test Accounts (all passwords: password123)');
  console.log('────────────────────────────────────────────────');
  console.log('  Admin:     admin@eventease.com');
  console.log('  Organizer: organizer@eventease.com');
  console.log('  Attendee:  alice@eventease.com');
  console.log('  Attendee:  bob@eventease.com');
  console.log('  Vendor:    vendor@eventease.com');
  console.log('');
  console.log('Events');
  console.log('────────────────────────────────────────────────');
  console.log('  • Tech Summit 2026          (upcoming, cap 200)');
  console.log('  • Dhaka Music Festival      (upcoming, cap 500)');
  console.log('  • Startup Pitch Night       (upcoming, FULL — waitlist active)');
  console.log('  • Community Food Fest 2025  (completed, with check-ins & reviews)');
  console.log('');
  console.log('Visit: http://localhost:4000');
  console.log('═══════════════════════════════════════════════════════════════');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  mongoose.disconnect().finally(() => process.exit(1));
});
