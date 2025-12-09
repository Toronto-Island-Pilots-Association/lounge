'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface ProfilePictureUploadProps {
  currentPictureUrl: string | null
  userId: string
  onUpdate?: () => void
}

export default function ProfilePictureUpload({
  currentPictureUrl,
  userId,
  onUpdate,
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentPictureUrl)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile/picture', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload picture')
      }

      // Update preview with new URL
      setPreview(data.url)
      
      // Refresh profile data
      if (onUpdate) {
        onUpdate()
      }

      // Refresh the page to update all components
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Failed to upload picture')
      // Reset preview on error
      setPreview(currentPictureUrl)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) {
      return
    }

    setUploading(true)
    setError(null)

    try {
      const response = await fetch('/api/profile/picture', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove picture')
      }

      setPreview(null)
      
      if (onUpdate) {
        onUpdate()
      }

      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Failed to remove picture')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="relative">
          {preview ? (
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300">
              <Image
                src={preview}
                alt="Profile picture"
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="profile-picture-upload"
            className="px-4 py-2 bg-[#0d1e26] text-white rounded-md hover:bg-[#0a171c] text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center"
          >
            {uploading ? 'Uploading...' : preview ? 'Change Picture' : 'Upload Picture'}
          </label>
          <input
            ref={fileInputRef}
            id="profile-picture-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          {preview && (
            <button
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
        Maximum file size: 5MB. Supported formats: JPEG, PNG, WebP, GIF
      </p>
    </div>
  )
}

