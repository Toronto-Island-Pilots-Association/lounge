'use client'

import { useState, useRef } from 'react'

interface AdminFileUploadProps {
  currentFileUrl: string | null | undefined
  currentFileName?: string | null
  onFileChange: (url: string | null, fileName?: string | null) => void
  uploadEndpoint: string
  label?: string
  maxSizeMB?: number
}

export default function AdminFileUpload({
  currentFileUrl,
  currentFileName,
  onFileChange,
  uploadEndpoint,
  label = 'File Attachment',
  maxSizeMB = 50,
}: AdminFileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    setError(null)
    setUploading(true)

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
        throw new Error(data.error || 'Failed to upload file')
      }

      onFileChange(data.url, data.filename)
    } catch (err: any) {
      setError(err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    if (!confirm('Are you sure you want to remove this file?')) {
      return
    }

    onFileChange(null, null)
    setError(null)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 mb-1">
        {label} (Optional)
      </label>
      <div className="flex items-start gap-4">
        {currentFileUrl && currentFileName && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md border border-gray-300 flex-shrink-0">
            <span className="text-2xl">{getFileIcon(currentFileName)}</span>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                {currentFileName}
              </span>
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                View/Download
              </a>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`admin-file-upload-${uploadEndpoint}`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 text-center"
          >
            {uploading ? 'Uploading...' : currentFileUrl ? 'Change File' : 'Upload File'}
          </label>
          <input
            ref={fileInputRef}
            id={`admin-file-upload-${uploadEndpoint}`}
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          {currentFileUrl && (
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
        Maximum file size: {maxSizeMB}MB. All file types are supported.
      </p>
    </div>
  )
}
