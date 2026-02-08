'use client'

import LinkifiedText from '@/components/LinkifiedText'

interface ContentPreviewProps {
  content: string
  maxLength?: number
  className?: string
}

/**
 * Component that renders a formatted preview of content with markdown support
 * Truncates based on plain text length but preserves markdown formatting
 */
export default function ContentPreview({ content, maxLength = 60, className = '' }: ContentPreviewProps) {
  if (!content) return null

  // Strip markdown for length calculation
  const stripMarkdown = (text: string): string => {
    return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  }

  const plainText = stripMarkdown(content)
  const isTruncated = plainText.length > maxLength

  // Truncate content while preserving markdown pairs
  let truncatedContent = content
  if (isTruncated) {
    // Count characters, skipping markdown markers
    let plainCharCount = 0
    let i = 0
    let lastSpaceIndex = -1
    
    while (i < content.length && plainCharCount < maxLength) {
      // Check for markdown bold start/end
      if (content.substring(i, i + 2) === '**') {
        i += 2
        continue
      }
      
      // Track spaces for word boundary truncation
      if (content[i] === ' ') {
        lastSpaceIndex = i
      }
      
      plainCharCount++
      i++
    }
    
    // Truncate at word boundary if possible
    if (lastSpaceIndex > maxLength * 0.6 && lastSpaceIndex < i) {
      truncatedContent = content.substring(0, lastSpaceIndex)
    } else {
      truncatedContent = content.substring(0, i)
    }
    
    // Close any unclosed markdown tags
    const openBoldCount = (truncatedContent.match(/\*\*/g) || []).length
    if (openBoldCount % 2 !== 0) {
      // Remove the last incomplete bold marker
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
