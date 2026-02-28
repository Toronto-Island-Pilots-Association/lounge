import { Resend } from 'resend'

export const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string
  subject: string
  html: string
  attachments?: Array<{ filename: string; content: string }>
}) {
  if (!resend) {
    console.warn('Resend API key not configured. Email not sent.')
    return { success: false, error: 'Resend not configured' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@example.com'
  
  // Warn if using default/unverified domain
  if (fromEmail.includes('example.com') || fromEmail.includes('resend.dev')) {
    console.warn('⚠️  Using unverified email address. Please verify your domain in Resend to improve deliverability.')
  }

  try {
    const emailOptions: any = {
      from: fromEmail,
      to,
      subject,
      html,
    }

    if (attachments && attachments.length > 0) {
      emailOptions.attachments = attachments.map(att => ({
        filename: att.filename,
        content: Buffer.from(att.content).toString('base64'),
      }))
    }

    const { data, error } = await resend.emails.send(emailOptions)

    if (error) {
      console.error('Error sending email to', to, ':', error)
      // Log specific error details for debugging
      if (error.message) {
        console.error('Error details:', error.message)
      }
      return { success: false, error }
    }

    console.log(`✅ Email sent successfully to ${to}`)
    return { success: true, data }
  } catch (error: any) {
    console.error('Error sending email to', to, ':', error)
    if (error.message) {
      console.error('Error details:', error.message)
    }
    return { success: false, error: error.message || error }
  }
}

// Generate iCal format for calendar events
export function generateICal({
  title,
  description,
  location,
  startTime,
  endTime,
  url,
}: {
  title: string
  description?: string | null
  location?: string | null
  startTime: string
  endTime?: string | null
  url?: string
}): string {
  const formatDate = (date: string) => {
    return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const uid = `${Date.now()}-${Math.random().toString(36).substring(7)}@tipa.ca`
  const now = formatDate(new Date().toISOString())
  const dtstart = formatDate(startTime)
  const dtend = endTime ? formatDate(endTime) : formatDate(new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString())

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TIPA//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${title.replace(/,/g, '\\,').replace(/;/g, '\\;')}`,
  ]

  if (description) {
    ical.push(`DESCRIPTION:${description.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')}`)
  }

  if (location) {
    ical.push(`LOCATION:${location.replace(/,/g, '\\,').replace(/;/g, '\\;')}`)
  }

  if (url) {
    ical.push(`URL:${url}`)
  }

  ical.push('END:VEVENT', 'END:VCALENDAR')

  return ical.join('\r\n')
}

export async function sendWelcomeEmail(email: string, name: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  return sendEmail({
    to: email,
    subject: 'Welcome to Toronto Island Pilots Association!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; margin-bottom: 20px;">Welcome to TIPA, ${name}!</h1>
        <p style="color: #374151; line-height: 1.6;">
          Thank you for joining the Toronto Island Pilots Association. We're excited to have you as a member of our community.
        </p>
        <div style="background-color: #f0f9ff; border-left: 4px solid #0d1e26; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #374151; line-height: 1.6; margin: 0;">
            <strong>Your account is ready!</strong> Your email has been verified and you can log in immediately. Your access will be limited until an admin approves your membership.
          </p>
        </div>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${appUrl}/login" style="display: inline-block; background-color: #0d1e26; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Log In to Your Account
          </a>
        </div>
        <p style="color: #374151; line-height: 1.6;">
          Once your account is approved by an admin, you'll have access to:
        </p>
        <ul style="color: #374151; line-height: 1.8; margin-left: 20px;">
          <li>Member resources and exclusive content</li>
          <li>Community events and networking opportunities</li>
          <li>Advocacy efforts for GA at CYTZ</li>
          <li>Connection with other GA pilots in Toronto</li>
        </ul>
        <p style="margin-top: 30px; color: #374151; line-height: 1.6;">
          <strong>What's next?</strong> Your membership application is currently pending admin approval. You'll receive an email notification once your account has been approved and you'll have full access to all member features.
        </p>
        <p style="margin-top: 20px; color: #374151; line-height: 1.6;">
          We look forward to seeing you at our events and working together to support general aviation at Billy Bishop Toronto City Airport.
        </p>
        <p style="margin-top: 20px; color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>The TIPA Team</strong>
        </p>
      </div>
    `,
  })
}

/** Details for subscription confirmation email (charge date, amount, validity). */
export type SubscriptionConfirmationDetails = {
  /** Amount actually charged today (may be 0 for trial subscriptions). */
  amountPaid: number
  /** Amount that will be charged on the next renewal (full membership fee). */
  nextAmount: number
  currency: string
  /** When the next payment will be taken (e.g. end of trial or next year). */
  nextChargeDate: Date | null
  /** Membership valid until this date. */
  validUntil: Date
  paymentMethod: 'stripe'
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Sends a subscription confirmation email with charge date, amount, and validity.
 * Use this instead of the generic "Membership Upgrade" email.
 */
export async function sendSubscriptionConfirmationEmail(
  email: string,
  name: string,
  details: SubscriptionConfirmationDetails
) {
  const { amountPaid, nextAmount, currency, nextChargeDate, validUntil, paymentMethod } = details
  const fmt = (v: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(v)
  const amountPaidStr = fmt(amountPaid)
  const nextAmountStr = fmt(nextAmount)
  const validUntilStr = formatDate(validUntil)
  const paymentLabel = 'Stripe'

  const nextChargeSection =
    nextChargeDate && nextChargeDate > new Date()
      ? `
        <p style="color: #374151; line-height: 1.6;">
          <strong>Next payment:</strong> ${nextAmountStr} on <strong>${formatDate(nextChargeDate)}</strong> (via ${paymentLabel}). Your membership will renew for another year from that date.
        </p>
      `
      : `
        <p style="color: #374151; line-height: 1.6;">
          Your next payment will be in one year when your membership is due for renewal (via ${paymentLabel}).
        </p>
      `

  return sendEmail({
    to: email,
    subject: 'Your TIPA subscription confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; margin-bottom: 20px;">Subscription confirmed</h1>
        <p style="color: #374151; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #374151; line-height: 1.6;">
          Thank you for subscribing. Your payment has been received and your membership is active.
        </p>
        <div style="background-color: #f0f9ff; border-left: 4px solid #0d1e26; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #374151; line-height: 1.6; margin: 0 0 8px 0;">
            <strong>Amount paid:</strong> ${amountPaidStr}
          </p>
          <p style="color: #374151; line-height: 1.6; margin: 0 0 8px 0;">
            <strong>Membership valid until:</strong> ${validUntilStr}
          </p>
          ${nextChargeSection}
        </div>
        <p style="color: #374151; line-height: 1.6;">
          You can manage your subscription and view your membership details anytime from your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tipa.ca'}/membership" style="color: #0d1e26;">membership page</a>.
        </p>
        <p style="margin-top: 20px; color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>The TIPA Team</strong>
        </p>
      </div>
    `,
  })
}

/**
 * @deprecated Use sendSubscriptionConfirmationEmail with charge/validity details instead.
 */
export async function sendMembershipUpgradeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: 'Membership Upgrade Confirmation',
    html: `
      <h1>Membership Upgraded!</h1>
      <p>Hi ${name},</p>
      <p>Your membership has been successfully upgraded to paid membership.</p>
      <p>Thank you for your support!</p>
    `,
  })
}

export async function sendInvitationEmail(
  email: string,
  name: string,
  landingPageUrl: string
) {
  return sendEmail({
    to: email,
    subject: 'Invitation to Join Toronto Island Pilots Association',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; margin-bottom: 20px;">You're Invited to Join TIPA!</h1>
        <p style="color: #374151; line-height: 1.6;">
          Hi ${name},
        </p>
        <p style="color: #374151; line-height: 1.6;">
          You've been invited to join the Toronto Island Pilots Association (TIPA). We're excited to have you as part of our community!
        </p>
        <p style="color: #374151; line-height: 1.6;">
          As a member, you'll have access to:
        </p>
        <ul style="color: #374151; line-height: 1.8; margin-left: 20px;">
          <li>Member resources and exclusive content</li>
          <li>Community events and networking opportunities</li>
          <li>Advocacy efforts for GA at CYTZ</li>
          <li>Connection with other GA pilots in Toronto</li>
        </ul>
        <p style="margin: 30px 0;">
          <strong>To learn more and join our community, please visit our website:</strong>
        </p>
        <p style="margin: 20px 0;">
          <a href="${landingPageUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Visit TIPA Website
          </a>
        </p>
        <p style="margin: 20px 0; color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <span style="word-break: break-all; color: #2563eb;">${landingPageUrl}</span>
        </p>
        <p style="margin-top: 30px; color: #374151; line-height: 1.6;">
          We look forward to seeing you at our events and working together to support general aviation at Billy Bishop Toronto City Airport.
        </p>
        <p style="margin-top: 20px; color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>The TIPA Team</strong>
        </p>
      </div>
    `,
  })
}

export async function sendInvitationWithPasswordEmail(
  email: string,
  name: string,
  tempPassword: string,
  appUrl: string
) {
  const loginUrl = `${appUrl}/login`
  
  return sendEmail({
    to: email,
    subject: 'Your TIPA Account Has Been Created',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; margin-bottom: 20px;">Welcome to TIPA, ${name}!</h1>
        <p style="color: #374151; line-height: 1.6;">
          Your account has been created for the Toronto Island Pilots Association. We're excited to have you as part of our community!
        </p>
        <div style="background-color: #f0f9ff; border-left: 4px solid #0d1e26; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #374151; line-height: 1.6; margin: 0 0 12px 0;">
            <strong>Your temporary password:</strong>
          </p>
          <div style="background-color: #ffffff; border: 2px solid #0d1e26; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 18px; font-weight: bold; text-align: center; letter-spacing: 2px; color: #0d1e26;">
            ${tempPassword}
          </div>
          <p style="color: #374151; line-height: 1.6; margin: 12px 0 0 0; font-size: 14px;">
            ⚠️ Please change this password after your first login for security.
          </p>
        </div>
        <p style="color: #374151; line-height: 1.6;">
          You can log in using:
        </p>
        <ul style="color: #374151; line-height: 1.8; margin-left: 20px;">
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> The temporary password shown above</li>
          <li><strong>Or:</strong> Sign in with Google (if your email matches)</li>
        </ul>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${loginUrl}" 
             style="display: inline-block; background-color: #0d1e26; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Log In to Your Account
          </a>
        </div>
        <p style="color: #374151; line-height: 1.6;">
          As a member, you'll have access to:
        </p>
        <ul style="color: #374151; line-height: 1.8; margin-left: 20px;">
          <li>Member resources and exclusive content</li>
          <li>Community events and networking opportunities</li>
          <li>Advocacy efforts for GA at CYTZ</li>
          <li>Connection with other GA pilots in Toronto</li>
        </ul>
        <p style="margin-top: 30px; color: #374151; line-height: 1.6;">
          We look forward to seeing you at our events and working together to support general aviation at Billy Bishop Toronto City Airport.
        </p>
        <p style="margin-top: 20px; color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>The TIPA Team</strong>
        </p>
      </div>
    `,
  })
}

export async function sendNewMemberNotificationToAdmins(
  memberEmail: string,
  memberName: string | null,
  memberDetails: {
    call_sign?: string | null
    aircraft_type?: string | null
    pilot_license_type?: string | null
    phone?: string | null
    membership_level?: string | null
    membership_class?: string | null
    street?: string | null
    city?: string | null
    province_state?: string | null
    postal_zip_code?: string | null
    country?: string | null
    how_often_fly_from_ytz?: string | null
    is_copa_member?: string | null
    join_copa_flight_32?: string | null
    copa_membership_number?: string | null
    statement_of_interest?: string | null
    how_did_you_hear?: string | null
    is_student_pilot?: boolean | null
    flight_school?: string | null
    instructor_name?: string | null
  },
  adminEmail: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const adminUrl = `${appUrl}/admin`

  // Helper to format membership level/class
  const formatMembershipClass = (level: string | null | undefined, klass: string | null | undefined) => {
    if (level) {
      const levelMap: Record<string, string> = {
        'Full': 'Full Member',
        'Student': 'Student Member',
        'Associate': 'Associate Member',
        'Corporate': 'Corporate Member',
        'Honorary': 'Honorary Member'
      }
      return levelMap[level] || level
    }
    if (klass) {
      const classMap: Record<string, string> = {
        'full': 'Full Member',
        'student-associate': 'Student / Associate Member',
        'corporate': 'Corporate Member'
      }
      return classMap[klass] || klass
    }
    return 'Not specified'
  }

  // Helper to format address
  const formatAddress = () => {
    const parts = []
    if (memberDetails.street) parts.push(memberDetails.street)
    if (memberDetails.city) parts.push(memberDetails.city)
    if (memberDetails.province_state) parts.push(memberDetails.province_state)
    if (memberDetails.postal_zip_code) parts.push(memberDetails.postal_zip_code)
    if (memberDetails.country) parts.push(memberDetails.country)
    return parts.length > 0 ? parts.join(', ') : null
  }

  const address = formatAddress()

  return sendEmail({
    to: adminEmail,
    subject: `New Member Pending Approval: ${memberName || memberEmail}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; margin-bottom: 20px;">New Member Pending Approval</h1>
        <p style="color: #374151; line-height: 1.6;">
          A new member has signed up and is waiting for approval:
        </p>
        
        <!-- Contact Information -->
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 600;">Contact Information</h2>
          <p style="margin: 6px 0; color: #374151;">
            <strong>Name:</strong> ${memberName || 'N/A'}<br>
            <strong>Email:</strong> <a href="mailto:${memberEmail}" style="color: #2563eb; text-decoration: underline;">${memberEmail}</a>
          </p>
          ${memberDetails.phone ? `<p style="margin: 6px 0; color: #374151;"><strong>Phone:</strong> ${memberDetails.phone}</p>` : ''}
          ${address ? `<p style="margin: 6px 0; color: #374151;"><strong>Address:</strong> ${address}</p>` : ''}
        </div>

        <!-- Membership Details -->
        <div style="background-color: #f0f9ff; border-left: 4px solid #0d1e26; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 600;">Membership Details</h2>
          <p style="margin: 6px 0; color: #374151;">
            <strong>Membership Class:</strong> ${formatMembershipClass(memberDetails.membership_level, memberDetails.membership_class)}
          </p>
          ${memberDetails.how_did_you_hear ? `<p style="margin: 6px 0; color: #374151;"><strong>How they heard about TIPA:</strong> ${memberDetails.how_did_you_hear}</p>` : ''}
        </div>

        <!-- Aviation Information -->
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 600;">Aviation Information</h2>
          ${memberDetails.pilot_license_type ? `<p style="margin: 6px 0; color: #374151;"><strong>Pilot License:</strong> ${memberDetails.pilot_license_type}</p>` : ''}
          ${memberDetails.aircraft_type ? `<p style="margin: 6px 0; color: #374151;"><strong>Aircraft Type:</strong> ${memberDetails.aircraft_type}</p>` : ''}
          ${memberDetails.call_sign ? `<p style="margin: 6px 0; color: #374151;"><strong>Call Sign:</strong> ${memberDetails.call_sign}</p>` : ''}
          ${memberDetails.how_often_fly_from_ytz ? `<p style="margin: 6px 0; color: #374151;"><strong>Flying Frequency from YTZ:</strong> ${memberDetails.how_often_fly_from_ytz}</p>` : ''}
          ${memberDetails.is_student_pilot ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #d1d5db;">
              <p style="margin: 6px 0; color: #374151;"><strong>Student Pilot:</strong> Yes</p>
              ${memberDetails.flight_school ? `<p style="margin: 6px 0; color: #374151;"><strong>Flight School:</strong> ${memberDetails.flight_school}</p>` : ''}
              ${memberDetails.instructor_name ? `<p style="margin: 6px 0; color: #374151;"><strong>Instructor Name:</strong> ${memberDetails.instructor_name}</p>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- COPA Membership -->
        ${memberDetails.is_copa_member ? `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 600;">COPA Membership</h2>
            <p style="margin: 6px 0; color: #374151;">
              <strong>COPA Member:</strong> ${memberDetails.is_copa_member === 'yes' ? 'Yes' : 'No'}
            </p>
            ${memberDetails.is_copa_member === 'yes' && memberDetails.join_copa_flight_32 ? `
              <p style="margin: 6px 0; color: #374151;">
                <strong>Join COPA Flight 32:</strong> ${memberDetails.join_copa_flight_32 === 'yes' ? 'Yes' : 'No'}
              </p>
            ` : ''}
            ${memberDetails.copa_membership_number ? `<p style="margin: 6px 0; color: #374151;"><strong>COPA Membership Number:</strong> ${memberDetails.copa_membership_number}</p>` : ''}
          </div>
        ` : ''}

        <!-- Statement of Interest -->
        ${memberDetails.statement_of_interest ? `
          <div style="background-color: #f9fafb; border-left: 4px solid #6b7280; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 600;">Statement of Interest</h2>
            <p style="margin: 0; color: #374151; line-height: 1.6; white-space: pre-wrap;">${memberDetails.statement_of_interest}</p>
          </div>
        ` : ''}

        <p style="margin: 20px 0;">
          <a href="${adminUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #0d1e26; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Review Member
          </a>
        </p>
        <p style="margin-top: 20px; color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>TIPA System</strong>
        </p>
      </div>
    `,
  })
}

export async function sendMemberApprovalEmail(email: string, name: string | null) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const dashboardUrl = `${appUrl}/dashboard`

  return sendEmail({
    to: email,
    subject: 'Your TIPA Membership Has Been Approved!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; margin-bottom: 20px;">Welcome to TIPA, ${name || 'Member'}!</h1>
        <p style="color: #374151; line-height: 1.6;">
          Great news! Your membership application has been approved. You now have full access to the Toronto Island Pilots Association platform.
        </p>
        <p style="color: #374151; line-height: 1.6;">
          As an approved member, you can now:
        </p>
        <ul style="color: #374151; line-height: 1.8; margin-left: 20px;">
          <li>Access member resources and exclusive content</li>
          <li>Browse and post in Hangar Talk</li>
          <li>View and RSVP to events</li>
          <li>Connect with other GA pilots in Toronto</li>
          <li>Stay informed on advocacy efforts for GA at CYTZ</li>
        </ul>
        <p style="margin: 30px 0;">
          <a href="${dashboardUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #0d1e26; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Access Your Dashboard
          </a>
        </p>
        <p style="margin-top: 30px; color: #374151; line-height: 1.6;">
          We look forward to seeing you at our events and working together to support general aviation at Billy Bishop Toronto City Airport.
        </p>
        <p style="margin-top: 20px; color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>The TIPA Team</strong>
        </p>
      </div>
    `,
  })
}

export async function sendEventNotificationEmail(
  email: string,
  name: string,
  event: {
    title: string
    description?: string | null
    location?: string | null
    start_time: string
    end_time?: string | null
  }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const eventUrl = `${appUrl}/events`
  
  const icalContent = generateICal({
    title: event.title,
    description: event.description,
    location: event.location,
    startTime: event.start_time,
    endTime: event.end_time,
    url: eventUrl,
  })

  const startDate = new Date(event.start_time)
  const endDate = event.end_time ? new Date(event.end_time) : null
  const dateFormat = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return sendEmail({
    to: email,
    subject: `New TIPA Event: ${event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; margin-bottom: 20px;">New TIPA Event</h1>
        <p style="color: #374151; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #374151; line-height: 1.6;">
          A new event has been scheduled for the Toronto Island Pilots Association:
        </p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #1f2937; margin-top: 0;">${event.title}</h2>
          <p style="color: #374151; margin: 10px 0;">
            <strong>Date & Time:</strong><br>
            ${dateFormat.format(startDate)}${endDate ? ` - ${dateFormat.format(endDate)}` : ''}
          </p>
          ${event.location ? `
            <p style="color: #374151; margin: 10px 0;">
              <strong>Location:</strong><br>
              ${event.location}
            </p>
          ` : ''}
          ${event.description ? `
            <p style="color: #374151; margin: 10px 0;">
              <strong>Description:</strong><br>
              ${event.description.replace(/\n/g, '<br>')}
            </p>
          ` : ''}
        </div>
        <p style="color: #374151; line-height: 1.6; margin-top: 20px;">
          An iCal file is attached to this email. You can add this event to your calendar by:
        </p>
        <ul style="color: #374151; line-height: 1.8; margin-left: 20px;">
          <li><strong>Google Calendar:</strong> Open the attached .ics file</li>
          <li><strong>Apple Calendar:</strong> Double-click the attached .ics file</li>
          <li><strong>Outlook:</strong> Import the attached .ics file</li>
        </ul>
        <p style="margin-top: 20px;">
          <a href="${eventUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View All Events
          </a>
        </p>
        <p style="margin-top: 20px; color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>The TIPA Team</strong>
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`,
        content: icalContent,
      },
    ],
  })
}

export async function sendReplyNotificationEmail(
  email: string,
  recipientName: string,
  threadTitle: string,
  threadId: string,
  commenterName: string,
  commentPreview: string,
  reason: 'thread_author' | 'participant'
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const threadUrl = `${appUrl}/discussions/${threadId}`
  const settingsUrl = `${appUrl}/settings`

  const reasonText = reason === 'thread_author'
    ? 'you started'
    : 'you commented on'

  const truncatedPreview = commentPreview.length > 200
    ? commentPreview.substring(0, 200).trim() + '...'
    : commentPreview

  return sendEmail({
    to: email,
    subject: `${commenterName} replied to "${threadTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="color: #374151; line-height: 1.6;">Hi ${recipientName},</p>
        <p style="color: #374151; line-height: 1.6;">
          <strong>${commenterName}</strong> replied to a discussion ${reasonText}:
        </p>
        <div style="background-color: #f9fafb; border-left: 4px solid #0d1e26; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 16px;">${threadTitle}</h3>
          <p style="color: #374151; line-height: 1.6; margin: 0; white-space: pre-wrap;">${truncatedPreview}</p>
        </div>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${threadUrl}" style="display: inline-block; background-color: #0d1e26; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Discussion
          </a>
        </div>
        <p style="margin-top: 30px; color: #9ca3af; font-size: 12px; line-height: 1.6;">
          You're receiving this because ${reasonText} this thread on Hangar Talk.
          <a href="${settingsUrl}" style="color: #6b7280;">Turn off reply notifications</a>
        </p>
      </div>
    `,
  })
}

export async function sendDiscussionDigestEmail(
  email: string,
  name: string,
  threads: Array<{
    id: string
    title: string
    content: string
    category: string
    created_at: string
    author?: {
      full_name: string | null
      email: string
    } | null
    comment_count?: number
  }>
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const discussionsUrl = `${appUrl}/discussions`
  
  const CATEGORY_LABELS: Record<string, string> = {
    aircraft_shares: 'Aircraft Shares / Block Time',
    instructor_availability: 'Instructor Availability',
    gear_for_sale: 'Gear for Sale',
    flying_at_ytz: 'Flying at YTZ',
    general_aviation: 'General Aviation',
    training_safety_proficiency: 'Training, Safety & Proficiency',
    wanted: 'Wanted',
    building_a_better_tipa: 'Building a Better TIPA',
    other: 'Other',
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const stripMarkdownAndHtml = (text: string) => {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim()
  }

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  const threadsHtml = threads.map(thread => {
    const authorName = thread.author?.full_name || thread.author?.email || 'Anonymous'
    const categoryLabel = CATEGORY_LABELS[thread.category] || thread.category
    const preview = truncateText(stripMarkdownAndHtml(thread.content))
    const threadUrl = `${discussionsUrl}/${thread.id}`
    const replyCount = thread.comment_count || 0
    const replyText = replyCount === 1 ? '1 reply' : `${replyCount} replies`
    
    return `
      <tr>
        <td style="padding: 0 0 16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
            <tr>
              <td style="padding: 16px 20px;">
                <a href="${threadUrl}" style="color: #0d1e26; text-decoration: none; font-size: 16px; font-weight: 600; line-height: 1.4;">${thread.title}</a>
                <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 8px 0 12px 0;">${preview}</p>
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-right: 12px;">
                      <span style="font-size: 11px; font-weight: 600; color: #0d1e26; background-color: rgba(13,30,38,0.08); padding: 3px 8px; border-radius: 4px;">${categoryLabel}</span>
                    </td>
                    <td style="font-size: 12px; color: #9ca3af; padding-right: 12px;">${authorName}</td>
                    <td style="font-size: 12px; color: #9ca3af; padding-right: 12px;">${formatDate(thread.created_at)}</td>
                    <td style="font-size: 12px; color: #6b7280; font-weight: 500;">${replyText}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
  }).join('')

  const firstName = name.split(' ')[0]

  return sendEmail({
    to: email,
    subject: `Hangar Talk This Week — ${threads.length} new ${threads.length === 1 ? 'discussion' : 'discussions'}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f3f4f6;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0d1e26;">
          <tr>
            <td style="padding: 24px 24px 20px 24px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">Hangar Talk</h1>
              <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0 0; font-size: 13px;">Your weekly TIPA community digest</p>
            </td>
          </tr>
        </table>

        <!-- Body -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 24px;">
              <p style="color: #374151; line-height: 1.6; font-size: 15px; margin: 0 0 20px 0;">
                Hi ${firstName}, here's what the community has been talking about:
              </p>

              <!-- Thread Cards -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${threadsHtml}
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${discussionsUrl}" style="display: inline-block; padding: 12px 28px; background-color: #0d1e26; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                      View All Discussions
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding-top: 16px;">
                    <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0;">
                      You're receiving this because you're a member of TIPA.<br>
                      <a href="${appUrl}/settings" style="color: #6b7280; text-decoration: underline;">Manage email preferences</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
  })
}
