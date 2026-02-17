import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTrialEndDateAsync, getMembershipFeeForLevel } from '@/lib/settings'
import type { MembershipLevelKey } from '@/lib/settings'
import { NextResponse } from 'next/server'

// Helper function to escape CSV values
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  const stringValue = String(value)
  // If the value contains comma, newline, or quote, wrap it in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

// Helper function to convert array of objects to CSV
function arrayToCsv(data: any[], headers: string[]): string {
  const rows = data.map((row) =>
    headers.map((header) => escapeCsvValue(row[header] || '')).join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

export async function GET() {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('user_id, amount, currency, payment_method, payment_date')
      .order('payment_date', { ascending: false })

    const latestPaymentByUser = new Map<string, { amount: number; currency: string; payment_method: string; payment_date: string }>()
    for (const p of payments ?? []) {
      if (!latestPaymentByUser.has(p.user_id)) {
        latestPaymentByUser.set(p.user_id, {
          amount: p.amount,
          currency: p.currency || 'CAD',
          payment_method: p.payment_method,
          payment_date: p.payment_date || '',
        })
      }
    }

    const membersWithEnrichment = await Promise.all(
      (profiles ?? []).map(async (member) => {
        const level = (member.membership_level || 'Full') as MembershipLevelKey
        const trialEnd = await getTrialEndDateAsync(level, member.created_at ?? null)
        const expected_fee = await getMembershipFeeForLevel(level)
        const payment_summary = latestPaymentByUser.get(member.id) ?? null
        return {
          ...member,
          trial_end: trialEnd ? trialEnd.toISOString() : null,
          expected_fee,
          payment_summary,
        }
      })
    )

    // Define CSV headers (include all new member info)
    const headers = [
      'ID',
      'Email',
      'Full Name',
      'First Name',
      'Last Name',
      'Phone',
      'Street',
      'City',
      'Province/State',
      'Postal/Zip Code',
      'Country',
      'Pilot License Type',
      'Aircraft Type',
      'Call Sign',
      'How Often Fly From YTZ',
      'How Did You Hear',
      'Role',
      'Status',
      'Membership Level',
      'Member Number',
      'Membership Expires At',
      'Trial End',
      'Expected Fee (CAD)',
      'Stripe Subscription ID',
      'Stripe Customer ID',
      'Cancellation Scheduled',
      'Last Payment Amount',
      'Last Payment Currency',
      'Last Payment Method',
      'Last Payment Date',
      'Is Student Pilot',
      'Flight School',
      'Instructor Name',
      'Profile Picture URL',
      'Created At',
      'Updated At',
    ]

    const memberData = membersWithEnrichment.map((member) => {
      const last = member.payment_summary
      return {
        'ID': member.id,
        'Email': member.email,
        'Full Name': member.full_name || '',
        'First Name': member.first_name || '',
        'Last Name': member.last_name || '',
        'Phone': member.phone || '',
        'Street': member.street || '',
        'City': member.city || '',
        'Province/State': member.province_state || '',
        'Postal/Zip Code': member.postal_zip_code || '',
        'Country': member.country || '',
        'Pilot License Type': member.pilot_license_type || '',
        'Aircraft Type': member.aircraft_type || '',
        'Call Sign': member.call_sign || '',
        'How Often Fly From YTZ': member.how_often_fly_from_ytz || '',
        'How Did You Hear': member.how_did_you_hear || '',
        'Role': member.role,
        'Status': member.status || '',
        'Membership Level': member.membership_level,
        'Member Number': member.member_number || '',
        'Membership Expires At': member.membership_expires_at || '',
        'Trial End': member.trial_end || '',
        'Expected Fee (CAD)': member.expected_fee ?? '',
        'Stripe Subscription ID': member.stripe_subscription_id || '',
        'Stripe Customer ID': member.stripe_customer_id || '',
        'Cancellation Scheduled': member.subscription_cancel_at_period_end ? 'Yes' : 'No',
        'Last Payment Amount': last ? String(last.amount) : '',
        'Last Payment Currency': last?.currency || '',
        'Last Payment Method': last?.payment_method || '',
        'Last Payment Date': last?.payment_date || '',
        'Is Student Pilot': member.is_student_pilot ? 'Yes' : 'No',
        'Flight School': member.flight_school || '',
        'Instructor Name': member.instructor_name || '',
        'Profile Picture URL': member.profile_picture_url || '',
        'Created At': member.created_at || '',
        'Updated At': member.updated_at || '',
      }
    })

    // Generate CSV
    const csv = arrayToCsv(memberData, headers)

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0]
    const filename = `tipa-members-export-${date}.csv`

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 }
    )
  }
}

