import { requireAdmin } from '@/lib/auth'
import { sendInvitationWithPasswordEmail } from '@/lib/resend'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Generate a secure temporary password
function generateTempPassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowercase = 'abcdefghijkmnpqrstuvwxyz'
  const numbers = '23456789'
  const allChars = uppercase + lowercase + numbers
  
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Parse CSV content
function parseCSV(csvContent: string): Array<{ email: string; firstName?: string; lastName?: string }> {
  const lines = csvContent.trim().split('\n')
  if (lines.length === 0) return []
  
  // Check if first line is header
  const hasHeader = lines[0].toLowerCase().includes('email')
  const dataLines = hasHeader ? lines.slice(1) : lines
  
  const users: Array<{ email: string; firstName?: string; lastName?: string }> = []
  
  for (const line of dataLines) {
    if (!line.trim()) continue
    
    // Parse CSV line (handles quoted values)
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim()) // Add last value
    
    if (values.length === 0) continue
    
    const email = values[0]?.trim()
    if (!email || !email.includes('@')) continue
    
    users.push({
      email,
      firstName: values[1]?.trim() || undefined,
      lastName: values[2]?.trim() || undefined,
    })
  }
  
  return users
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      )
    }
    
    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json(
        { error: 'File must be a CSV file' },
        { status: 400 }
      )
    }
    
    // Read file content
    const csvContent = await file.text()
    const users = parseCSV(csvContent)
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No valid users found in CSV file' },
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

    const results = {
      success: [] as Array<{ email: string; password: string }>,
      skipped: [] as Array<{ email: string; reason: string }>,
      errors: [] as Array<{ email: string; error: string }>
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Process users sequentially to avoid rate limits
    for (const user of users) {
      const normalizedEmail = user.email.toLowerCase().trim()
      
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        results.errors.push({ email: user.email, error: 'Invalid email format' })
        continue
      }

      try {
        // Generate temporary password
        const tempPassword = generateTempPassword()
        const fullName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.firstName || user.lastName || null

        // Create auth user (will fail if email already exists)
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            first_name: user.firstName || null,
            last_name: user.lastName || null,
            role: 'member',
            membership_level: 'Regular',
            invited_by_admin: true,
          }
        })

        if (createError || !newUser.user) {
          // Check if error is due to existing user
          if (createError?.message?.toLowerCase().includes('already') || 
              createError?.message?.toLowerCase().includes('exists') ||
              createError?.message?.toLowerCase().includes('duplicate')) {
            results.skipped.push({ email: normalizedEmail, reason: 'User already exists' })
          } else {
            results.errors.push({ 
              email: normalizedEmail, 
              error: createError?.message || 'Failed to create user' 
            })
          }
          continue
        }

        // Wait for profile to be created by trigger
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
              first_name: user.firstName || null,
              last_name: user.lastName || null,
              role: 'member',
              membership_level: 'Regular',
              status: 'pending', // Will be updated to 'approved' when they log in
            })

          if (profileError) {
            console.error(`Error creating profile for ${normalizedEmail}:`, profileError)
            // Continue anyway - user was created
          }
        }

        // Send invitation email
        try {
          await sendInvitationWithPasswordEmail(
            normalizedEmail,
            fullName || normalizedEmail,
            tempPassword,
            appUrl
          )
          results.success.push({ email: normalizedEmail, password: tempPassword })
        } catch (emailError: any) {
          // User created but email failed
          results.errors.push({ 
            email: normalizedEmail, 
            error: `User created but email failed: ${emailError.message}` 
          })
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error: any) {
        results.errors.push({ 
          email: normalizedEmail, 
          error: error.message || 'Unknown error' 
        })
      }
    }

    return NextResponse.json({
      message: `Processed ${users.length} users`,
      results: {
        total: users.length,
        success: results.success.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
        details: {
          success: results.success,
          skipped: results.skipped,
          errors: results.errors,
        }
      }
    })
  } catch (error: any) {
    console.error('Bulk invite error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while processing bulk invites' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}

