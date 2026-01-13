'use client'

import { useState } from 'react'
import Image from 'next/image'
import ImagePreviewModal from './ImagePreviewModal'

interface SingleImageProps {
  imageUrl: string | null
  alt: string
  className?: string
}

export default function SingleImage({ imageUrl, alt, className = '' }: SingleImageProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [imageError, setImageError] = useState(false)

  if (!imageUrl) {
    return null
  }

  const handleImageClick = () => {
    setShowPreview(true)
  }

  const handleClosePreview = () => {
    setShowPreview(false)
  }

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <>
      <div
        className={`relative cursor-pointer hover:opacity-90 transition-opacity ${className}`}
        onClick={handleImageClick}
      >
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-lg">
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        ) : (
          <Image
            src={imageUrl}
            alt={alt}
            width={800}
            height={600}
            className="w-full h-auto object-cover rounded-lg"
            onError={handleImageError}
            loading="lazy"
            unoptimized // For signed URLs from private buckets
          />
        )}
      </div>

      {showPreview && (
        <ImagePreviewModal
          images={[imageUrl]}
          currentIndex={0}
          onClose={handleClosePreview}
        />
      )}
    </>
  )
}
