'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Event } from '@/types/database'
import { generateICal } from '@/lib/resend'
import Loading from '@/components/Loading'
import ImagePreviewModal from '@/components/ImagePreviewModal'

type GroupedEvents = {
  date: string
  dateLabel: string
  events: Event[]
  isPast: boolean
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUserStatus()
    loadEvents()
  }, [])

  const checkUserStatus = async () => {
    try {
      const response = await fetch('/api/profile')
      if (!response.ok) {
        router.push('/login')
        return
      }

      const data = await response.json()
      const profile = data.profile

      if (profile && profile.status !== 'approved' && profile.role !== 'admin') {
        router.push('/pending-approval')
        return
      }
      
      // If rejected, stop loading and show error
      if (profile && profile.status === 'rejected') {
        setLoading(false)
        return
      }
    } catch (error) {
      console.error('Error checking user status:', error)
      router.push('/login')
    }
  }

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const eventDate = new Date(date)
    eventDate.setHours(0, 0, 0, 0)
    
    const diffTime = eventDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Tomorrow'
    } else if (diffDays === -1) {
      return 'Yesterday'
    } else if (diffDays < 0) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
  }

  const getDateKey = (dateString: string) => {
    const date = new Date(dateString)
    return date.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  const groupedEvents = useMemo(() => {
    const now = new Date()
    const groups = new Map<string, GroupedEvents>()

    events.forEach((event) => {
      const dateKey = getDateKey(event.start_time)
      const eventDate = new Date(event.start_time)
      eventDate.setHours(0, 0, 0, 0)
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const isPast = eventDate < today

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: dateKey,
          dateLabel: formatDateLabel(event.start_time),
          events: [],
          isPast,
        })
      }

      groups.get(dateKey)!.events.push(event)
    })

    // Sort events within each group by time
    groups.forEach((group) => {
      group.events.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    })

    // Sort groups chronologically: upcoming events first (earliest first), then past events (most recent first)
    return Array.from(groups.values()).sort((a, b) => {
      if (a.isPast !== b.isPast) {
        return a.isPast ? 1 : -1 // Upcoming events first
      }
      // Within same category (both past or both upcoming), sort chronologically
      return a.isPast 
        ? b.date.localeCompare(a.date) // Past events: most recent first
        : a.date.localeCompare(b.date) // Upcoming events: earliest first
    })
  }, [events])

  const downloadICal = (event: Event) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const icalContent = generateICal({
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.start_time,
      endTime: event.end_time,
      url: `${appUrl}/events`,
    })

    const blob = new Blob([icalContent], { type: 'text/calendar' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">TIPA Events</h1>
        </div>

        {!events || events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No events scheduled.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedEvents.map((group) => (
              <div key={group.date} className="space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <h2
                    className={`text-xl font-semibold ${
                      group.isPast ? 'text-gray-500' : 'text-gray-900'
                    }`}
                  >
                    {group.dateLabel}
                  </h2>
                </div>
                <div className="space-y-4">
                  {group.events.map((event) => {
                    const endDate = event.end_time ? new Date(event.end_time) : null

                    return (
                      <div
                        key={event.id}
                        className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${
                          group.isPast
                            ? 'border-gray-300 opacity-75'
                            : 'border-[#0d1e26]'
                        }`}
                      >
                        <div className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row gap-4">
                            {/* Image - Full width on mobile, fixed width on desktop */}
                            <div
                              className={`relative w-full sm:w-32 md:w-40 h-48 sm:h-32 md:h-40 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0 bg-gray-100 ${
                                event.image_url ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
                              }`}
                              onClick={() => event.image_url && setPreviewImageUrl(event.image_url)}
                            >
                              {event.image_url ? (
                                <Image
                                  src={event.image_url}
                                  alt={event.title}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 128px, 160px"
                                  unoptimized // For signed URLs from private buckets
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg
                                    className="w-12 h-12 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                                <div className="flex-1">
                                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                                    {event.title}
                                  </h3>
                                  <div className="space-y-2 text-sm sm:text-base text-gray-600">
                                    <p>
                                      <strong className="text-gray-900">Time:</strong>{' '}
                                      {formatTime(event.start_time)}
                                      {endDate && ` - ${formatTime(event.end_time!)}`}
                                    </p>
                                    {event.location && (
                                      <p>
                                        <strong className="text-gray-900">Location:</strong>{' '}
                                        {event.location}
                                      </p>
                                    )}
                                    {event.description && (
                                      <p className="mt-4 text-gray-700">{event.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-shrink-0">
                                  <button
                                    onClick={() => downloadICal(event)}
                                    className="w-full sm:w-auto px-4 py-2 bg-[#0d1e26] text-white rounded-md hover:bg-[#0a171c] text-sm font-medium transition-colors"
                                  >
                                    Add to Calendar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {previewImageUrl && (
          <ImagePreviewModal
            images={[previewImageUrl]}
            currentIndex={0}
            onClose={() => setPreviewImageUrl(null)}
          />
        )}
      </div>
    </div>
  )
}
