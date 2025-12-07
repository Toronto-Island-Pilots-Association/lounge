import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
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

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Define CSV headers
    const headers = [
      'ID',
      'Email',
      'Full Name',
      'First Name',
      'Last Name',
      'Phone',
      'Pilot License Type',
      'Aircraft Type',
      'Call Sign',
      'How Often Fly From YTZ',
      'How Did You Hear',
      'Role',
      'Membership Level',
      'Membership Expires At',
      'PayPal Subscription ID',
      'Profile Picture URL',
      'Created At',
      'Updated At',
    ]

    // Map database column names to CSV headers
    const memberData = (data || []).map((member) => ({
      'ID': member.id,
      'Email': member.email,
      'Full Name': member.full_name || '',
      'First Name': member.first_name || '',
      'Last Name': member.last_name || '',
      'Phone': member.phone || '',
      'Pilot License Type': member.pilot_license_type || '',
      'Aircraft Type': member.aircraft_type || '',
      'Call Sign': member.call_sign || '',
      'How Often Fly From YTZ': member.how_often_fly_from_ytz || '',
      'How Did You Hear': member.how_did_you_hear || '',
      'Role': member.role,
      'Membership Level': member.membership_level,
      'Membership Expires At': member.membership_expires_at || '',
      'PayPal Subscription ID': member.paypal_subscription_id || '',
      'Profile Picture URL': member.profile_picture_url || '',
      'Created At': member.created_at || '',
      'Updated At': member.updated_at || '',
    }))

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

