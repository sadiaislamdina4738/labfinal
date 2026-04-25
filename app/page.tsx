'use client';

import TrendingSection from '@/components/events/TrendingSection';
import { RecommendationsSection } from '@/components/sections/RecommendationsSection';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="section-spacing">
        <div className="container-max text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Discover and manage <span className="text-gradient">events effortlessly</span>
          </h1>
          <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
            From RSVPs to check-in, smart reminders to AI recaps—EventEase makes hosting and attending events seamless.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a href="/register" className="px-8 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition inline-block text-center">
              Create Event
            </a>
            <a href="/events" className="px-8 py-3 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50 transition inline-block text-center">
              Browse Events
            </a>
          </div>

          {/* Hero Preview Card */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-neutral-soft border border-neutral-200 rounded-2xl p-8 shadow-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary">5K+</div>
                  <div className="text-sm text-neutral-600 mt-1">Events Created</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">50K+</div>
                  <div className="text-sm text-neutral-600 mt-1">Active Users</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">99%</div>
                  <div className="text-sm text-neutral-600 mt-1">Check-in Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔥 Trending Events Section */}
      <TrendingSection />

      {/* ✨ Personalized Recommendations (requires login) */}
      <section className="section-spacing bg-neutral-soft">
        <div className="container-max">
          <RecommendationsSection title="Personalized for You" limit={4} />
          <div className="text-center mt-8">
            <a href="/login" className="text-primary font-medium hover:underline">
              Sign in to see recommendations →
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-spacing bg-neutral-soft">
        <div className="container-max">
          <h2 className="text-4xl font-bold text-center mb-12">Powerful features for every organizer</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Smart RSVP', desc: 'Browse events and RSVP in one click — waitlist auto-fills if a spot opens', href: '/events', icon: '✅' },
              { title: 'QR Sharing & Check-in', desc: 'Organizers track attendance live with real-time check-in dashboard', href: '/organizer/events', icon: '📱' },
              { title: 'AI Features', desc: 'Generate AI-powered post-event recaps with analytics and attendee highlights', href: '/organizer/events', icon: '✨' },
              { title: 'Calendar & Scheduling', desc: 'Export your upcoming events to your calendar and set smart reminders', href: '/dashboard/my-events', icon: '📅' },
              { title: 'Smart Notifications', desc: 'Get notified for RSVPs, announcements, and event reminders', href: '/notifications', icon: '🔔' },
              { title: 'Event Discovery', desc: 'Find events by category, date, or trending score — personalized for you', href: '/events', icon: '🔍' },
            ].map((feature) => (
              <a
                key={feature.title}
                href={feature.href}
                className="group bg-white p-8 rounded-xl border border-neutral-200 shadow-soft hover:shadow-md hover:border-primary/30 hover:-translate-y-1 transition-all duration-200 cursor-pointer block"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-neutral-600">{feature.desc}</p>
                <span className="inline-block mt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more →
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-spacing">
        <div className="container-max text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to host amazing events?</h2>
          <p className="text-lg text-neutral-600 mb-8">Join thousands of organizers building incredible communities.</p>
          <a href="/register" className="px-8 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition inline-block">
            Get Started Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 bg-neutral-50">
        <div className="container-max py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-lg font-bold text-gradient mb-4">EventEase</div>
              <p className="text-sm text-neutral-600">Making events easier, better, and more connected.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li><a href="#" className="hover:text-neutral-900 transition">Features</a></li>
                <li><a href="#" className="hover:text-neutral-900 transition">Pricing</a></li>
                <li><a href="#" className="hover:text-neutral-900 transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li><a href="#" className="hover:text-neutral-900 transition">About</a></li>
                <li><a href="#" className="hover:text-neutral-900 transition">Blog</a></li>
                <li><a href="#" className="hover:text-neutral-900 transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li><a href="#" className="hover:text-neutral-900 transition">Privacy</a></li>
                <li><a href="#" className="hover:text-neutral-900 transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-200 pt-8 text-center text-sm text-neutral-600">
            <p>&copy; 2026 EventEase. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
