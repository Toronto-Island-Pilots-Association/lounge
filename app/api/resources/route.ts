import { requireAuth, requireAdmin, isOrgPublic } from '@/lib/auth'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getFeatureFlags } from '@/lib/settings'
import { headers } from 'next/headers'
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

export async function GET() {
  try {
    let orgId: string | null = null
    let supabase: ReturnType<typeof createServiceRoleClient>

    try {
      const user = await requireAuth()
      orgId = user.profile.org_id
      if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      supabase = await createClient() as any
    } catch {
      const orgPublic = await isOrgPublic()
      if (!orgPublic) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const h = await headers()
      orgId = h.get('x-org-id')
      supabase = createServiceRoleClient() as any
    }

    const flags = await getFeatureFlags()
    if (!flags.resources) {
      return NextResponse.json({ error: 'Announcements are not enabled for this organization' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Get signed URLs for all images and files
    const resourcesWithSignedUrls = await Promise.all(
      (data || []).map(async (resource) => {
        const signedImageUrl = await getResourceFileUrl(supabase, resource.image_url)
        const signedFileUrl = await getResourceFileUrl(supabase, resource.file_url)
        return {
          ...resource,
          image_url: signedImageUrl,
          file_url: signedFileUrl,
        }
      })
    )

    return NextResponse.json({ resources: resourcesWithSignedUrls })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
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
        { error: 'Add billing details in Billing before publishing announcements.' },
        { status: 402 },
      )
    }
    const body = await request.json()

    if (body.category && !VALID_ANNOUNCEMENT_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_ANNOUNCEMENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }
    const insertData: Record<string, unknown> = {
      ...body,
      // Force tenant scoping regardless of any incoming `org_id`.
      org_id: orgId,
      category: body.category && VALID_ANNOUNCEMENT_CATEGORIES.includes(body.category) ? body.category : 'other',
    }

    // Prevent accidental/hostile cross-org writes.
    delete (insertData as any).org_id
    insertData.org_id = orgId

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('resources')
      .insert(insertData)
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
