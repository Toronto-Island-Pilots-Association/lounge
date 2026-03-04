'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import MentionInput from '@/components/MentionInput'

const MAX_COMMENT_IMAGES = 3
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function CommentForm({ threadId }: { threadId: string }) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/threads/${threadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, image_urls: imageUrls.length > 0 ? imageUrls : undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to post comment')
      }

      setContent('')
      setImageUrls([])
      setExpanded(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (imageUrls.length + files.length > MAX_COMMENT_IMAGES) {
      setUploadError(`Max ${MAX_COMMENT_IMAGES} images`)
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          if (!file.type.startsWith('image/')) throw new Error('Images only')
          if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} exceeds 10MB`)
          const formData = new FormData()
          formData.append('file', file)
          const res = await fetch('/api/threads/upload-image', { method: 'POST', credentials: 'include', body: formData })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Upload failed')
          return data.url as string
        })
      )
      setImageUrls((prev) => [...prev, ...uploads].slice(0, MAX_COMMENT_IMAGES))
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
    setUploadError(null)
  }

  const [showGuidelines, setShowGuidelines] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const isActive = expanded || !!content.trim() || imageUrls.length > 0

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Single input-style box: images + text + footer with attach & post */}
      <div
        className={`rounded-lg border transition-all duration-150 ${
          isActive
            ? 'border-[#0d1e26] shadow-[0_0_0_3px_rgba(13,30,38,0.08)] bg-white'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        {/* Image thumbnails inside the input */}
        {imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1 border-b border-gray-100">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative w-14 h-14 rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                <Image src={url} alt="" fill className="object-cover" sizes="56px" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  aria-label="Remove image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-1">
          <MentionInput
            value={content}
            onChange={setContent}
            onFocus={() => setExpanded(true)}
            onBlur={() => !content && imageUrls.length === 0 && setExpanded(false)}
            placeholder="Add a comment..."
            minRows={isActive ? 3 : 1}
            required
            embedded
          />
        </div>

        {/* Footer inside the input: attach, guidelines, post */}
        <div className="flex items-center justify-between px-2 pb-2 pt-0 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              disabled={uploading || imageUrls.length >= MAX_COMMENT_IMAGES}
              multiple
              className="hidden"
              id="comment-image-upload"
            />
            <label
              htmlFor="comment-image-upload"
              className={`flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer shrink-0 ${
                uploading || imageUrls.length >= MAX_COMMENT_IMAGES ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Attach image"
            >
              {uploading ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              <span className="hidden sm:inline">
                {imageUrls.length >= MAX_COMMENT_IMAGES ? `${MAX_COMMENT_IMAGES}/${MAX_COMMENT_IMAGES}` : `${imageUrls.length}/${MAX_COMMENT_IMAGES}`}
              </span>
            </label>
            {uploadError && (
              <span className="text-xs text-red-600 truncate" title={uploadError}>
                {uploadError}
              </span>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setIsClicked(!isClicked); setShowGuidelines(!isClicked) }}
                onMouseEnter={() => !isClicked && setShowGuidelines(true)}
                onMouseLeave={() => !isClicked && setShowGuidelines(false)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0"
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
          </div>
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-5 py-1.5 bg-[#0d1e26] text-white text-sm font-semibold rounded-lg hover:bg-[#0a171c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  )
}
