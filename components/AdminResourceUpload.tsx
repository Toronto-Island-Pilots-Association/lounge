'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'

interface AdminResourceUploadProps {
  currentImageUrl: string | null | undefined
  currentFileUrl: string | null | undefined
  currentFileName?: string | null
  onImageChange: (url: string | null) => void
  onFileChange: (url: string | null, fileName?: string | null) => void
  imageUploadEndpoint: string
  fileUploadEndpoint: string
  label?: string
}

export default function AdminResourceUpload({
  currentImageUrl,
  currentFileUrl,
  currentFileName,
  onImageChange,
  onFileChange,
  imageUploadEndpoint,
  fileUploadEndpoint,
  label = 'Image & File Upload',
}: AdminResourceUploadProps) {
  const [imageUploading, setImageUploading] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(currentImageUrl || null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (fileName: string | null | undefined): string => {
    if (!fileName) return '📄'
    const ext = fileName.split('.').pop()?.toLowerCase()
    const iconMap: Record<string, string> = {
      pdf: '📕',
      doc: '📘',
      docx: '📘',
      xls: '📗',
      xlsx: '📗',
      ppt: '📙',
      pptx: '📙',
      zip: '📦',
      rar: '📦',
      txt: '📄',
      csv: '📊',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      mp4: '🎥',
      mov: '🎥',
      mp3: '🎵',
      wav: '🎵',
    }
    return iconMap[ext || ''] || '📄'
  }

  const uploadImage = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image size must be less than 10MB')
      return
    }

    setImageError(null)
    setImageUploading(true)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(imageUploadEndpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      // Update preview with new URL (signed URL for display)
      setImagePreview(data.url)
      // Pass the storage path (not the signed URL) for database storage
      onImageChange(data.path || data.url)
    } catch (err: any) {
      setImageError(err.message || 'Failed to upload image')
      // Reset preview on error
      setImagePreview(currentImageUrl || null)
    } finally {
      setImageUploading(false)
    }
  }

  const uploadFile = async (file: File) => {
    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setFileError('File size must be less than 50MB')
      return
    }

    setFileError(null)
    setFileUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(fileUploadEndpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file')
      }

      onFileChange(data.url, data.filename)
    } catch (err: any) {
      setFileError(err.message || 'Failed to upload file')
    } finally {
      setFileUploading(false)
    }
  }

  const handleFile = useCallback(async (file: File) => {
    // Determine if it's an image or regular file
    if (file.type.startsWith('image/')) {
      await uploadImage(file)
    } else {
      await uploadFile(file)
    }
  }, [imageUploadEndpoint, fileUploadEndpoint])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      await handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleFile(file)
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = () => {
    if (!confirm('Are you sure you want to remove this image?')) {
      return
    }

    setImagePreview(null)
    onImageChange(null)
    setImageError(null)
  }

  const handleRemoveFile = () => {
    if (!confirm('Are you sure you want to remove this file?')) {
      return
    }

    onFileChange(null, null)
    setFileError(null)
  }

  const isUploading = imageUploading || fileUploading

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-900 mb-2">
        {label} (Optional)
      </label>
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragging ? 'border-[#0d1e26] bg-[#0d1e26]/5' : 'border-gray-300 bg-gray-50'}
          ${isUploading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:border-gray-400 hover:bg-gray-100'}
        `}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />

        {/* Upload Area Content */}
        <div className="flex flex-col items-center justify-center text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4 flex text-sm leading-6 text-gray-600">
            <span className="relative cursor-pointer rounded-md font-semibold text-[#0d1e26] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#0d1e26] focus-within:ring-offset-2">
              {isUploading ? 'Uploading...' : 'Click to upload'}
            </span>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs leading-5 text-gray-600 mt-2">
            Images (JPEG, PNG, WebP, GIF) up to 10MB • Files up to 50MB
          </p>
        </div>

        {/* Current Uploads */}
        {(imagePreview || currentFileUrl) && (
          <div className="mt-6 pt-6 border-t border-gray-300 space-y-4">
            {/* Image Preview */}
            {imagePreview && (
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex-shrink-0">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Image uploaded</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveImage()
                    }}
                    className="mt-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove image
                  </button>
                </div>
                {imageError && (
                  <p className="text-sm text-red-600">{imageError}</p>
                )}
              </div>
            )}

            {/* File Preview */}
            {currentFileUrl && currentFileName && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-md border border-gray-300 flex-shrink-0">
                  <span className="text-2xl">{getFileIcon(currentFileName)}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {currentFileName}
                    </span>
                    <a
                      href={currentFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      View/Download
                    </a>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">File uploaded</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFile()
                    }}
                    className="mt-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove file
                  </button>
                </div>
                {fileError && (
                  <p className="text-sm text-red-600">{fileError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
