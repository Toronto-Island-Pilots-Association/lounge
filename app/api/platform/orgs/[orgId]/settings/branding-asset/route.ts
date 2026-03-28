import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET = 'org-branding'
const MAX_BYTES = 5 * 1024 * 1024

const LOGO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])
const FAVICON_TYPES = new Set([
  ...LOGO_TYPES,
  'image/x-icon',
  'image/vnd.microsoft.icon',
])

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
}

async function verifyOrgAdmin(orgId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const db = createServiceRoleClient()
  const { data } = await db
    .from('org_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .eq('role', 'admin')
    .maybeSingle()
  return data ? user : null
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  try {
    return decodeURIComponent(url.slice(i + marker.length))
  } catch {
    return null
  }
}

function safeExt(file: File, mime: string): string | null {
  const fromName = (file.name.split('.').pop() || '').toLowerCase()
  if (fromName && EXT_MIME[fromName] === mime) return fromName
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/svg+xml') return 'svg'
  if (mime === 'image/x-icon' || mime === 'image/vnd.microsoft.icon') return 'ico'
  return null
}

function effectiveMime(file: File): string {
  if (file.type) return file.type
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return EXT_MIME[ext] || ''
}

async function removeStoredObjectIfOurs(db: ReturnType<typeof createServiceRoleClient>, url: string | null) {
  if (!url) return
  const path = storagePathFromPublicUrl(url)
  if (!path) return
  await db.storage.from(BUCKET).remove([path])
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyOrgAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const kindRaw = formData.get('kind')
  const kind = kindRaw === 'favicon' ? 'favicon' : 'logo'

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const mime = effectiveMime(file)
  const allowed = kind === 'favicon' ? FAVICON_TYPES : LOGO_TYPES
  if (!mime || !allowed.has(mime)) {
    return NextResponse.json(
      {
        error:
          kind === 'favicon'
            ? 'Use PNG, JPEG, WebP, GIF, SVG, or ICO for the favicon.'
            : 'Use PNG, JPEG, WebP, GIF, or SVG for the logo.',
      },
      { status: 400 }
    )
  }

  const ext = safeExt(file, mime)
  if (!ext) {
    return NextResponse.json({ error: 'Could not determine a safe file extension.' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be 5MB or smaller.' }, { status: 400 })
  }

  const db = createServiceRoleClient()
  const { data: orgRow } = await db
    .from('organizations')
    .select('logo_url, favicon_url')
    .eq('id', orgId)
    .maybeSingle()

  const previousUrl =
    kind === 'favicon' ? orgRow?.favicon_url ?? null : orgRow?.logo_url ?? null

  const objectPath = `${orgId}/${kind}-${Date.now()}.${ext}`

  const { error: uploadError } = await db.storage.from(BUCKET).upload(objectPath, file, {
    contentType: mime,
    upsert: false,
  })

  if (uploadError) {
    console.error('Org branding upload:', uploadError)
    return NextResponse.json({ error: 'Upload failed. Try again or use a smaller file.' }, { status: 500 })
  }

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(objectPath)
  const publicUrl = urlData.publicUrl

  const patch = kind === 'favicon' ? { favicon_url: publicUrl } : { logo_url: publicUrl }
  const { error: updateError } = await db.from('organizations').update(patch).eq('id', orgId)

  if (updateError) {
    await db.storage.from(BUCKET).remove([objectPath])
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await removeStoredObjectIfOurs(db, previousUrl)

  return NextResponse.json({ url: publicUrl, kind })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyOrgAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind') === 'favicon' ? 'favicon' : 'logo'

  const db = createServiceRoleClient()
  const { data: orgRow } = await db
    .from('organizations')
    .select('logo_url, favicon_url')
    .eq('id', orgId)
    .maybeSingle()

  const current = kind === 'favicon' ? orgRow?.favicon_url ?? null : orgRow?.logo_url ?? null
  await removeStoredObjectIfOurs(db, current)

  const patch = kind === 'favicon' ? { favicon_url: null as string | null } : { logo_url: null as string | null }
  const { error } = await db.from('organizations').update(patch).eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, kind })
}
