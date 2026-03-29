import { requireAdmin } from '@/lib/auth'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: Request) {
  try {
    const user = await requireAdmin()
    const orgId = user.profile.org_id
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const billingStatus = await getOrgBillingActivationStatus(orgId)
    if (billingStatus.requiresActivation) {
      return NextResponse.json(
        { error: 'Add billing details in Billing before uploading page images.' },
        { status: 402 },
      )
    }

    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session expired. Please refresh and try again.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 },
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    // Store under pages/ prefix in the shared resources bucket
    const fileName = `pages/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload image. Please try again.' }, { status: 500 })
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('resources')
      .createSignedUrl(fileName, 31536000) // 1 year

    if (signedUrlError) {
      const { data: urlData } = supabase.storage.from('resources').getPublicUrl(fileName)
      return NextResponse.json({ url: urlData.publicUrl, path: fileName })
    }

    return NextResponse.json({ url: signedUrlData.signedUrl, path: fileName })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred while uploading the image' },
      { status: 500 },
    )
  }
}
