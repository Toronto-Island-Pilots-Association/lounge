import { requireAdmin } from '@/lib/auth'
import { sendInvitationWithPasswordEmail } from '@/lib/resend'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Generate a secure temporary password
function generateTempPassword(): string {
  // Generate a 12-character password with mix of uppercase, lowercase, numbers
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowercase = 'abcdefghijkmnpqrstuvwxyz'
  const numbers = '23456789'
  const allChars = uppercase + lowercase + numbers
  
  let password = ''
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const {
      email,
      firstName,
      lastName,
    } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase admin credentials not configured' },
        { status: 500 }
      )
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const adminClient = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const normalizedEmail = email.toLowerCase().trim()

    // Check if profile exists first (simpler check)
    const supabase = await createClient()
    const { data: existingMember } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('email', normalizedEmail)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { 
          error: 'This email is already registered as a member',
          details: `Member: ${existingMember.full_name || existingMember.email}`
        },
        { status: 400 }
      )
    }

    // Generate temporary password
    const tempPassword = generateTempPassword()
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || null

    // Create auth user with temporary password
    // This will fail if the email already exists in auth.users
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        first_name: firstName || null,
        last_name: lastName || null,
        role: 'member',
        membership_level: 'basic',
        invited_by_admin: true, // Flag to indicate this user was invited
      }
    })

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError)
      
      // Check if error is due to existing user
      if (createError?.message?.toLowerCase().includes('already') || 
          createError?.message?.toLowerCase().includes('exists') ||
          createError?.message?.toLowerCase().includes('duplicate')) {
        return NextResponse.json(
          { 
            error: 'This email is already registered',
            details: 'A user with this email already exists'
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create user account',
          details: createError?.message || 'Unknown error'
        },
        { status: 500 }
      )
    }

    // Wait for profile to be created by trigger, or create manually
    let profile = null
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      const { data: fetchedProfile } = await adminClient
        .from('user_profiles')
        .select('*')
        .eq('id', newUser.user.id)
        .single()
      
      if (fetchedProfile) {
        profile = fetchedProfile
        break
      }
    }

    // Create profile manually if trigger didn't create it
    // Keep status as 'pending' - will be updated to 'approved' when they log in and change password
    if (!profile) {
      const { error: profileError } = await adminClient
        .from('user_profiles')
        .insert({
          id: newUser.user.id,
          email: normalizedEmail,
          full_name: fullName,
          first_name: firstName || null,
          last_name: lastName || null,
          role: 'member',
          membership_level: 'basic',
          status: 'pending', // Will be updated to 'approved' when they log in
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // User was created but profile failed - still send email
      }
    }

    // Send invitation email with temporary password
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    await sendInvitationWithPasswordEmail(
      normalizedEmail,
      fullName || normalizedEmail,
      tempPassword,
      appUrl
    )

    return NextResponse.json({
      message: 'Invitation sent successfully with temporary password',
      email: normalizedEmail,
    })
  } catch (error: any) {
    console.error('Invite member error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while sending invitation' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}

