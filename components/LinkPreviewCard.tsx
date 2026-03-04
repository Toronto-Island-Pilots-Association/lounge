'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'

type PreviewData = {
  url: string
  title: string | null
  thumbnail_url: string | null
  description: string | null
  site_name: string | null
}

const LinkPreviewCard: React.FC<{ url: string; className?: string }> = ({ url, className = '' }) => {
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const encoded = encodeURIComponent(url)
    fetch(`/api/link-preview?url=${encoded}`)
      .then((res) => {
        if (!res.ok) throw new Error('Preview unavailable')
        return res.json()
      })
      .then((json: PreviewData) => {
        if (!cancelled) {
          setData(json)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (loading) {
    return (
      <div
        className={`inline-block rounded-lg border border-gray-200 bg-gray-50 p-3 max-w-md ${className}`}
        aria-hidden
      >
        <div className="flex gap-3">
          <div className="w-24 h-14 rounded bg-gray-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 bg-gray-200 rounded animate-pulse mb-2 w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) return null

  const displayTitle = data.title || data.site_name || 'Link'
  const displayUrl = data.url.length > 50 ? `${data.url.slice(0, 47)}...` : data.url

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden hover:border-gray-300 hover:shadow-sm transition-colors max-w-md text-left ${className}`}
    >
      {data.thumbnail_url ? (
        <div className="relative w-full aspect-video bg-gray-100">
          <Image
            src={data.thumbnail_url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 448px"
            unoptimized={data.thumbnail_url.includes('ytimg.com') || data.thumbnail_url.includes('vimeocdn')}
          />
        </div>
      ) : null}
      <div className="p-3">
        <div className="font-medium text-gray-900 line-clamp-2">{displayTitle}</div>
        {data.description ? (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{data.description}</p>
        ) : null}
        <p className="text-xs text-gray-400 mt-1 truncate">{displayUrl}</p>
      </div>
    </a>
  )
}

export default LinkPreviewCard
