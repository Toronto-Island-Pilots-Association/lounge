import { requireAdmin } from '@/lib/auth'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { sendInvitationReminderEmail } from '@/lib/resend'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const COOLDOWN_HOURS = 24
const MAX_REMINDERS = 3

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const orgId = request.headers.get('x-org-id')
    if (!orgId) {
      return NextResponse.json({ error: 'Missing org context' }, { status: 400 })
    }
    const billingStatus = await getOrgBillingActivationStatus(orgId)
    if (billingStatus.requiresActivation) {
      return NextResponse.json(
        { error: `Activate ${billingStatus.planLabel} in Billing before sending invite reminders.` },
        { status: 402 },
      )
    }
    const { id: memberId } = await params
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    // member_profiles view: id = org_memberships.id; user_id = auth user id
    const { data: profile, error: fetchError } = await supabase
      .from('member_profiles')
      .select('id, user_id, email, full_name, status, invited_at, last_reminder_sent_at, reminder_count')
      .eq('id', memberId)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (profile.status !== 'pending' || !profile.invited_at) {
      return NextResponse.json(
        { error: 'Only invited members who have not yet registered can receive a reminder' },
        { status: 400 }
      )
    }

    const count = Number(profile.reminder_count) || 0
    if (count >= MAX_REMINDERS) {
      return NextResponse.json(
        { error: `Maximum reminder limit (${MAX_REMINDERS}) reached for this member` },
        { status: 400 }
      )
    }

    const lastSent = profile.last_reminder_sent_at ? new Date(profile.last_reminder_sent_at) : null
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000
    if (lastSent && Date.now() - lastSent.getTime() < cooldownMs) {
      const nextAt = new Date(lastSent.getTime() + cooldownMs)
      return NextResponse.json(
        {
          error: `Please wait until ${nextAt.toLocaleString()} before sending another reminder (24h cooldown)`,
        },
        { status: 429 }
      )
    }

    const newTempPassword = generateTempPassword()
    const adminClient = createServiceRoleClient()
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(profile.user_id, {
      password: newTempPassword,
    })

    if (updateAuthError) {
      console.error('Resend invite: failed to update auth password', updateAuthError)
      return NextResponse.json(
        { error: 'Failed to update account. Please try again.' },
        { status: 500 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://clublounge.local:3000'

    await sendInvitationReminderEmail(
      profile.email,
      profile.full_name || profile.email,
      newTempPassword,
      appUrl
    )

    const { error: updateProfileError } = await supabase
      .from('org_memberships')
      .update({
        last_reminder_sent_at: new Date().toISOString(),
        reminder_count: count + 1,
      })
      .eq('id', memberId)
      .eq('org_id', orgId)

    if (updateProfileError) {
      console.error('Resend invite: failed to update profile', updateProfileError)
      // Email was sent; still return success
    }

    return NextResponse.json({
      message: 'Reminder sent successfully',
      reminder_count: count + 1,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: message },
      { status: message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}
