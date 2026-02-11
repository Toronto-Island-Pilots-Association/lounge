import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// This endpoint should be protected with a secret token or Vercel Cron
// For Vercel Cron, add this to vercel.json
// For external cron services, use a secret token in the Authorization header

export async function GET(request: Request) {
  try {
    // Verify the request is from a trusted source
    // For Vercel Cron, check for the Authorization header with "Bearer <vercel-secret>"
    // For external cron services, check CRON_SECRET environment variable
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // If CRON_SECRET is set, require it to match (for external cron services)
    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }
    // If CRON_SECRET is not set, we assume Vercel Cron is being used
    // Vercel automatically adds authentication headers to cron requests
    // In development/testing, you can call this endpoint directly

    const supabase = await createClient()

    // Get current date/time
    const now = new Date()
    const nowISO = now.toISOString()

    // Find all approved members whose membership has expired
    // Exclude admins from automatic expiration
    const { data: expiredMembers, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, membership_expires_at, status')
      .eq('status', 'approved')
      .neq('role', 'admin')
      .not('membership_expires_at', 'is', null)
      .lt('membership_expires_at', nowISO)

    if (fetchError) {
      console.error('Error fetching expired members:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch expired members', details: fetchError.message },
        { status: 500 }
      )
    }

    // If no expired members, return early
    if (!expiredMembers || expiredMembers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No members found with expired memberships',
        membersExpired: 0,
        membersChecked: 0,
      })
    }

    // Update status to 'expired' for all expired members
    const memberIds = expiredMembers.map(m => m.id)
    const { data: updatedMembers, error: updateError } = await supabase
      .from('user_profiles')
      .update({ status: 'expired' })
      .in('id', memberIds)
      .select('id, email, full_name')

    if (updateError) {
      console.error('Error updating expired members:', updateError)
      return NextResponse.json(
        { error: 'Failed to update expired members', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`Expired ${updatedMembers?.length || 0} members:`, {
      memberIds: updatedMembers?.map(m => m.id),
      emails: updatedMembers?.map(m => m.email),
    })

    return NextResponse.json({
      success: true,
      message: `Successfully expired ${updatedMembers?.length || 0} member(s)`,
      membersExpired: updatedMembers?.length || 0,
      membersChecked: expiredMembers.length,
      expiredMembers: updatedMembers?.map(m => ({
        id: m.id,
        email: m.email,
        name: m.full_name,
      })),
    })
  } catch (error: any) {
    console.error('Error in expire members cron:', error)
    return NextResponse.json(
      { 
        error: 'Failed to expire members',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
