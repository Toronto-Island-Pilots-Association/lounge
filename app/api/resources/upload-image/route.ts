import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per image
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// POST - Upload image to resources bucket
export async function POST(request: Request) {
  try {
    const user = await requireAdmin()
    const supabase = await createClient()
    
    // Verify the session is valid for storage operations
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      console.error('Session error in image upload:', sessionError)
      return NextResponse.json(
        { error: 'Session expired. Please refresh the page and try again.' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const bucketName = 'resources'

    // Upload file to resources bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      const errorMessage = uploadError.message || ''
      if (errorMessage.includes('401') || 
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('Bucket not found') ||
          errorMessage.includes('does not exist')) {
        console.error('Storage bucket configuration issue:', errorMessage)
        return NextResponse.json(
          { error: 'Unable to upload image. Please contact support if this issue persists.' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to upload image. Please try again.' },
        { status: 500 }
      )
    }

    // For private buckets, create signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000) // 1 year expiration

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      // Fallback: try getPublicUrl
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl
      
      return NextResponse.json({ 
        url: publicUrl,
        path: fileName,
        message: 'Image uploaded successfully' 
      })
    }

    const signedUrl = signedUrlData.signedUrl

    return NextResponse.json({ 
      url: signedUrl,
      path: fileName,
      message: 'Image uploaded successfully' 
    })
  } catch (error: any) {
    console.error('Image upload error:', error)
    if (error.message === 'Unauthorized' || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required to upload images' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'An error occurred while uploading the image' },
      { status: 500 }
    )
  }
}
