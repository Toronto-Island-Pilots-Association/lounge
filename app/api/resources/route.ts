import { requireAuth, requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('resources')
      .select('*')
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
    await requireAdmin()
    const body = await request.json()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('resources')
      .insert(body)
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

