'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface AdminImageUploadProps {
  currentImageUrl: string | null | undefined
  onImageChange: (url: string | null) => void
  uploadEndpoint: string
  label?: string
}

export default function AdminImageUpload({
  currentImageUrl,
  onImageChange,
  uploadEndpoint,
  label = 'Image',
}: AdminImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setError(null)
    setUploading(true)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      // Update preview with new URL (signed URL for display)
      setPreview(data.url)
      // Pass the storage path (not the signed URL) for database storage
      // The path is permanent, while signed URLs expire
      // Always use path if available (upload endpoint should always provide it)
      const storagePath = data.path || data.url
      onImageChange(storagePath)
    } catch (err: any) {
      setError(err.message || 'Failed to upload image')
      // Reset preview on error
      setPreview(currentImageUrl || null)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    if (!confirm('Are you sure you want to remove this image?')) {
      return
    }

    setPreview(null)
    onImageChange(null)
    setError(null)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 mb-1">
        {label} (Optional)
      </label>
      <div className="flex items-start gap-4">
        {preview && (
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex-shrink-0">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
              sizes="128px"
              unoptimized // For signed URLs from private buckets
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`admin-image-upload-${uploadEndpoint}`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 text-center"
          >
            {uploading ? 'Uploading...' : preview ? 'Change Image' : 'Upload Image'}
          </label>
          <input
            ref={fileInputRef}
            id={`admin-image-upload-${uploadEndpoint}`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <p className="text-xs text-gray-500">
        Maximum file size: 10MB. Supported formats: JPEG, PNG, WebP, GIF
      </p>
    </div>
  )
}
