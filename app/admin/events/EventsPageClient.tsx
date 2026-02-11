'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Event } from '@/types/database'
import Loading from '@/components/Loading'
import ImagePreviewModal from '@/components/ImagePreviewModal'
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

const AdminImageUpload = dynamic(() => import('@/components/AdminImageUpload'), {
  ssr: false,
  loading: () => <div className="h-24 bg-gray-100 animate-pulse rounded" />
})

export default function EventsPageClient() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const response = await fetch('/api/events')
      const data = await response.json()
      // Sort events by start_time descending (most recent first)
      const sortedEvents = (data.events || []).sort((a: Event, b: Event) => {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      })
      setEvents(sortedEvents)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateEvent = async (eventData: Partial<Event>) => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })

      if (response.ok) {
        await loadData()
        setShowEventForm(false)
        setEditingEvent(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create event')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      alert('Failed to create event')
    }
  }

  const handleUpdateEvent = async (event: Event, updates: Partial<Event>) => {
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        await loadData()
        setEditingEvent(null)
        setShowEventForm(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update event')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Failed to update event')
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    }
  }

  if (loading) {
    return <Loading message="Loading events..." />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingEvent(null)
            setShowEventForm(true)
          }}
          className="bg-[#0d1e26] text-white px-4 py-2 rounded-md hover:bg-[#0a171c] text-sm w-full sm:w-auto"
        >
          Create Event
        </button>
      </div>
      <div className="space-y-4">
        {events.map((event) => {
          const startDate = new Date(event.start_time)
          const endDate = event.end_time ? new Date(event.end_time) : null
          return (
            <div key={event.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border-l-4 border-[#0d1e26]">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* Always render image container to maintain consistent layout */}
                  <div
                    className={`relative w-full sm:w-24 md:w-32 h-48 sm:h-24 md:h-32 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0 bg-gray-100 ${
                      event.image_url && event.image_url.trim() !== '' ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
                    }`}
                    onClick={() => event.image_url && event.image_url.trim() !== '' && setPreviewImageUrl(event.image_url)}
                  >
                    {event.image_url && event.image_url.trim() !== '' ? (
                      <Image
                        src={event.image_url}
                        alt={event.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 96px, 128px"
                        unoptimized // For signed URLs from private buckets
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
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
                    <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{event.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Date:</strong> {startDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Time:</strong> {startDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {endDate && ` - ${endDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}`}
                    </p>
                    {event.location && (
                      <p className="text-sm text-gray-600">
                        <strong>Location:</strong> {event.location}
                      </p>
                    )}
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => setEditingEvent(event)}
                    className="text-[#0d1e26] hover:text-[#0a171c] text-sm px-3 py-2 sm:px-0 sm:py-0 border border-[#0d1e26] sm:border-0 rounded-md sm:rounded-none hover:bg-[#0d1e26] hover:text-white sm:hover:bg-transparent sm:hover:text-[#0a171c] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="text-red-600 hover:text-red-900 text-sm px-3 py-2 sm:px-0 sm:py-0 border border-red-600 sm:border-0 rounded-md sm:rounded-none hover:bg-red-600 hover:text-white sm:hover:bg-transparent sm:hover:text-red-900 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {previewImageUrl && (
        <ImagePreviewModal
          images={[previewImageUrl]}
          currentIndex={0}
          onClose={() => setPreviewImageUrl(null)}
        />
      )}

      {(showEventForm || editingEvent) && (
        <Suspense fallback={<div className="fixed inset-0 bg-gray-600 bg-opacity-10 z-50 flex items-center justify-center"><Loading message="Loading form..." /></div>}>
          <EventFormModal
            event={editingEvent}
            onClose={() => {
              setShowEventForm(false)
              setEditingEvent(null)
            }}
            onSave={async (eventData) => {
              if (editingEvent) {
                await handleUpdateEvent(editingEvent, eventData)
              } else {
                await handleCreateEvent(eventData)
              }
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

function EventFormModal({
  event,
  onClose,
  onSave,
}: {
  event: Event | null
  onClose: () => void
  onSave: (eventData: Partial<Event>) => Promise<void>
}) {
  const [open, setOpen] = useState(true)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const formatDateTimeForInput = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    start_time: event ? formatDateTimeForInput(event.start_time) : '',
    end_time: event?.end_time ? formatDateTimeForInput(event.end_time) : '',
    image_url: event?.image_url || null,
    send_notifications: true, // Default to true for new events, not applicable for edits
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.start_time) {
      alert('Title and start time are required')
      return
    }
    
    // Handle image_url explicitly - preserve whatever is in formData (could be signed URL, storage path, or null)
    const submitData = {
      title: formData.title,
      description: formData.description || null,
      location: formData.location || null,
      start_time: formData.start_time ? new Date(formData.start_time).toISOString() : '',
      end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
      image_url: formData.image_url !== undefined && formData.image_url !== '' ? formData.image_url : null,
      send_notifications: event ? false : formData.send_notifications, // Only send notifications for new events
    }
    
    await onSave(submitData)
    setOpen(false)
    onClose()
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      onClose()
    }
  }

  const formContent = (
    <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
          rows={3}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Start Time *</label>
        <input
          type="datetime-local"
          value={formData.start_time}
          onChange={(e) => {
            const newStartTime = e.target.value
            // Auto-fill end time: start time + 1 hour
            let newEndTime = formData.end_time
            if (newStartTime) {
              const startDate = new Date(newStartTime)
              startDate.setHours(startDate.getHours() + 1)
              // Format for datetime-local input (YYYY-MM-DDTHH:mm)
              const year = startDate.getFullYear()
              const month = String(startDate.getMonth() + 1).padStart(2, '0')
              const day = String(startDate.getDate()).padStart(2, '0')
              const hours = String(startDate.getHours()).padStart(2, '0')
              const minutes = String(startDate.getMinutes()).padStart(2, '0')
              newEndTime = `${year}-${month}-${day}T${hours}:${minutes}`
            }
            setFormData({ ...formData, start_time: newStartTime, end_time: newEndTime })
          }}
          className="w-full px-3 py-2 border rounded-md"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">End Time</label>
        <input
          type="datetime-local"
          value={formData.end_time}
          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>
      <div>
        <Suspense fallback={<div className="h-24 bg-gray-100 animate-pulse rounded" />}>
          <AdminImageUpload
            currentImageUrl={formData.image_url}
            onImageChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
            uploadEndpoint="/api/events/upload-image"
            label="Upload Poster"
          />
        </Suspense>
      </div>
      {!event && (
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="send-notifications"
            checked={formData.send_notifications}
            onChange={(e) => setFormData({ ...formData, send_notifications: e.target.checked })}
            className="w-4 h-4 text-[#0d1e26] border-gray-300 rounded focus:ring-[#0d1e26]"
          />
          <label htmlFor="send-notifications" className="text-sm text-gray-700 cursor-pointer">
            Send email notifications to members
          </label>
        </div>
      )}
    </form>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="event-form"
              className="px-4 py-2 text-sm font-medium text-white bg-[#0d1e26] rounded-md hover:bg-[#0a171c]"
            >
              {event ? 'Update Event' : 'Create Event'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{event ? 'Edit Event' : 'Create Event'}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4">{formContent}</div>
        <DrawerFooter>
          <button
            type="submit"
            form="event-form"
            className="px-4 py-2 text-sm font-medium text-white bg-[#0d1e26] rounded-md hover:bg-[#0a171c]"
          >
            {event ? 'Update Event' : 'Create Event'}
          </button>
          <DrawerClose asChild>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
