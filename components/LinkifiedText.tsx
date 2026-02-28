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
 * Supports @mentions in the format @[Name](userId)
 */
export default function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  if (!text) {
    return <span className={className}></span>
  }

  const lines = text.split('\n')
  const processedLines: React.ReactNode[] = []

  lines.forEach((line, lineIndex) => {
    if (line.trim() === '') {
      processedLines.push(<br key={`br-${lineIndex}`} />)
      return
    }

    const parts: (string | React.ReactElement)[] = []
    let keyCounter = 0

    // Process @mentions: @[Display Name](userId)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentionMatches: Array<{ start: number; end: number; name: string; userId: string }> = []
    let mentionMatch
    while ((mentionMatch = mentionRegex.exec(line)) !== null) {
      mentionMatches.push({
        start: mentionMatch.index,
        end: mentionRegex.lastIndex,
        name: mentionMatch[1],
        userId: mentionMatch[2],
      })
    }

    // Process markdown bold (**text**)
    const boldRegex = /\*\*(.+?)\*\*/g
    const boldMatches: Array<{ start: number; end: number; text: string }> = []
    let boldMatch
    while ((boldMatch = boldRegex.exec(line)) !== null) {
      boldMatches.push({
        start: boldMatch.index,
        end: boldRegex.lastIndex,
        text: boldMatch[1]
      })
    }

    // Process URLs
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
    const urlMatches: Array<{ start: number; end: number; url: string; displayUrl: string }> = []
    let urlMatch
    while ((urlMatch = urlRegex.exec(line)) !== null) {
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
        end: urlRegex.lastIndex,
        url,
        displayUrl
      })
    }

    const allMatches = [
      ...mentionMatches.map(m => ({ ...m, type: 'mention' as const })),
      ...boldMatches.map(m => ({ ...m, type: 'bold' as const })),
      ...urlMatches.map(m => ({ ...m, type: 'url' as const }))
    ].sort((a, b) => a.start - b.start)
      .filter((match, index, arr) => {
        if (index === 0) return true
        const prev = arr[index - 1]
        return match.start >= prev.end
      })

    let currentIndex = 0
    
    allMatches.forEach((match) => {
      if (match.start > currentIndex) {
        const beforeText = line.slice(currentIndex, match.start)
        if (beforeText) {
          parts.push(beforeText)
        }
      }

      if (match.type === 'mention') {
        parts.push(
          <span
            key={`mention-${lineIndex}-${keyCounter++}`}
            className="bg-[#d1ecf9] text-[#1264a3] rounded-sm px-0.5"
          >
            @{(match as typeof mentionMatches[0]).name}
          </span>
        )
      } else if (match.type === 'bold') {
        parts.push(
          <strong key={`bold-${lineIndex}-${keyCounter++}`} className="font-semibold text-gray-900">
            {(match as typeof boldMatches[0]).text}
          </strong>
        )
      } else {
        const urlData = match as typeof urlMatches[0]
        parts.push(
          <a
            key={`url-${lineIndex}-${keyCounter++}`}
            href={urlData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0d1e26] underline hover:text-[#0a171c] break-all"
          >
            {urlData.displayUrl}
          </a>
        )
      }

      currentIndex = match.end
    })

    if (currentIndex < line.length) {
      parts.push(line.slice(currentIndex))
    }

    if (parts.length === 0) {
      parts.push(line)
    }

    processedLines.push(
      <span key={`line-${lineIndex}`}>
        {parts}
      </span>
    )

    if (lineIndex < lines.length - 1) {
      processedLines.push(<br key={`linebreak-${lineIndex}`} />)
    }
  })

  return <span className={className}>{processedLines}</span>
}
