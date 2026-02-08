'use client'

import { useEffect } from 'react'
import Image from 'next/image'

interface ImagePreviewModalProps {
  images: string[]
  currentIndex: number
  onClose: () => void
  onNavigate?: (index: number) => void
}

export default function ImagePreviewModal({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImagePreviewModalProps) {
  const currentImage = images[currentIndex]
  const hasMultipleImages = images.length > 1

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && hasMultipleImages && currentIndex > 0) {
        onNavigate?.(currentIndex - 1)
      } else if (e.key === 'ArrowRight' && hasMultipleImages && currentIndex < images.length - 1) {
        onNavigate?.(currentIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [currentIndex, hasMultipleImages, images.length, onClose, onNavigate])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onNavigate?.(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onNavigate?.(currentIndex + 1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors p-2"
        aria-label="Close preview"
      >
        <svg
          className="w-8 h-8"
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

      {/* Previous button */}
      {hasMultipleImages && currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 z-10 text-white hover:text-gray-300 transition-colors p-2 bg-black bg-opacity-50 rounded-full"
          aria-label="Previous image"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Next button */}
      {hasMultipleImages && currentIndex < images.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 z-10 text-white hover:text-gray-300 transition-colors p-2 bg-black bg-opacity-50 rounded-full"
          aria-label="Next image"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Image counter */}
      {hasMultipleImages && (
        <div className="absolute top-4 left-4 z-10 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Image */}
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center">
        <Image
          src={currentImage}
          alt={`Preview ${currentIndex + 1}`}
          width={1920}
          height={1080}
          className="max-w-full max-h-[90vh] object-contain"
          priority
          unoptimized // For signed URLs from private buckets
        />
      </div>
    </div>
  )
}
