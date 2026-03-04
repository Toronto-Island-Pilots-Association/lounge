import { requireAuth } from '@/lib/auth'
import { NextResponse } from 'next/server'

/** Allowed hostnames for link preview (security allowlist). */
const ALLOWED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
  'twitter.com',
  'x.com',
  'www.twitter.com',
  'www.x.com',
])

export type LinkPreviewResponse = {
  url: string
  title: string | null
  thumbnail_url: string | null
  description: string | null
  site_name: string | null
}

function isValidUrl(input: string): URL | null {
  try {
    const url = new URL(input.startsWith('www.') ? `https://${input}` : input)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const host = url.hostname.toLowerCase()
    if (!ALLOWED_HOSTS.has(host)) return null
    return url
  } catch {
    return null
  }
}

/** YouTube oEmbed: https://www.youtube.com/oembed?url=...&format=json */
async function fetchYouTubePreview(url: URL): Promise<LinkPreviewResponse | null> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url.toString())}&format=json`
  try {
    const res = await fetch(oembedUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { title?: string; thumbnail_url?: string; author_name?: string }
    return {
      url: url.toString(),
      title: data.title ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
      description: data.author_name ? `Channel: ${data.author_name}` : null,
      site_name: 'YouTube',
    }
  } catch {
    return null
  }
}

/** Vimeo oEmbed */
async function fetchVimeoPreview(url: URL): Promise<LinkPreviewResponse | null> {
  const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url.toString())}`
  try {
    const res = await fetch(oembedUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { title?: string; thumbnail_url?: string; description?: string }
    return {
      url: url.toString(),
      title: data.title ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
      description: data.description ?? null,
      site_name: 'Vimeo',
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get('url')
  if (!rawUrl || typeof rawUrl !== 'string') {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  const url = isValidUrl(rawUrl.trim())
  if (!url) {
    return NextResponse.json({ error: 'Invalid or disallowed URL' }, { status: 400 })
  }

  const host = url.hostname.toLowerCase()
  let preview: LinkPreviewResponse | null = null

  if (host === 'youtu.be' || host.includes('youtube.com')) {
    preview = await fetchYouTubePreview(url)
  } else if (host.includes('vimeo.com')) {
    preview = await fetchVimeoPreview(url)
  }

  if (!preview) {
    return NextResponse.json(
      { error: 'Preview not available for this URL', url: url.toString() },
      { status: 404 }
    )
  }

  return NextResponse.json(preview)
}
