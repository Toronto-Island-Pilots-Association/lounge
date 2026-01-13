'use client'

import React from 'react'

interface LinkifiedTextProps {
  text: string
  className?: string
}

/**
 * Component that converts URLs in plain text to clickable links
 * Supports http://, https://, and www. URLs
 */
export default function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  // Handle empty text
  if (!text) {
    return <span className={className}></span>
  }

  // URL regex pattern - matches http://, https://, and www. URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi

  const parts: (string | React.ReactElement)[] = []
  let lastIndex = 0
  let match
  let hasUrls = false

  // Reset regex lastIndex for multiple uses
  const regex = new RegExp(urlRegex.source, urlRegex.flags)

  while ((match = regex.exec(text)) !== null) {
    hasUrls = true
    
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Extract the matched URL
    let url = match[0]
    let displayUrl = url

    // Add protocol if it's a www. URL
    if (url.startsWith('www.')) {
      url = `https://${url}`
    }

    // Truncate display URL if too long
    if (displayUrl.length > 50) {
      displayUrl = displayUrl.slice(0, 47) + '...'
    }

    // Add the link
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#0d1e26] underline hover:text-[#0a171c] break-all"
      >
        {displayUrl}
      </a>
    )

    lastIndex = regex.lastIndex
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  // If no URLs found, return original text as-is
  if (!hasUrls) {
    return <span className={className}>{text}</span>
  }

  return <span className={className}>{parts}</span>
}
