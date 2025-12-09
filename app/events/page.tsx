'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Event } from '@/types/database'
import { generateICal } from '@/lib/resend'

type GroupedEvents = {
  date: string
  dateLabel: string
  events: Event[]
  isPast: boolean
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadEvents()
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">TIPA Events</h1>
          <p className="mt-2 text-gray-600">
            Upcoming events and activities for the Toronto Island Pilots Association
          </p>
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
                        className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                          group.isPast
                            ? 'border-gray-300 opacity-75'
                            : 'border-[#0d1e26]'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                              {event.title}
                            </h3>
                            <div className="space-y-2 text-gray-600">
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
                          <div className="ml-6">
                            <button
                              onClick={() => downloadICal(event)}
                              className="px-4 py-2 bg-[#0d1e26] text-white rounded-md hover:bg-[#0a171c] text-sm font-medium"
                            >
                              Add to Calendar
                            </button>
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
      </div>
    </div>
  )
}
