'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
}

interface ReviewData {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

interface ReviewSectionProps {
  eventSlug: string;
  eventTitle: string;
  organizerId: string;
  isAttending: boolean;
  eventEnded: boolean;
}

const StarRating = ({ rating, onChange, interactive = false }: { rating: number; onChange?: (r: number) => void; interactive?: boolean }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => interactive && onChange?.(star)}
          disabled={!interactive}
          className={`text-2xl transition ${
            star <= rating ? 'text-yellow-400' : 'text-neutral-300'
          } ${interactive ? 'cursor-pointer hover:text-yellow-300' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

export function ReviewSection({
  eventSlug,
  eventTitle,
  organizerId,
  isAttending,
  eventEnded,
}: ReviewSectionProps) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userReview, setUserReview] = useState<Review | null>(null);

  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  // Fetch reviews
  useEffect(() => {
    async function fetchReviews() {
      try {
        const response = await fetch(`/api/events/${eventSlug}/reviews`);
        const result = await response.json();
        if (result.success && result.data) {
          setData(result.data);
          // Check if current user has already reviewed
          const existing = result.data.reviews.find((r: Review) => r.user.name === currentUser.name);
          if (existing) {
            setUserReview(existing);
            setRating(existing.rating);
            setComment(existing.comment || '');
          }
        }
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [eventSlug, currentUser.name]);

  const handleSubmitReview = async () => {
    if (!token) {
      setError('You must be logged in to review');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventSlug}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });

      const result = await response.json();

      if (result.success) {
        setShowForm(false);
        setComment('');
        // Refresh reviews
        const reviewsResponse = await fetch(`/api/events/${eventSlug}/reviews`);
        const refreshed = await reviewsResponse.json();
        if (refreshed.success && refreshed.data) {
          setData(refreshed.data);
          const existing = refreshed.data.reviews.find((r: Review) => r.user.name === currentUser.name);
          if (existing) {
            setUserReview(existing);
          }
        }
      } else {
        setError(result.message || 'Failed to submit review');
      }
    } catch (err) {
      setError('Failed to submit review');
      console.error('Review submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">⭐ Reviews</h2>
        <div className="h-40 bg-neutral-100 rounded-xl animate-pulse" />
      </section>
    );
  }

  return (
    <section className="py-12 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">⭐ Reviews</h2>
        {data && (
          <p className="text-neutral-600">
            {data.totalReviews === 0
              ? 'No reviews yet'
              : `${data.totalReviews} review${data.totalReviews !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {data && (
        <>
          {/* Rating Summary */}
          {data.totalReviews > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary">{data.averageRating.toFixed(1)}</div>
                  <StarRating rating={Math.round(data.averageRating)} />
                  <p className="text-xs text-neutral-500 mt-2">{data.totalReviews} reviews</p>
                </div>

                {/* Rating Distribution */}
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = data.ratingDistribution[star] || 0;
                    const percentage = data.totalReviews > 0 ? (count / data.totalReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="w-10 text-right">{star}★</span>
                        <div className="flex-1 bg-neutral-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-yellow-400 h-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-10 text-neutral-600">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Review Form */}
          {isAttending && eventEnded && !userReview && (
            <Card className="p-6 border-primary/30 bg-primary/5">
              {!showForm ? (
                <Button onClick={() => setShowForm(true)} variant="primary" size="sm">
                  ✍️ Write a Review
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Rating</label>
                    <StarRating rating={rating} onChange={setRating} interactive={true} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Your Comment (optional)</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="What did you think about this event?"
                      maxLength={500}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      rows={4}
                    />
                    <p className="text-xs text-neutral-500 mt-1">{comment.length}/500</p>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <div className="flex gap-2">
                    <Button onClick={handleSubmitReview} variant="primary" size="sm" disabled={submitting}>
                      {submitting ? '⏳ Posting...' : '✓ Post Review'}
                    </Button>
                    <Button onClick={() => setShowForm(false)} variant="outline" size="sm" disabled={submitting}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Your Review (if already reviewed) */}
          {userReview && (
            <Card className="p-6 border-primary/30 bg-primary/5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">Your Review</h3>
                <StarRating rating={userReview.rating} />
              </div>
              {userReview.comment && (
                <p className="text-sm text-neutral-700 mb-2">{userReview.comment}</p>
              )}
              <p className="text-xs text-neutral-500">
                {formatDistanceToNow(new Date(userReview.createdAt), { addSuffix: true })}
              </p>
            </Card>
          )}

          {/* Reviews List */}
          {data.reviews.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">All Reviews</h3>
              {data.reviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                        {review.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{review.user.name}</p>
                        <p className="text-xs text-neutral-500">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-neutral-700 leading-relaxed">{review.comment}</p>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Gate for non-attendees */}
          {!isAttending && !eventEnded && (
            <Card className="p-6 text-center bg-neutral-50">
              <p className="text-neutral-600">🔒 Attend this event to leave a review</p>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
