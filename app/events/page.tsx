'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Event, EventRsvp } from '@/types/database'
import Loading from '@/components/Loading'
import ImagePreviewModal from '@/components/ImagePreviewModal'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const [rsvpsByEvent, setRsvpsByEvent] = useState<Record<string, EventRsvp[]>>({})
  const [expandedRsvpsEventId, setExpandedRsvpsEventId] = useState<string | null>(null)
  const [rsvpLoadingEventId, setRsvpLoadingEventId] = useState<string | null>(null)
  const [calendarLoadingEventId, setCalendarLoadingEventId] = useState<string | null>(null)
  const router = useRouter()
  const isMobile = !useMediaQuery('(min-width: 768px)')

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

  const loadEvents = useCallback(async () => {
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
  }, [router])

  const loadRsvps = useCallback(async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/rsvps`)
      if (response.ok) {
        const data = await response.json()
        setRsvpsByEvent((prev) => ({ ...prev, [eventId]: data.rsvps || [] }))
      }
    } catch (error) {
      console.error('Error loading RSVPs:', error)
    }
  }, [])

  const handleToggleRsvp = async (eventId: string, currentlyRsvped: boolean) => {
    setRsvpLoadingEventId(eventId)
    try {
      const url = `/api/events/${eventId}/rsvp`
      const response = currentlyRsvped
        ? await fetch(url, { method: 'DELETE' })
        : await fetch(url, { method: 'POST' })
      if (response.ok) {
        await loadEvents()
        if (rsvpsByEvent[eventId] !== undefined) {
          await loadRsvps(eventId)
        }
      } else {
        const data = await response.json().catch(() => ({}))
        alert(data.error || 'Something went wrong')
      }
    } catch (error) {
      console.error('Error toggling RSVP:', error)
      alert('Something went wrong')
    } finally {
      setRsvpLoadingEventId(null)
    }
  }

  const handleToggleRsvpsList = (eventId: string) => {
    if (expandedRsvpsEventId === eventId) {
      setExpandedRsvpsEventId(null)
      return
    }
    setExpandedRsvpsEventId(eventId)
    if (rsvpsByEvent[eventId] === undefined) {
      loadRsvps(eventId)
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

  const handleAddToCalendar = async (event: Event) => {
    setCalendarLoadingEventId(event.id)
    try {
      if (!event.user_rsvped) {
        const rsvpRes = await fetch(`/api/events/${event.id}/rsvp`, { method: 'POST' })
        if (rsvpRes.ok) {
          await loadEvents()
        }
      }
      const res = await fetch(`/api/events/${event.id}/ical`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Could not generate calendar file')
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Add to calendar failed:', err)
      alert('Could not add to calendar')
    } finally {
      setCalendarLoadingEventId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">TIPA Events</h1>
          </div>
          <div className="pt-16 sm:pt-24">
            <Loading message="Loading events..." />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">TIPA Events</h1>
        </div>

        {!events || events.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 sm:p-12 text-center">
            <p className="text-gray-600">No events scheduled.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedEvents.map((group) => (
              <div key={group.date} className="space-y-3">
                <h2
                  className={`text-lg font-semibold ${
                    group.isPast ? 'text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {group.dateLabel}
                </h2>
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden divide-y divide-gray-200">
                  {group.events.map((event) => {
                    const endDate = event.end_time ? new Date(event.end_time) : null

                    return (
                      <div key={event.id} className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Image */}
                          <div
                            className={`relative w-full sm:w-32 md:w-40 h-48 sm:h-32 md:h-40 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-100 ${
                              event.image_url ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
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
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg
                                  className="w-10 h-10 text-gray-400"
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
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                              {event.title}
                            </h3>
                            <div className="space-y-1.5 text-sm text-gray-600">
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
                                      <p className="mt-3 text-sm text-gray-700">{event.description}</p>
                                    )}
                                    {/* RSVP section */}
                                    <div className="mt-5">
                                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        {!group.isPast && (
                                          <>
                                            <button
                                              type="button"
                                              disabled={rsvpLoadingEventId === event.id}
                                              onClick={() =>
                                                handleToggleRsvp(event.id, !!event.user_rsvped)
                                              }
                                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                                                event.user_rsvped
                                                  ? 'bg-[#0d1e26]/10 text-[#0d1e26] border border-[#0d1e26]/20 hover:bg-[#0d1e26]/15'
                                                  : 'bg-[#0d1e26] text-white hover:bg-[#0a171c] shadow-sm'
                                              }`}
                                              title={event.user_rsvped ? 'Click to cancel' : 'RSVP to this event'}
                                            >
                                              {rsvpLoadingEventId === event.id ? (
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12s5.373 12 12 12v-4a8 8 0 01-8-8z" />
                                                </svg>
                                              ) : event.user_rsvped ? (
                                                <>
                                                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                  </svg>
                                                  You&apos;re going
                                                </>
                                              ) : (
                                                'RSVP'
                                              )}
                                            </button>
                                            <button
                                              type="button"
                                              disabled={calendarLoadingEventId === event.id}
                                              onClick={() => handleAddToCalendar(event)}
                                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
                                            >
                                              {calendarLoadingEventId === event.id ? (
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12s5.373 12 12 12v-4a8 8 0 01-8-8z" />
                                                </svg>
                                              ) : (
                                                <>
                                                  <svg className="w-4 h-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                  </svg>
                                                  Add to Calendar
                                                </>
                                              )}
                                            </button>
                                          </>
                                        )}
                                        {/* Attendance: dropdown list */}
                                        {(event.rsvp_count ?? 0) > 0 ? (
                                          <div className="relative">
                                            <button
                                              type="button"
                                              onClick={() => handleToggleRsvpsList(event.id)}
                                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                              aria-expanded={expandedRsvpsEventId === event.id}
                                              aria-haspopup="true"
                                            >
                                              <span className="font-medium text-[#0d1e26]">
                                                {event.rsvp_count} {event.rsvp_count === 1 ? 'person' : 'people'} attending
                                              </span>
                                              <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform ${expandedRsvpsEventId === event.id ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                              </svg>
                                            </button>
                                          </div>
                                        ) : !group.isPast ? (
                                          <span className="text-sm text-gray-500">No one has RSVPed yet</span>
                                        ) : null}
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

        {/* Desktop: attendee list in a modal */}
        <Dialog
          open={!isMobile && expandedRsvpsEventId !== null}
          onOpenChange={(open) => !open && setExpandedRsvpsEventId(null)}
        >
          <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-2 text-left shrink-0">
              <DialogTitle>
                {expandedRsvpsEventId
                  ? (events.find((e) => e.id === expandedRsvpsEventId)?.title ?? 'Event') + ' – Attendees'
                  : 'Attendees'}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-6">
              {expandedRsvpsEventId && (
                (rsvpsByEvent[expandedRsvpsEventId] ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500 flex items-center gap-2 py-4">
                    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12s5.373 12 12 12v-4a8 8 0 01-8-8z" />
                    </svg>
                    Loading…
                  </p>
                ) : (
                  <ul className="py-2">
                    {(rsvpsByEvent[expandedRsvpsEventId] ?? []).map((r) => (
                      <li key={r.id} className="flex items-center gap-3 py-3 text-sm text-gray-700 border-b border-gray-100 last:border-0">
                        {r.profile_picture_url ? (
                          <Image
                            src={r.profile_picture_url}
                            alt=""
                            width={40}
                            height={40}
                            className="rounded-full object-cover shrink-0"
                            unoptimized
                          />
                        ) : (
                          <span
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0d1e26]/10 text-[#0d1e26] text-sm font-semibold shrink-0"
                            aria-hidden
                          >
                            {(r.display_name || 'M').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="font-medium">{r.display_name}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile: attendee list in a bottom drawer */}
        <Drawer
          open={isMobile && expandedRsvpsEventId !== null}
          onOpenChange={(open) => !open && setExpandedRsvpsEventId(null)}
        >
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>
                {expandedRsvpsEventId
                  ? (events.find((e) => e.id === expandedRsvpsEventId)?.title ?? 'Event') + ' – Attendees'
                  : 'Attendees'}
              </DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 min-h-0 px-4 pb-6">
              {expandedRsvpsEventId && (
                (rsvpsByEvent[expandedRsvpsEventId] ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500 flex items-center gap-2 py-4">
                    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12s5.373 12 12 12v-4a8 8 0 01-8-8z" />
                    </svg>
                    Loading…
                  </p>
                ) : (
                  <ul className="py-2">
                    {(rsvpsByEvent[expandedRsvpsEventId] ?? []).map((r) => (
                      <li key={r.id} className="flex items-center gap-3 py-3 text-sm text-gray-700 border-b border-gray-100 last:border-0">
                        {r.profile_picture_url ? (
                          <Image
                            src={r.profile_picture_url}
                            alt=""
                            width={40}
                            height={40}
                            className="rounded-full object-cover shrink-0"
                            unoptimized
                          />
                        ) : (
                          <span
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0d1e26]/10 text-[#0d1e26] text-sm font-semibold shrink-0"
                            aria-hidden
                          >
                            {(r.display_name || 'M').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="font-medium">{r.display_name}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </DrawerContent>
        </Drawer>

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
