import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// POST - Upload profile picture
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

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
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const bucketName = 'profile-pictures'

    // Delete old profile picture if it exists
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('profile_picture_url')
      .eq('id', user.id)
      .single()

    if (profile?.profile_picture_url) {
      // Extract path from Supabase storage URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlParts = profile.profile_picture_url.split('/')
      const publicIndex = urlParts.indexOf('public')
      if (publicIndex !== -1 && publicIndex < urlParts.length - 1) {
        const oldPath = urlParts.slice(publicIndex + 2).join('/')
        await supabase.storage.from(bucketName).remove([oldPath])
      }
    }

    // Upload new file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: uploadError.message || 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    // Update user profile with new picture URL
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ profile_picture_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      // If update fails, try to clean up the uploaded file
      await supabase.storage.from(bucketName).remove([fileName])
      return NextResponse.json(
        { error: updateError.message || 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      url: publicUrl,
      message: 'Profile picture updated successfully' 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// DELETE - Remove profile picture
export async function DELETE() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get current profile picture URL
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('profile_picture_url')
      .eq('id', user.id)
      .single()

    if (profile?.profile_picture_url) {
      // Extract path from Supabase storage URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlParts = profile.profile_picture_url.split('/')
      const publicIndex = urlParts.indexOf('public')
      const bucketName = 'profile-pictures'
      
      if (publicIndex !== -1 && publicIndex < urlParts.length - 1) {
        const fileName = urlParts.slice(publicIndex + 2).join('/')
        // Delete file from storage
        await supabase.storage.from(bucketName).remove([fileName])
      }
    }

    // Update profile to remove picture URL
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ profile_picture_url: null })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to remove profile picture' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Profile picture removed successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

