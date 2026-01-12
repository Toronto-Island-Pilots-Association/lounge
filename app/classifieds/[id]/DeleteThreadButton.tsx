'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteThreadButtonProps {
  threadId: string
  isOwner: boolean
  isAdmin: boolean
}

export default function DeleteThreadButton({ threadId, isOwner, isAdmin }: DeleteThreadButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  if (!isOwner && !isAdmin) {
    return null
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this classified? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete classified')
      }

      router.push('/classifieds')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete classified')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
      title="Delete classified"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}
