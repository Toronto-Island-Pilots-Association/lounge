'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MentionInput from '@/components/MentionInput'

export default function CommentForm({ threadId }: { threadId: string }) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/threads/${threadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to post comment')
      }

      setContent('')
      setExpanded(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const [showGuidelines, setShowGuidelines] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const isActive = expanded || !!content

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-2">
        <MentionInput
          value={content}
          onChange={setContent}
          onFocus={() => setExpanded(true)}
          onBlur={() => !content && setExpanded(false)}
          placeholder="Add a comment..."
          minRows={isActive ? 3 : 1}
          required
        />
      </div>

      {isActive && (
        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsClicked(!isClicked)
                setShowGuidelines(!isClicked)
              }}
              onMouseEnter={() => !isClicked && setShowGuidelines(true)}
              onMouseLeave={() => !isClicked && setShowGuidelines(false)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Guidelines</span>
            </button>

            {showGuidelines && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-10">
                <p className="leading-relaxed">
                  <strong>Community Guidelines:</strong> Keep it respectful, practical, and aviation-focused. Posts may be moved or closed if needed.
                </p>
                <div className="absolute bottom-0 left-4 transform translate-y-full">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-5 py-1.5 bg-[#0d1e26] text-white text-sm font-semibold rounded-lg hover:bg-[#0a171c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      )}
    </form>
  )
}
