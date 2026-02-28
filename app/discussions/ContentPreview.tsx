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

  const stripMarkdown = (text: string): string =>
    text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

  const plainText = stripMarkdown(displayContent)
  const isTruncated = plainText.length > maxLength

  let truncatedContent = displayContent
  if (isTruncated) {
    let plainCharCount = 0
    let i = 0
    let lastSpaceIndex = -1

    while (i < displayContent.length && plainCharCount < maxLength) {
      if (displayContent.substring(i, i + 2) === '**') {
        i += 2
        continue
      }
      if (displayContent[i] === ' ') lastSpaceIndex = i
      plainCharCount++
      i++
    }

    truncatedContent = lastSpaceIndex > maxLength * 0.6 && lastSpaceIndex < i
      ? displayContent.substring(0, lastSpaceIndex)
      : displayContent.substring(0, i)

    const openBoldCount = (truncatedContent.match(/\*\*/g) || []).length
    if (openBoldCount % 2 !== 0) {
      truncatedContent = truncatedContent.replace(/\*\*$/, '')
    }
  }

  return (
    <span className={`text-xs text-gray-500 line-clamp-1 ${className}`}>
      <LinkifiedText text={truncatedContent} />
      {isTruncated && '...'}
    </span>
  )
}
