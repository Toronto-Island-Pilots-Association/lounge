'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { NotificationItem } from '@/app/api/notifications/route'

function formatNotificationTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function NotificationsClient() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=50')
      if (!res.ok) throw new Error('Failed to load notifications')
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAsReadAndGo = async (n: NotificationItem) => {
    const targetUrl = `/discussions/${n.thread_id}`
    if (n.read_at) {
      router.push(targetUrl)
      return
    }
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: n.thread_id }),
      })
      setNotifications((prev) =>
        prev.map((x) =>
          x.thread_id === n.thread_id ? { ...x, read_at: new Date().toISOString() } : x
        )
      )
      setUnreadCount((c) => Math.max(0, c - 1))
      router.push(targetUrl)
    } catch {
      router.push(targetUrl)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-8 text-center text-gray-500">Loading notifications…</div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-12 text-center">
          <p className="text-gray-600 mb-4">No notifications yet.</p>
          <Link
            href="/discussions"
            className="mt-4 inline-block text-[var(--color-primary)] font-medium hover:underline"
          >
            Go to Hangar Talk
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden divide-y divide-gray-200">
      {notifications.map((n) => {
        const actorName = n.actor?.full_name || 'Someone'
        const isUnread = !n.read_at
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => markAsReadAndGo(n)}
            className={`w-full text-left px-4 py-3 sm:px-6 sm:py-4 flex gap-3 hover:bg-gray-50 transition-colors ${isUnread ? 'bg-blue-50/50' : ''}`}
          >
            <div className="flex-shrink-0">
              {n.actor?.profile_picture_url ? (
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                  <Image
                    src={n.actor.profile_picture_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border border-gray-200">
                  <span className="text-gray-500 text-sm font-medium">
                    {actorName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{actorName}</span>{' '}
                {n.type === 'mention' ? 'mentioned you' : 'replied'} in{' '}
                <span className="font-medium">{n.thread_title || 'a discussion'}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{formatNotificationTime(n.created_at)}</p>
            </div>
            {isUnread && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[var(--color-primary)] mt-4" aria-hidden />
            )}
          </button>
        )
      })}
    </div>
  )
}
