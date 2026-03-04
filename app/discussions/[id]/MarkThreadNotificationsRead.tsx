'use client'

import { useEffect } from 'react'

export default function MarkThreadNotificationsRead({ threadId }: { threadId: string }) {
  useEffect(() => {
    if (!threadId) return
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: threadId }),
    }).catch(() => {})
  }, [threadId])
  return null
}
