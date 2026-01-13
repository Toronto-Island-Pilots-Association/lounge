'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ReactionButtonProps {
  targetId: string
  targetType: 'thread' | 'comment'
  initialReactions?: {
    like: number
    upvote: number
    downvote: number
  }
  userReaction?: string | null
}

export default function ReactionButton({
  targetId,
  targetType,
  initialReactions = { like: 0, upvote: 0, downvote: 0 },
  userReaction = null,
}: ReactionButtonProps) {
  const router = useRouter()
  const [reactions, setReactions] = useState(initialReactions)
  const [currentReaction, setCurrentReaction] = useState<string | null>(userReaction)
  const [loading, setLoading] = useState(false)

  const handleReaction = async (reactionType: 'like' | 'upvote' | 'downvote') => {
    if (loading) return

    setLoading(true)
    const wasActive = currentReaction === reactionType

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [targetType === 'thread' ? 'thread_id' : 'comment_id']: targetId,
          reaction_type: reactionType,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to react')
      }

      // Update local state
      if (data.removed) {
        // Reaction was removed
        setCurrentReaction(null)
        setReactions(prev => ({
          ...prev,
          [reactionType]: Math.max(0, prev[reactionType] - 1),
        }))
      } else if (wasActive) {
        // User changed reaction type
        const oldType = currentReaction as keyof typeof reactions
        setCurrentReaction(reactionType)
        setReactions(prev => ({
          ...prev,
          [oldType]: Math.max(0, prev[oldType] - 1),
          [reactionType]: prev[reactionType] + 1,
        }))
      } else {
        // New reaction
        if (currentReaction) {
          const oldType = currentReaction as keyof typeof reactions
          setReactions(prev => ({
            ...prev,
            [oldType]: Math.max(0, prev[oldType] - 1),
            [reactionType]: prev[reactionType] + 1,
          }))
        } else {
          setReactions(prev => ({
            ...prev,
            [reactionType]: prev[reactionType] + 1,
          }))
        }
        setCurrentReaction(reactionType)
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
        onClick={() => handleReaction('like')}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-1 text-sm transition-colors ${
          currentReaction === 'like'
            ? 'text-blue-700 hover:text-blue-800'
            : 'text-gray-600 hover:text-gray-700'
        } disabled:opacity-50`}
        title="Like"
      >
        <svg className="w-4 h-4" fill={currentReaction === 'like' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        <span>{reactions.like}</span>
      </button>
      <button
        onClick={() => handleReaction('upvote')}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-1 text-sm transition-colors ${
          currentReaction === 'upvote'
            ? 'text-green-700 hover:text-green-800'
            : 'text-gray-600 hover:text-gray-700'
        } disabled:opacity-50`}
        title="Upvote"
      >
        <svg className="w-4 h-4" fill={currentReaction === 'upvote' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        <span>{reactions.upvote}</span>
      </button>
      <button
        onClick={() => handleReaction('downvote')}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-1 text-sm transition-colors ${
          currentReaction === 'downvote'
            ? 'text-red-700 hover:text-red-800'
            : 'text-gray-600 hover:text-gray-700'
        } disabled:opacity-50`}
        title="Downvote"
      >
        <svg className="w-4 h-4" fill={currentReaction === 'downvote' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span>{reactions.downvote}</span>
      </button>
    </div>
  )
}
