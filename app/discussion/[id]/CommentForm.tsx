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

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-4">
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

