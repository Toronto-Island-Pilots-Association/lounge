import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendInvitationReminderEmail } from '@/lib/resend'
import { NextResponse } from 'next/server'

const MAX_REMINDERS = 3
const NUDGE_INTERVAL_DAYS = 7

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

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const adminClient = createServiceRoleClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const cutoff = new Date(Date.now() - NUDGE_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

    // Find pending invited members eligible for a nudge:
    // - invited but never reminded, OR last reminder was >7 days ago
    // - under the 3-reminder cap
    const { data: members, error: fetchError } = await adminClient
      .from('user_profiles')
      .select('id, email, full_name, reminder_count, last_reminder_sent_at')
      .eq('status', 'pending')
      .not('invited_at', 'is', null)
      .lt('reminder_count', MAX_REMINDERS)
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${cutoff}`)

    if (fetchError) {
      console.error('Error fetching pending members:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch pending members' }, { status: 500 })
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending members to nudge', nudged: 0 })
    }

    let succeeded = 0
    let failed = 0

    for (const member of members) {
      try {
        const newTempPassword = generateTempPassword()

        const { error: authError } = await adminClient.auth.admin.updateUserById(member.id, {
          password: newTempPassword,
        })

        if (authError) {
          console.error(`Failed to reset password for ${member.email}:`, authError)
          failed++
          continue
        }

        await sendInvitationReminderEmail(
          member.email,
          member.full_name || member.email,
          newTempPassword,
          appUrl
        )

        await adminClient
          .from('user_profiles')
          .update({
            last_reminder_sent_at: new Date().toISOString(),
            reminder_count: (Number(member.reminder_count) || 0) + 1,
          })
          .eq('id', member.id)

        succeeded++
      } catch (err) {
        console.error(`Error nudging member ${member.email}:`, err)
        failed++
      }
    }

    console.log(`Nudge cron complete: ${succeeded} sent, ${failed} failed`)

    return NextResponse.json({
      success: true,
      nudged: succeeded,
      failed,
      total: members.length,
    })
  } catch (error: any) {
    console.error('Error in nudge-pending-members cron:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}
