'use client'

import LinkifiedText from '@/components/LinkifiedText'
import { stripMentionFormat } from '@/lib/utils'

interface ContentPreviewProps {
  content: string
  maxLength?: number
  className?: string
}

export default function ContentPreview({ content, maxLength = 60, className = '' }: ContentPreviewProps) {
  if (!content) return null

  // Convert mentions to @Name for length calculation
  const displayContent = stripMentionFormat(content)

  // Strip markdown and collapse to single line (no special formatting)
  const stripMarkdown = (text: string): string =>
    text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const plainText = stripMarkdown(displayContent)
  const isTruncated = plainText.length > maxLength
  const truncatedPlain = isTruncated
    ? (plainText.slice(0, maxLength).trim().replace(/\s+\S*$/, '') || plainText.slice(0, maxLength))
    : plainText

  return (
    <span className={`text-xs text-gray-500 line-clamp-1 ${className}`}>
      <LinkifiedText text={truncatedPlain + (isTruncated ? '...' : '')} />
    </span>
  )
}
