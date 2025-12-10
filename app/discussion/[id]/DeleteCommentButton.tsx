'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteCommentButtonProps {
  commentId: string
  isOwner: boolean
  isAdmin: boolean
}

export default function DeleteCommentButton({ commentId, isOwner, isAdmin }: DeleteCommentButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!isOwner && !isAdmin) {
    return null
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete comment')
      }

      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
      title="Delete comment"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}

