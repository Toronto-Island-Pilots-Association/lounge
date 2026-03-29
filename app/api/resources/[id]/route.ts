import { requireAuth, requireAdmin } from '@/lib/auth'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags } from '@/lib/settings'
import { NextResponse } from 'next/server'
import type { ResourceCategory } from '@/types/database'

const VALID_ANNOUNCEMENT_CATEGORIES: ResourceCategory[] = ['tipa_newsletters', 'airport_updates', 'reminder', 'other']

// Helper function to get signed URL for resource file/image
async function getResourceFileUrl(supabase: any, fileUrl: string | null): Promise<string | null> {
  if (!fileUrl) return null
  
  // If it's already a full URL (signed URL), return as-is
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl
  }
  
  // Otherwise, it's a storage path - create signed URL
  try {
    const { data, error } = await supabase.storage
      .from('resources')
      .createSignedUrl(fileUrl, 3600) // 1 hour expiration
    
    if (error || !data) {
      console.error('Error creating signed URL for resource file:', error)
      return null
    }
    
    return data.signedUrl
  } catch (error) {
    console.error('Error getting resource file URL:', error)
    return null
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const flags = await getFeatureFlags()
    if (!flags.resources) {
      return NextResponse.json({ error: 'Announcements are not enabled for this organization' }, { status: 403 })
    }
    const orgId = user.profile.org_id
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Get signed URLs for image and file
    const signedImageUrl = await getResourceFileUrl(supabase, data.image_url)
    const signedFileUrl = await getResourceFileUrl(supabase, data.file_url)

    return NextResponse.json({
      resource: {
        ...data,
        image_url: signedImageUrl,
        file_url: signedFileUrl,
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()
    const flags = await getFeatureFlags()
    if (!flags.resources) {
      return NextResponse.json({ error: 'Announcements are not enabled for this organization' }, { status: 403 })
    }
    const orgId = user.profile.org_id
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const billingStatus = await getOrgBillingActivationStatus(orgId)
    if (billingStatus.requiresActivation) {
      return NextResponse.json(
        { error: `Activate ${billingStatus.planLabel} in Billing before publishing announcements.` },
        { status: 402 },
      )
    }
    const { id } = await params
    const body = await request.json()

    if (body.category !== undefined && !VALID_ANNOUNCEMENT_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_ANNOUNCEMENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Prevent cross-tenant updates if a malicious client includes `org_id`.
    if ('org_id' in body) delete (body as any).org_id

    const { data, error } = await supabase
      .from('resources')
      .update(body)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ resource: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()
    const flags = await getFeatureFlags()
    if (!flags.resources) {
      return NextResponse.json({ error: 'Announcements are not enabled for this organization' }, { status: 403 })
    }
    const orgId = user.profile.org_id
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const billingStatus = await getOrgBillingActivationStatus(orgId)
    if (billingStatus.requiresActivation) {
      return NextResponse.json(
        { error: `Activate ${billingStatus.planLabel} in Billing before publishing announcements.` },
        { status: 402 },
      )
    }
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Resource deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}
