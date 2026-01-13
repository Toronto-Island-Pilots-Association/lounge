'use client'

import { useState } from 'react'
import ImagePreviewModal from './ImagePreviewModal'

interface ThreadImagesProps {
  imageUrls: string[]
}

export default function ThreadImages({ imageUrls }: ThreadImagesProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  const handleImageClick = (index: number) => {
    setPreviewIndex(index)
  }

  const handleClosePreview = () => {
    setPreviewIndex(null)
  }

  const handleNavigate = (index: number) => {
    setPreviewIndex(index)
  }

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index))
  }

  if (!imageUrls || imageUrls.length === 0) {
    return null
  }

  return (
    <>
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((imageUrl, index) => (
            <div
              key={index}
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0 bg-white"
              onClick={() => handleImageClick(index)}
            >
              {imageErrors.has(index) ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              ) : (
                <img
                  src={imageUrl}
                  alt={`Thread image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(index)}
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {previewIndex !== null && (
        <ImagePreviewModal
          images={imageUrls}
          currentIndex={previewIndex}
          onClose={handleClosePreview}
          onNavigate={handleNavigate}
        />
      )}
    </>
  )
}
