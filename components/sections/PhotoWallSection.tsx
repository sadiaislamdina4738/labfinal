'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Photo {
  id: string;
  imageUrl: string;
  caption?: string;
  uploader: {
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

interface PendingPhoto {
  id: string;
  imageUrl: string;
  caption?: string;
  approvalStatus: string;
}

interface PhotoWallSectionProps {
  eventSlug: string;
  eventEnded: boolean;
  isAttending: boolean;
  isOrganizer: boolean;
}

export function PhotoWallSection({
  eventSlug,
  eventEnded,
  isAttending,
  isOrganizer,
}: PhotoWallSectionProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  // Fetch approved photos
  useEffect(() => {
    async function fetchPhotos() {
      try {
        const response = await fetch(`/api/events/${eventSlug}/photos`);
        const result = await response.json();
        if (result.success && result.data) {
          setPhotos(result.data.photos);
        }
      } catch (err) {
        console.error('Failed to fetch photos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, [eventSlug]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !token) {
      setError('File and authentication required');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const reader = new FileReader();

      await new Promise<void>((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const base64 = (e.target?.result as string).split(',')[1];

            const response = await fetch(`/api/events/${eventSlug}/photos`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                imageBase64: base64,
                caption: caption || '',
              }),
            });

            const result = await response.json();
            console.log('Upload response:', { success: result.success, message: result.message, status: response.status });

            if (result.success) {
              const newPhoto = {
                id: result.data.id,
                imageUrl: result.data.imageUrl,
                caption,
                approvalStatus: 'pending',
              };
              console.log('Adding pending photo:', newPhoto);
              setPendingPhotos((prev) => [...prev, newPhoto]);
              setSelectedFile(null);
              setCaption('');
              setSuccess('✅ Photo uploaded! Waiting for organizer approval.');
              setTimeout(() => setSuccess(null), 5000);
              resolve();
            } else {
              const errorMsg = result.message || 'Failed to upload photo';
              console.error('Upload failed:', errorMsg);
              setError(errorMsg);
              reject(new Error(errorMsg));
            }
          } catch (err) {
            setError('Failed to upload photo');
            reject(err);
          }
        };

        reader.onerror = () => {
          setError('Failed to read file');
          reject(new Error('File read error'));
        };

        reader.readAsDataURL(selectedFile);
      });
    } catch (err) {
      if (err instanceof Error && err.message !== 'Failed to upload photo') {
        setError('Failed to upload photo');
      }
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleApprovePhoto = async (photoId: string) => {
    if (!token) return;

    setApprovingId(photoId);
    try {
      const response = await fetch(`/api/events/${eventSlug}/photos/${photoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approvalStatus: 'approved' }),
      });

      const result = await response.json();

      if (result.success) {
        // Move from pending to approved
        const photo = pendingPhotos.find((p) => p.id === photoId);
        if (photo) {
          setPendingPhotos(pendingPhotos.filter((p) => p.id !== photoId));
          setPhotos([
            ...photos,
            {
              ...photo,
              uploader: { name: 'User' },
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } else {
        setError(result.message || 'Failed to approve photo');
      }
    } catch (err) {
      setError('Failed to approve photo');
      console.error('Approval error:', err);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectPhoto = async (photoId: string) => {
    if (!token) return;

    setApprovingId(photoId);
    try {
      const response = await fetch(`/api/events/${eventSlug}/photos/${photoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approvalStatus: 'rejected' }),
      });

      if (response.ok) {
        setPendingPhotos(pendingPhotos.filter((p) => p.id !== photoId));
      } else {
        setError('Failed to reject photo');
      }
    } catch (err) {
      setError('Failed to reject photo');
      console.error('Rejection error:', err);
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">📸 Photo Wall</h2>
        <div className="h-40 bg-neutral-100 rounded-xl animate-pulse" />
      </section>
    );
  }

  return (
    <section className="py-12 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">📸 Photo Wall</h2>
        <p className="text-neutral-600">Memories from {eventSlug}</p>
      </div>

      {/* Upload Section */}
      {isAttending && eventEnded ? (
        <Card className="p-6 border-primary/30 bg-primary/5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Upload Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1">Max 3 photos per person. Max 10MB each.</p>
            </div>

            {selectedFile && (
              <div>
                <label className="block text-sm font-medium mb-2">Photo Caption (optional)</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                  placeholder="Add a caption to your photo..."
                  maxLength={200}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none"
                  rows={2}
                />
                <p className="text-xs text-neutral-500 mt-1">{caption.length}/200</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                ❌ {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            {selectedFile && (
              <Button onClick={handleUpload} variant="primary" disabled={uploading}>
                {uploading ? '⏳ Uploading...' : '✓ Upload Photo'}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        !isAttending && (
          <Card className="p-6 bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800">
              ⚠️ Only attendees can upload photos after the event ends.
            </p>
          </Card>
        )
      )}

      {/* Pending Photos (Organizer Only) */}
      {isOrganizer && pendingPhotos.length > 0 && (
        <Card className="p-6 border-amber-200 bg-amber-50">
          <h3 className="font-semibold mb-4">⏳ Pending Approval ({pendingPhotos.length})</h3>
          <div className="space-y-4">
            {pendingPhotos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-lg p-3 space-y-2">
                <img
                  src={photo.imageUrl}
                  alt="Pending photo"
                  className="w-full h-32 object-cover rounded-lg"
                />
                {photo.caption && <p className="text-sm text-neutral-700">{photo.caption}</p>}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprovePhoto(photo.id)}
                    variant="primary"
                    size="sm"
                    disabled={approvingId === photo.id}
                  >
                    ✓ Approve
                  </Button>
                  <Button
                    onClick={() => handleRejectPhoto(photo.id)}
                    variant="outline"
                    size="sm"
                    disabled={approvingId === photo.id}
                  >
                    ✕ Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Photo Gallery */}
      {photos.length > 0 ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
              <img
                src={photo.imageUrl}
                alt={photo.caption || 'Event photo'}
                className="w-full h-48 object-cover"
              />
              <div className="p-3">
                {photo.caption && (
                  <p className="text-xs text-neutral-700 mb-2 line-clamp-2">{photo.caption}</p>
                )}
                <p className="text-xs text-neutral-500">by {photo.uploader.name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-neutral-600">No photos yet. Be the first to share! 📸</p>
        </Card>
      )}
    </section>
  );
}
