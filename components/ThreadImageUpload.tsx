'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface ThreadImageUploadProps {
  onImagesChange: (urls: string[]) => void
  maxImages?: number
}

export default function ThreadImageUpload({
  onImagesChange,
  maxImages = 5,
}: ThreadImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Check total image count
    if (images.length + files.length > maxImages) {
      setError(`You can only upload up to ${maxImages} images`)
      return
    }

    setError(null)
    setUploading(true)

    try {
      const uploadPromises = files.map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error('Please select image files only')
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 10MB limit`)
        }

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/threads/upload-image', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload image')
        }

        return data.url
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      const newImages = [...images, ...uploadedUrls]
      setImages(newImages)
      onImagesChange(newImages)
    } catch (err: any) {
      setError(err.message || 'Failed to upload images')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    onImagesChange(newImages)
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="thread-image-upload"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Images (Optional)
        </label>
        <div className="flex items-center gap-4">
          <label
            htmlFor="thread-image-upload"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
          >
            {uploading ? 'Uploading...' : `Add Images (${images.length}/${maxImages})`}
          </label>
          <input
            ref={fileInputRef}
            id="thread-image-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            disabled={uploading || images.length >= maxImages}
            multiple
            className="hidden"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Maximum {maxImages} images, 10MB each. Supported formats: JPEG, PNG, WebP, GIF
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                <Image
                  src={url}
                  alt={`Uploaded image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label="Remove image"
                >
                  <svg
                    className="w-4 h-4"
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
