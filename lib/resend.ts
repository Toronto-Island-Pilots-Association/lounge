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

  let ical = [
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
            <strong>Your email has been verified!</strong> You can log in to your account, but your access will be limited until an admin approves your membership.
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

export async function sendNewMemberNotificationToAdmins(
  memberEmail: string,
  memberName: string | null,
  memberDetails: {
    call_sign?: string | null
    aircraft_type?: string | null
    pilot_license_type?: string | null
    phone?: string | null
  },
  adminEmail: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const adminUrl = `${appUrl}/admin`

  return sendEmail({
    to: adminEmail,
    subject: `New Member Pending Approval: ${memberName || memberEmail}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; margin-bottom: 20px;">New Member Pending Approval</h1>
        <p style="color: #374151; line-height: 1.6;">
          A new member has signed up and is waiting for approval:
        </p>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 8px 0; color: #374151;">
            <strong>Name:</strong> ${memberName || 'N/A'}<br>
            <strong>Email:</strong> ${memberEmail}
          </p>
          ${memberDetails.call_sign ? `<p style="margin: 8px 0; color: #374151;"><strong>Call Sign:</strong> ${memberDetails.call_sign}</p>` : ''}
          ${memberDetails.aircraft_type ? `<p style="margin: 8px 0; color: #374151;"><strong>Aircraft Type:</strong> ${memberDetails.aircraft_type}</p>` : ''}
          ${memberDetails.pilot_license_type ? `<p style="margin: 8px 0; color: #374151;"><strong>Pilot License:</strong> ${memberDetails.pilot_license_type}</p>` : ''}
          ${memberDetails.phone ? `<p style="margin: 8px 0; color: #374151;"><strong>Phone:</strong> ${memberDetails.phone}</p>` : ''}
        </div>
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
          <li>Participate in community discussions</li>
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

