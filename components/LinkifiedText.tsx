'use client'

import React from 'react'

interface LinkifiedTextProps {
  text: string
  className?: string
}

/**
 * Component that converts URLs in plain text to clickable links and renders markdown
 * Supports http://, https://, and www. URLs
 * Supports markdown bold (**text**) and line breaks
 */
export default function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  // Handle empty text
  if (!text) {
    return <span className={className}></span>
  }

  // Split by lines to preserve line breaks
  const lines = text.split('\n')
  const processedLines: React.ReactNode[] = []

  lines.forEach((line, lineIndex) => {
    if (line.trim() === '') {
      processedLines.push(<br key={`br-${lineIndex}`} />)
      return
    }

    const parts: (string | React.ReactElement)[] = []
    let processedText = line
    let keyCounter = 0

    // Process markdown bold (**text**) first
    const boldRegex = /\*\*(.+?)\*\*/g
    const boldMatches: Array<{ start: number; end: number; text: string }> = []
    let boldMatch
    const boldRegexCopy = new RegExp(boldRegex.source, boldRegex.flags)
    
    while ((boldMatch = boldRegexCopy.exec(line)) !== null) {
      boldMatches.push({
        start: boldMatch.index,
        end: boldRegexCopy.lastIndex,
        text: boldMatch[1]
      })
    }

    // Process URLs
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
    const urlMatches: Array<{ start: number; end: number; url: string; displayUrl: string }> = []
    let urlMatch
    const urlRegexCopy = new RegExp(urlRegex.source, urlRegex.flags)
    
    while ((urlMatch = urlRegexCopy.exec(line)) !== null) {
      let url = urlMatch[0]
      let displayUrl = url
      
      if (url.startsWith('www.')) {
        url = `https://${url}`
      }
      
      if (displayUrl.length > 50) {
        displayUrl = displayUrl.slice(0, 47) + '...'
      }
      
      urlMatches.push({
        start: urlMatch.index,
        end: urlRegexCopy.lastIndex,
        url,
        displayUrl
      })
    }

    // Merge and sort all matches by position, avoiding overlaps
    const allMatches = [
      ...boldMatches.map(m => ({ ...m, type: 'bold' as const })),
      ...urlMatches.map(m => ({ ...m, type: 'url' as const }))
    ].sort((a, b) => a.start - b.start)
      .filter((match, index, arr) => {
        // Remove overlapping matches (keep the first one)
        if (index === 0) return true
        const prev = arr[index - 1]
        return match.start >= prev.end
      })

    // Process the line with all matches
    let currentIndex = 0
    
    allMatches.forEach((match) => {
      // Add text before the match
      if (match.start > currentIndex) {
        const beforeText = line.slice(currentIndex, match.start)
        if (beforeText) {
          parts.push(beforeText)
        }
      }

      // Add the match
      if (match.type === 'bold') {
        parts.push(
          <strong key={`bold-${lineIndex}-${keyCounter++}`} className="font-semibold text-gray-900">
            {match.text}
          </strong>
        )
      } else {
        parts.push(
          <a
            key={`url-${lineIndex}-${keyCounter++}`}
            href={match.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0d1e26] underline hover:text-[#0a171c] break-all"
          >
            {match.displayUrl}
          </a>
        )
      }

      currentIndex = match.end
    })

    // Add remaining text after the last match
    if (currentIndex < line.length) {
      parts.push(line.slice(currentIndex))
    }

    // If no matches, add the line as-is
    if (parts.length === 0) {
      parts.push(line)
    }

    processedLines.push(
      <span key={`line-${lineIndex}`}>
        {parts}
      </span>
    )

    // Add line break except for the last line
    if (lineIndex < lines.length - 1) {
      processedLines.push(<br key={`linebreak-${lineIndex}`} />)
    }
  })

  return <span className={className}>{processedLines}</span>
}
