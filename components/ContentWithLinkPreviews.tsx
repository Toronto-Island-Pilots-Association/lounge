'use client'

import React, { useMemo } from 'react'
import LinkifiedText from '@/components/LinkifiedText'
import LinkPreviewCard from '@/components/LinkPreviewCard'

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi

function extractUrls(text: string): string[] {
  if (!text?.trim()) return []
  const seen = new Set<string>()
  const urls: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(URL_REGEX.source, 'gi')
  while ((m = re.exec(text)) !== null) {
    let url = m[0]
    if (url.startsWith('www.')) url = `https://${url}`
    try {
      new URL(url)
      if (!seen.has(url)) {
        seen.add(url)
        urls.push(url)
      }
    } catch {
      // skip invalid
    }
  }
  return urls
}

interface ContentWithLinkPreviewsProps {
  content: string
  /** Optional class for the prose wrapper (content). */
  contentClassName?: string
  /** Optional class for the previews container. */
  previewsClassName?: string
  /** Max number of link previews to show (default 5). */
  maxPreviews?: number
}

/**
 * Renders content with LinkifiedText and shows link preview cards for URLs
 * (e.g. YouTube). Previews are fetched client-side via /api/link-preview.
 */
export default function ContentWithLinkPreviews({
  content,
  contentClassName = '',
  previewsClassName = '',
  maxPreviews = 5,
}: ContentWithLinkPreviewsProps) {
  const urls = useMemo(() => extractUrls(content).slice(0, maxPreviews), [content, maxPreviews])

  return (
    <>
      <div className={contentClassName}>
        <LinkifiedText text={content} />
      </div>
      {urls.length > 0 ? (
        <div className={`mt-3 flex flex-wrap gap-3 ${previewsClassName}`}>
          {urls.map((url) => (
            <LinkPreviewCard key={url} url={url} />
          ))}
        </div>
      ) : null}
    </>
  )
}
