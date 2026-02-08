'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ReactionButtonProps {
  targetId: string
  targetType: 'thread' | 'comment'
  initialReactions?: {
    like: number
  }
  userReaction?: string | null
}

export default function ReactionButton({
  targetId,
  targetType,
  initialReactions = { like: 0 },
  userReaction = null,
}: ReactionButtonProps) {
  const router = useRouter()
  const [reactions, setReactions] = useState(initialReactions)
  const [currentReaction, setCurrentReaction] = useState<string | null>(userReaction === 'like' ? 'like' : null)
  const [loading, setLoading] = useState(false)

  const handleReaction = async () => {
    if (loading) return

    setLoading(true)
    const wasActive = currentReaction === 'like'

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [targetType === 'thread' ? 'thread_id' : 'comment_id']: targetId,
          reaction_type: 'like',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to react')
      }

      // Update local state
      if (data.removed || wasActive) {
        // Reaction was removed
        setCurrentReaction(null)
        setReactions(prev => ({
          like: Math.max(0, prev.like - 1),
        }))
      } else {
        // New reaction
        setReactions(prev => ({
          like: prev.like + 1,
        }))
        setCurrentReaction('like')
      }

      router.refresh()
    } catch (err: any) {
      console.error('Error reacting:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleReaction}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-1 text-sm transition-colors ${
          currentReaction === 'like'
            ? 'text-blue-600 hover:text-blue-700'
            : 'text-gray-600 hover:text-gray-700'
        } disabled:opacity-50`}
        title="Like"
      >
        <svg className="w-4 h-4" fill={currentReaction === 'like' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span>{reactions.like}</span>
      </button>
    </div>
  )
}
