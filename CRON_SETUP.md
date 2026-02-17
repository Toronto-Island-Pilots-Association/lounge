# Cron Jobs Setup

This document explains how to set up the cron jobs for the TIPA platform.

## Overview

The platform has two cron jobs:

### 1. Discussion Digest
- Runs every 7 days (weekly)
- Fetches the last 7 discussion topics from the past 7 days
- Sends an email digest to all approved members
- Includes thread titles, previews, authors, and comment counts

### 2. Expire Members
- Runs daily at midnight UTC
- Finds all approved members whose `membership_expires_at` date has passed
- Automatically updates their status to 'expired'
- Excludes admins from automatic expiration

## Setup Options

### Option 1: Vercel Cron Jobs (Recommended if deployed on Vercel)

If you're deploying on Vercel, the cron jobs are already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/discussion-digest",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/expire-members",
      "schedule": "0 0 * * *"
    }
  ]
}
```

- Discussion digest runs every Monday at 9:00 AM UTC
- Expire members runs daily at midnight UTC (00:00)

**To activate:**
1. Deploy your application to Vercel
2. The cron job will automatically be registered
3. Vercel will call the endpoint with proper authentication headers

**Schedule format:** Cron expressions use 5 fields:
- Minute (0-59)
- Hour (0-23)
- Day of month (1-31)
- Month (1-12)
- Day of week (0-7, where 0 and 7 = Sunday)

Examples:
- `"0 9 * * 1"` - Every Monday at 9 AM UTC
- `"0 0 * * *"` - Every day at midnight UTC
- `"0 9 * * *"` - Every day at 9 AM UTC
- `"0 0 * * 0"` - Every Sunday at midnight UTC

To change the schedule, modify the cron expression in `vercel.json`.

### Option 2: External Cron Service

If you're not using Vercel or want more control, you can use an external cron service:

#### Using cron-job.org or similar:

1. Sign up for a free cron service (e.g., [cron-job.org](https://cron-job.org))
2. Create cron jobs for each endpoint:

   **Discussion Digest:**
   - **URL**: `https://your-domain.com/api/cron/discussion-digest`
   - **Schedule**: Every 7 days (e.g., `0 9 * * 1` for Mondays at 9 AM)
   - **Method**: GET
   - **Headers**: `Authorization: Bearer YOUR_CRON_SECRET`

   **Expire Members:**
   - **URL**: `https://your-domain.com/api/cron/expire-members`
   - **Schedule**: Daily (e.g., `0 0 * * *` for midnight UTC)
   - **Method**: GET
   - **Headers**: `Authorization: Bearer YOUR_CRON_SECRET`

3. Set the `CRON_SECRET` environment variable in your deployment:
   ```env
   CRON_SECRET=your-secret-token-here
   ```

#### Using GitHub Actions:

Create `.github/workflows/discussion-digest.yml`:

```yaml
name: Discussion Digest

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:  # Allow manual triggering

jobs:
  send-digest:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Digest
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/discussion-digest
```

## Environment Variables

Make sure these are set in your deployment:

```env
# Required
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional (for external cron services)
CRON_SECRET=your-secret-token-here
```

## Testing

You can manually test the endpoints:

```bash
# Discussion Digest
# If using CRON_SECRET
curl -X GET \
  -H "Authorization: Bearer your-secret-token" \
  https://your-domain.com/api/cron/discussion-digest

# If using Vercel Cron (no auth needed, Vercel handles it)
curl -X GET https://your-domain.com/api/cron/discussion-digest

# Expire Members
# If using CRON_SECRET
curl -X GET \
  -H "Authorization: Bearer your-secret-token" \
  https://your-domain.com/api/cron/expire-members

# If using Vercel Cron
curl -X GET https://your-domain.com/api/cron/expire-members
```

## Response Formats

### Discussion Digest Response:
```json
{
  "success": true,
  "message": "Digest sent to 50 members",
  "threadsSent": 7,
  "membersNotified": 50,
  "membersFailed": 0
}
```

### Expire Members Response:
```json
{
  "success": true,
  "message": "Successfully expired 3 member(s)",
  "membersExpired": 3,
  "membersChecked": 3,
  "expiredMembers": [
    {
      "id": "user-id-1",
      "email": "member@example.com",
      "name": "John Doe"
    }
  ]
}
```

## Troubleshooting

### Discussion Digest Issues:

1. **No emails sent**: Check that:
   - `RESEND_API_KEY` is set correctly
   - `RESEND_FROM_EMAIL` is verified in Resend
   - Members have approved status in the database

2. **No threads found**: The digest will still send but with a message indicating no discussions in the past 7 days

### Expire Members Issues:

1. **No members expired**: This is normal if no members have passed their expiration date
2. **Members not expiring**: Check that:
   - Members have `membership_expires_at` set (not null)
   - The expiration date is in the past
   - Members have `status = 'approved'` (not already expired/rejected/pending)
   - Members are not admins (admins are excluded from automatic expiration)

### General Issues:

1. **Unauthorized error**: 
   - If using external cron, ensure `CRON_SECRET` matches
   - If using Vercel, ensure the cron job is properly configured

2. **Check logs**: Monitor your deployment logs for any errors during execution
