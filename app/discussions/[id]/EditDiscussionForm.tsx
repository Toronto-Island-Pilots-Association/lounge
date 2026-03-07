'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { DiscussionCategory } from '@/types/database'
import MentionInput from '@/components/MentionInput'
import { CATEGORY_LABELS, CATEGORY_DESCRIPTIONS } from '../constants'

const MAX_THREAD_IMAGES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

type EditDiscussionFormProps = {
  threadId: string
  initialTitle: string
  initialContent: string
  initialCategory: DiscussionCategory
  initialImageUrls: string[]
}

export default function EditDiscussionForm({
  threadId,
  initialTitle,
  initialContent,
  initialCategory,
  initialImageUrls,
}: EditDiscussionFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [category, setCategory] = useState<DiscussionCategory>(initialCategory)
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (imageUrls.length + files.length > MAX_THREAD_IMAGES) {
      setUploadError(`Max ${MAX_THREAD_IMAGES} images`)
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
          const res = await fetch('/api/threads/upload-image', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Upload failed')
          return data.url as string
        })
      )
      setImageUrls((prev) => [...prev, ...uploads].slice(0, MAX_THREAD_IMAGES))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          image_urls: imageUrls,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update discussion')
      router.push(`/discussions/${threadId}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as DiscussionCategory)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-transparent"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {CATEGORY_DESCRIPTIONS[category] && CATEGORY_DESCRIPTIONS[category] !== CATEGORY_LABELS[category] && (
          <p className="mt-2 text-sm text-gray-600">{CATEGORY_DESCRIPTIONS[category]}</p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d1e26] focus:border-transparent"
          placeholder="Enter discussion title..."
        />
      </div>

      <div className="mb-6">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <div className="rounded-lg border border-gray-300 bg-white focus-within:border-[#0d1e26] focus-within:shadow-[0_0_0_3px_rgba(13,30,38,0.08)] transition-all">
          {imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1 border-b border-gray-100">
              {imageUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative w-14 h-14 rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0"
                >
                  <Image src={url} alt="" fill className="object-cover" sizes="56px" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    aria-label="Remove image"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="px-1">
            <MentionInput
              id="content"
              value={content}
              onChange={setContent}
              required
              minRows={8}
              placeholder="Add your message..."
              embedded
            />
          </div>
          <div className="flex items-center gap-2 px-2 pb-2 pt-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              disabled={uploading || imageUrls.length >= MAX_THREAD_IMAGES}
              multiple
              className="hidden"
              id="edit-thread-image-upload"
            />
            <label
              htmlFor="edit-thread-image-upload"
              className={`flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer ${
                uploading || imageUrls.length >= MAX_THREAD_IMAGES ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? (
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
              <span>
                {imageUrls.length}/{MAX_THREAD_IMAGES} images
              </span>
            </label>
            {uploadError && (
              <span className="text-xs text-red-600" title={uploadError}>
                {uploadError}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-[#0d1e26] text-white font-semibold rounded-lg hover:bg-[#0a171c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/discussions/${threadId}`)}
          className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
