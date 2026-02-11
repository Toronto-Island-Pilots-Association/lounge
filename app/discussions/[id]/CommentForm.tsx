'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CommentForm({ threadId }: { threadId: string }) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/threads/${threadId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to post comment')
      }

      setContent('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const [showGuidelines, setShowGuidelines] = useState(false)
  const [isClicked, setIsClicked] = useState(false)

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-2">
        <textarea
          id="comment"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => !content && setIsFocused(false)}
          required
          rows={isFocused || content ? 4 : 2}
          className={`w-full px-4 py-2 border rounded-lg transition-all duration-200 resize-none ${
            isFocused || content
              ? 'border-gray-400 bg-white focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] shadow-sm'
              : 'border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26] focus:bg-white focus:shadow-sm'
          }`}
          placeholder="Add a comment..."
        />
      </div>

      {/* Community Guidelines - Subtle, grayed out, shows on hover/click */}
      <div className="relative mb-4">
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
          <span>Community Guidelines</span>
        </button>
        
        {showGuidelines && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-10">
            <p className="leading-relaxed">
              <strong>Community Guidelines:</strong> Keep it respectful, practical, and aviation-focused. Posts may be moved or closed if needed.
            </p>
            <div className="absolute bottom-0 left-4 transform translate-y-full">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
      </div>

      {(isFocused || content) && (
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-6 py-2 bg-[#0d1e26] text-white font-semibold rounded-lg hover:bg-[#0a171c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Posting...' : 'Post Comment'}
        </button>
      )}
    </form>
  )
}
