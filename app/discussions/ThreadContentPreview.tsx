import React from 'react'
import { stripMentionFormat } from '@/lib/utils'
import { stripMarkdown } from './utils'

const MAX_LENGTH = 120

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max).trim()
  const lastSpace = slice.replace(/\s+\S*$/, '')
  return lastSpace.length > max * 0.6 ? lastSpace : slice
}

/**
 * Server-only preview for list view. Renders truncated plain text.
 * URLs are kept as plain text (no <a> tags) in the list to avoid any
 * link-related flash or reflow; users open the thread to click links.
 */
export default function ThreadContentPreview({
  content,
  maxLength = MAX_LENGTH,
  className = '',
}: {
  content: string
  maxLength?: number
  className?: string
}) {
  if (!content?.trim()) return null

  const displayContent = stripMentionFormat(content)
  const plainText = stripMarkdown(displayContent)
  const isTruncated = plainText.length > maxLength
  const truncated = isTruncated
    ? truncateAtWord(plainText, maxLength) + '...'
    : plainText

  return (
    <span
      className={`text-xs text-gray-500 line-clamp-1 ${className}`.trim()}
    >
      {truncated}
    </span>
  )
}
